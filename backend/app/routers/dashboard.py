from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dates import week_start
from app.deps.db import get_db
from app.deps.roles import require_role
from app.schemas.reports import ActivityItemOut, DashboardOut
from app.services.viability_service import get_capacity_configs, get_requests_for_window
from app.core.capacity import occupied_for_week

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _pct_change(this_month: int, last_month: int) -> float | None:
    if last_month == 0:
        return None
    return round((this_month - last_month) / last_month * 100)


async def _month_over_month(
    db: AsyncSession, table: str, extra_where: str, this_start: date, last_start: date
) -> tuple[int, int]:
    where = f"{extra_where} and created_at >= :last_start" if extra_where else "created_at >= :last_start"
    row = (
        await db.execute(
            text(
                f"""select
                      count(*) filter (where created_at >= :this_start) as this_month,
                      count(*) filter (where created_at >= :last_start and created_at < :this_start) as last_month
                    from public.{table}
                    where {where}"""
            ),
            {"this_start": this_start, "last_start": last_start},
        )
    ).mappings().first()
    return row["this_month"], row["last_month"]


@router.get("", response_model=DashboardOut)
async def get_dashboard(
    db: AsyncSession = Depends(get_db),
    _profile: dict = Depends(require_role("admin", "gestor")),
):
    counts = dict(
        (
            await db.execute(
                text(
                    """select status, count(*) from public.requests
                       where status not in ('Entregue','Cancelado','Recusado')
                       group by status"""
                )
            )
        ).all()
    )
    open_count = sum(counts.values())
    in_production = counts.get("Em produção", 0) + counts.get("Em revisão", 0) + counts.get("Ajustes solicitados", 0)
    awaiting_briefing = counts.get("Aguardando briefing", 0)
    awaiting_approval = counts.get("Aguardando aprovação de prazo", 0)

    delayed_count = (
        await db.execute(
            text(
                """select count(*) from public.requests
                   where status not in ('Entregue','Cancelado','Recusado')
                     and coalesce(approved_delivery_date, system_suggested_date, desired_delivery_date) < current_date"""
            )
        )
    ).scalar_one()

    today = date.today()
    this_month_start = today.replace(day=1)
    last_month_end = this_month_start - timedelta(days=1)
    last_month_start = last_month_end.replace(day=1)

    opened_this, opened_last = await _month_over_month(db, "requests", "", this_month_start, last_month_start)
    approval_this, approval_last = await _month_over_month(
        db, "status_history", "new_status = 'Aguardando aprovação de prazo'", this_month_start, last_month_start
    )
    delivered_this, delivered_last = await _month_over_month(
        db, "status_history", "new_status = 'Entregue'", this_month_start, last_month_start
    )

    wk = week_start(today)
    configs = await get_capacity_configs(db, wk, wk)
    requests = await get_requests_for_window(db, wk, wk, None)
    cap = configs.get(wk)
    cap_points = 0 if (cap and cap.blocked) else (cap.points if cap else 20)
    occ = occupied_for_week(requests, wk)
    pct = round(occ / cap_points * 100) if cap_points > 0 else 0

    return DashboardOut(
        open_count=open_count,
        in_production_count=in_production,
        awaiting_briefing_count=awaiting_briefing,
        awaiting_approval_count=awaiting_approval,
        delivered_this_month_count=delivered_this,
        delayed_count=delayed_count,
        current_week_capacity=cap_points,
        current_week_occupied=occ,
        current_week_available=max(0, cap_points - occ),
        current_week_pct=pct,
        by_status=counts,
        open_delta_pct=_pct_change(opened_this, opened_last),
        awaiting_approval_delta_pct=_pct_change(approval_this, approval_last),
        delivered_delta_pct=_pct_change(delivered_this, delivered_last),
    )


@router.get("/activity", response_model=list[ActivityItemOut])
async def get_recent_activity(
    limit: int = 8,
    db: AsyncSession = Depends(get_db),
    _profile: dict = Depends(require_role("admin", "gestor")),
):
    rows = (
        await db.execute(
            text(
                """select r.code as request_code, r.title as request_title,
                          sh.new_status, sh.created_at
                   from public.status_history sh
                   join public.requests r on r.id = sh.request_id
                   order by sh.created_at desc
                   limit :limit"""
            ),
            {"limit": limit},
        )
    ).mappings().all()
    return [ActivityItemOut(**dict(r)) for r in rows]
