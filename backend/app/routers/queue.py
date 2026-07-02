from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.capacity import effective_date as compute_effective_date
from app.core.constants import CLOSED_STATUSES
from app.core.scoring import priority_score, queue_rank
from app.deps.db import get_db
from app.deps.roles import get_current_profile
from app.schemas.requests import QueueRowOut

router = APIRouter(prefix="/queue", tags=["queue"])


@router.get("", response_model=list[QueueRowOut])
async def get_queue(
    db: AsyncSession = Depends(get_db),
    _profile: dict = Depends(get_current_profile),
):
    # RLS on `requests` already excludes other users' confidential rows for
    # non-admin/non-owner callers (0003_rls_policies.sql) — this query relies
    # on that, and the QueueRowOut DTO independently never serializes
    # title/briefing/attachments/comments regardless of row visibility.
    rows = (
        await db.execute(
            text(
                """select r.id, r.status, r.area, r.priority_requested, r.impact_type,
                          r.viability_status, r.real_use_date, r.adjusted_weight, r.default_weight,
                          r.approved_delivery_date, r.system_suggested_date, r.desired_delivery_date,
                          r.delivery_week_start, rt.name as request_type_name
                   from public.requests r
                   join public.request_types rt on rt.id = r.request_type_id
                   where r.status not in ('Entregue', 'Cancelado', 'Recusado')"""
            )
        )
    ).mappings().all()

    today = date.today()

    def rank_key(r):
        score = priority_score(
            r["priority_requested"], r["impact_type"], r["real_use_date"], today, r["viability_status"], r["status"]
        )
        return queue_rank(r["priority_requested"], r["status"], score, r["real_use_date"], today)

    ranked = sorted(rows, key=rank_key, reverse=True)

    out = []
    for i, r in enumerate(ranked, start=1):
        eff = compute_effective_date(r["approved_delivery_date"], r["system_suggested_date"], r["desired_delivery_date"])
        out.append(
            QueueRowOut(
                id=str(r["id"]),
                order=i,
                request_type_name=r["request_type_name"],
                area=r["area"],
                status=r["status"],
                delivery_week_start=r["delivery_week_start"],
                effective_date=eff,
            )
        )
    return out
