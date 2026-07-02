import calendar as pycalendar
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.capacity import cap_style_for, effective_date as compute_effective_date, occupied_for_week
from app.core.dates import week_start
from app.deps.db import get_db
from app.deps.roles import get_current_profile
from app.services.viability_service import get_capacity_configs, get_requests_for_window

router = APIRouter(prefix="/calendar", tags=["calendar"])


class CalendarItem(BaseModel):
    id: str
    code_or_type: str
    status: str
    weight: int
    responsavel: str | None
    effective_date: date


class CalendarWeek(BaseModel):
    week_start: date
    week_end: date
    capacity: int
    occupied: int
    available: int
    pct: int
    tag: str
    items: list[CalendarItem]


@router.get("", response_model=list[CalendarWeek])
async def get_calendar(
    month: str = Query(..., description="YYYY-MM"),
    db: AsyncSession = Depends(get_db),
    profile: dict = Depends(get_current_profile),
):
    try:
        year, mon = (int(x) for x in month.split("-"))
    except ValueError:
        raise HTTPException(status_code=422, detail="month deve ser no formato YYYY-MM")

    first_day = date(year, mon, 1)
    last_day = date(year, mon, pycalendar.monthrange(year, mon)[1])
    range_start = week_start(first_day)
    range_end = week_start(last_day) + timedelta(days=4)

    configs = await get_capacity_configs(db, range_start, range_end)
    requests = await get_requests_for_window(db, range_start, range_end, None)

    is_admin_or_gestor = profile["role"] in ("admin", "gestor")
    rows = (
        await db.execute(
            text(
                """select r.id, r.code, r.status, r.responsavel, r.adjusted_weight, r.default_weight,
                          r.approved_delivery_date, r.system_suggested_date, r.desired_delivery_date,
                          r.confidential, r.requester_id, rt.name as type_name
                   from public.requests r
                   join public.request_types rt on rt.id = r.request_type_id
                   where coalesce(r.approved_delivery_date, r.system_suggested_date, r.desired_delivery_date)
                         between :start and :end"""
            ),
            {"start": range_start, "end": range_end},
        )
    ).mappings().all()

    weeks: list[CalendarWeek] = []
    cursor = range_start
    while cursor <= range_end:
        cap = configs.get(cursor)
        cap_points = 0 if (cap and cap.blocked) else (cap.points if cap else 20)
        occ = occupied_for_week(requests, cursor)
        pct = round(occ / cap_points * 100) if cap_points > 0 else 0

        items = []
        for r in rows:
            eff = compute_effective_date(r["approved_delivery_date"], r["system_suggested_date"], r["desired_delivery_date"])
            if eff and week_start(eff) == cursor:
                label = r["code"] if (is_admin_or_gestor or not r["confidential"]) else "Demanda confidencial"
                items.append(
                    CalendarItem(
                        id=str(r["id"]),
                        code_or_type=f"{label} · {r['type_name']}",
                        status=r["status"],
                        weight=r["adjusted_weight"] or r["default_weight"],
                        responsavel=r["responsavel"],
                        effective_date=eff,
                    )
                )

        weeks.append(
            CalendarWeek(
                week_start=cursor,
                week_end=cursor + timedelta(days=4),
                capacity=cap_points,
                occupied=occ,
                available=max(0, cap_points - occ),
                pct=pct,
                tag=cap_style_for(pct)["tag"],
                items=items,
            )
        )
        cursor += timedelta(weeks=1)

    return weeks
