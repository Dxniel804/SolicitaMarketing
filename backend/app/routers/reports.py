from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps.db import get_db
from app.deps.roles import require_role
from app.schemas.reports import ReportsSummaryOut

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/summary", response_model=ReportsSummaryOut)
async def reports_summary(
    date_from: date = Query(..., alias="from"),
    date_to: date = Query(..., alias="to"),
    db: AsyncSession = Depends(get_db),
    _profile: dict = Depends(require_role("admin", "gestor")),
):
    params = {"f": date_from, "t": date_to}

    by_month = (
        await db.execute(
            text(
                """select to_char(created_at, 'YYYY-MM') as ym, count(*)
                   from public.requests where created_at::date between :f and :t
                   group by ym order by ym"""
            ),
            params,
        )
    ).all()

    by_area = (
        await db.execute(
            text(
                """select area, count(*) from public.requests
                   where created_at::date between :f and :t group by area"""
            ),
            params,
        )
    ).all()

    by_type = (
        await db.execute(
            text(
                """select rt.name, count(*) from public.requests r
                   join public.request_types rt on rt.id = r.request_type_id
                   where r.created_at::date between :f and :t group by rt.name"""
            ),
            params,
        )
    ).all()

    by_priority = (
        await db.execute(
            text(
                """select priority_requested, count(*) from public.requests
                   where created_at::date between :f and :t group by priority_requested"""
            ),
            params,
        )
    ).all()

    on_time = (
        await db.execute(
            text(
                """select count(*) from public.requests
                   where status = 'Entregue' and delivered_at::date <= approved_delivery_date
                     and created_at::date between :f and :t"""
            ),
            params,
        )
    ).scalar_one()

    late = (
        await db.execute(
            text(
                """select count(*) from public.requests
                   where status = 'Entregue' and delivered_at::date > approved_delivery_date
                     and created_at::date between :f and :t"""
            ),
            params,
        )
    ).scalar_one()

    returned = (
        await db.execute(
            text(
                """select count(*) from public.status_history
                   where new_status = 'Aguardando briefing' and created_at::date between :f and :t"""
            ),
            params,
        )
    ).scalar_one()

    avg_triage = (
        await db.execute(
            text(
                """select avg(extract(epoch from (sh.created_at - r.created_at)) / 86400.0)
                   from public.status_history sh
                   join public.requests r on r.id = sh.request_id
                   where sh.new_status = 'Aprovado para produção'
                     and sh.created_at::date between :f and :t"""
            ),
            params,
        )
    ).scalar_one()

    avg_production = (
        await db.execute(
            text(
                """with approved as (
                     select request_id, min(created_at) as approved_at
                     from public.status_history where new_status = 'Aprovado para produção'
                     group by request_id
                   ), delivered as (
                     select request_id, min(created_at) as delivered_at
                     from public.status_history where new_status = 'Entregue'
                     group by request_id
                   )
                   select avg(extract(epoch from (d.delivered_at - a.approved_at)) / 86400.0)
                   from approved a join delivered d on d.request_id = a.request_id
                   where d.delivered_at::date between :f and :t"""
            ),
            params,
        )
    ).scalar_one()

    return ReportsSummaryOut(
        total_by_month=dict(by_month),
        total_by_area=dict(by_area),
        total_by_type=dict(by_type),
        total_by_priority=dict(by_priority),
        delivered_on_time=on_time,
        delivered_late=late,
        returned_for_briefing_count=returned,
        avg_triage_days=round(avg_triage, 2) if avg_triage is not None else None,
        avg_production_days=round(avg_production, 2) if avg_production is not None else None,
    )
