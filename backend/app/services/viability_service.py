"""DB-backed wrapper around app.core.viability — reads current request types,
weekly capacities, holidays and in-flight requests, then delegates to the pure
`compute_viability` function. This is the ONLY place that bridges the DB and
the pure business-logic layer for viability/capacity calculations, so the
core module stays trivially unit-testable.
"""

from datetime import date, timedelta

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.capacity import WeekCapacityConfig
from app.core.dates import week_start
from app.core.viability import RequestTypeInfo, ViabilityResult, compute_viability
from app.db_utils import row_dicts

SEARCH_WINDOW_WEEKS = 60


async def get_request_type(db: AsyncSession, type_id: str | None) -> RequestTypeInfo | None:
    if not type_id:
        return None
    row = (
        await db.execute(
            text(
                """select id, default_weight, default_min_business_days, requires_attachment
                   from public.request_types where id = :id"""
            ),
            {"id": type_id},
        )
    ).mappings().first()
    if not row:
        return None
    return RequestTypeInfo(
        id=str(row["id"]),
        weight=row["default_weight"],
        min_days=row["default_min_business_days"],
        requires_attachment=row["requires_attachment"],
    )


async def get_capacity_configs(db: AsyncSession, start: date, end: date) -> dict[date, WeekCapacityConfig]:
    rows = (
        await db.execute(
            text(
                """select week_start, capacity_points, is_blocked
                   from public.weekly_capacities
                   where week_start >= :start and week_start <= :end"""
            ),
            {"start": start, "end": end},
        )
    ).mappings().all()
    return {r["week_start"]: WeekCapacityConfig(points=r["capacity_points"], blocked=r["is_blocked"]) for r in rows}


async def get_holidays(db: AsyncSession, start: date, end: date) -> set[date]:
    rows = (
        await db.execute(
            text("select date from public.holidays where date >= :start and date <= :end"),
            {"start": start, "end": end},
        )
    ).scalars().all()
    return set(rows)


async def get_requests_for_window(db: AsyncSession, start: date, end: date, exclude_id: str | None) -> list[dict]:
    rows = (
        await db.execute(
            text(
                """select id, status, reserve_capacity, adjusted_weight, default_weight,
                          approved_delivery_date, system_suggested_date, desired_delivery_date
                   from public.requests
                   where coalesce(approved_delivery_date, system_suggested_date, desired_delivery_date)
                         between :start and :end
                     and (:exclude_id ::uuid is null or id != :exclude_id ::uuid)"""
            ),
            {"start": start, "end": end, "exclude_id": exclude_id},
        )
    ).mappings().all()
    return row_dicts(rows)


async def compute_viability_for_draft(
    db: AsyncSession,
    draft: dict,
    today: date,
    exclude_id: str | None = None,
) -> ViabilityResult:
    request_type = await get_request_type(db, draft.get("tipoId") or draft.get("request_type_id"))

    desired = draft.get("dataDesejada") or draft.get("desired_delivery_date")
    min_days = request_type.min_days if request_type else 0
    # Search window covers today through ~60 weeks past whichever is later of
    # today or the desired date, matching next_available_week's own bound.
    window_start = week_start(today)
    anchor = desired or today
    window_end = week_start(anchor) + timedelta(weeks=SEARCH_WINDOW_WEEKS + 1)

    configs = await get_capacity_configs(db, window_start, window_end)
    holidays = await get_holidays(db, today, window_end)
    requests = await get_requests_for_window(db, window_start, window_end, exclude_id)

    return compute_viability(draft, request_type, today, configs, requests, exclude_id, holidays)
