from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.capacity import cap_style_for
from app.db_utils import row_dict
from app.deps.db import get_db
from app.deps.roles import require_role
from app.schemas.weekly_capacities import WeeklyCapacityOut, WeeklyCapacityUpsert
from app.services.viability_service import get_capacity_configs, get_requests_for_window

router = APIRouter(prefix="/weekly-capacities", tags=["weekly-capacities"])


@router.get("", response_model=list[WeeklyCapacityOut])
async def list_weekly_capacities(
    date_from: date = Query(..., alias="from"),
    date_to: date = Query(..., alias="to"),
    db: AsyncSession = Depends(get_db),
):
    rows = (
        await db.execute(
            text(
                """select week_start, week_end, capacity_points, is_blocked, notes
                   from public.weekly_capacities where week_start >= :f and week_start <= :t
                   order by week_start"""
            ),
            {"f": date_from, "t": date_to},
        )
    ).mappings().all()

    configs = await get_capacity_configs(db, date_from, date_to)
    requests = await get_requests_for_window(db, date_from, date_to + timedelta(days=7), None)

    from app.core.capacity import occupied_for_week

    out = []
    for r in rows:
        occ = occupied_for_week(requests, r["week_start"])
        cap = r["capacity_points"] if not r["is_blocked"] else 0
        pct = round(occ / cap * 100) if cap > 0 else 0
        out.append(
            WeeklyCapacityOut(
                week_start=r["week_start"],
                week_end=r["week_end"],
                capacity_points=r["capacity_points"],
                is_blocked=r["is_blocked"],
                notes=r["notes"],
                occupied=occ,
                available=max(0, cap - occ),
                pct=pct,
                tag=cap_style_for(pct)["tag"],
            )
        )
    return out


@router.put("/{week_start}", response_model=WeeklyCapacityOut)
async def upsert_weekly_capacity(
    week_start: date,
    body: WeeklyCapacityUpsert,
    db: AsyncSession = Depends(get_db),
    _profile: dict = Depends(require_role("admin")),
):
    week_end = week_start + timedelta(days=4)
    row = (
        await db.execute(
            text(
                """insert into public.weekly_capacities (week_start, week_end, capacity_points, is_blocked, notes)
                   values (:week_start, :week_end, :capacity_points, :is_blocked, :notes)
                   on conflict (week_start) do update set
                     capacity_points = excluded.capacity_points,
                     is_blocked = excluded.is_blocked,
                     notes = excluded.notes,
                     updated_at = now()
                   returning week_start, week_end, capacity_points, is_blocked, notes"""
            ),
            {
                "week_start": week_start,
                "week_end": week_end,
                "capacity_points": body.capacity_points,
                "is_blocked": body.is_blocked,
                "notes": body.notes,
            },
        )
    ).mappings().first()
    return WeeklyCapacityOut(**row_dict(row))
