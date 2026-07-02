"""Capacity/occupancy logic.

Ported 1:1 from CentraldeSolicitações.dc.html lines 804-847
(capForWeek/effectiveDate/consumes/occupiedForWeek/capStyleFor/nextAvailableWeek).
"""

from dataclasses import dataclass
from datetime import date, timedelta

from .constants import CLOSED_STATUSES, CONSUMING_STATUSES, DEFAULT_CAPACITY_POINTS
from .dates import is_business_day, week_end, week_start


@dataclass
class WeekCapacityConfig:
    points: int
    blocked: bool
    notes: str | None = None


def consumes(status: str, reserve_capacity: bool) -> bool:
    if status in CLOSED_STATUSES:
        return False
    if status in CONSUMING_STATUSES:
        return True
    return bool(reserve_capacity)


def effective_date(
    approved: date | None, suggested: date | None, desired: date | None
) -> date | None:
    return approved or suggested or desired


def cap_for_week(configs: dict[date, WeekCapacityConfig], key: date) -> int:
    cfg = configs.get(key)
    if cfg:
        return 0 if cfg.blocked else cfg.points
    return DEFAULT_CAPACITY_POINTS


def occupied_for_week(requests: list[dict], key: date, exclude_id: str | None = None) -> int:
    """`requests` is a list of dicts with keys: id, status, reserve_capacity,
    approved_delivery_date, system_suggested_date, desired_delivery_date,
    adjusted_weight, default_weight — already scoped to (or near) week `key`
    by the caller's SQL query."""
    total = 0
    for r in requests:
        if exclude_id and r["id"] == exclude_id:
            continue
        if not consumes(r["status"], r.get("reserve_capacity", False)):
            continue
        ed = effective_date(
            r.get("approved_delivery_date"),
            r.get("system_suggested_date"),
            r.get("desired_delivery_date"),
        )
        if ed and week_start(ed) == key:
            total += r.get("adjusted_weight") or r.get("default_weight") or 0
    return total


def cap_style_for(pct: float) -> dict:
    """Mirrors capStyleFor (line 823-828): visual capacity tier."""
    if pct > 100:
        return {"tag": "sobrecarga"}
    if pct >= 90:
        return {"tag": "semana cheia"}
    if pct >= 70:
        return {"tag": "atenção"}
    return {"tag": "saudável"}


@dataclass
class NextAvailableResult:
    week_key: date
    monday: date
    date: date


def next_available_week(
    weight: int,
    min_date: date,
    configs: dict[date, WeekCapacityConfig],
    requests: list[dict],
    exclude_id: str | None = None,
    holidays: set[date] | None = None,
    max_weeks: int = 60,
) -> NextAvailableResult:
    """`requests` is the set of requests potentially relevant across the search
    window (the service layer scopes this with a SQL query covering roughly
    `[min_date, min_date + max_weeks weeks]`, see viability_service.py)."""
    holidays = holidays or set()
    mon = week_start(min_date)
    for _ in range(max_weeks):
        key = mon
        cap = cap_for_week(configs, key)
        occ = occupied_for_week(requests, key, exclude_id)
        if cap - occ >= weight and cap > 0:
            sug = week_end(mon)  # Friday
            if min_date > sug:
                sug = min_date
            # Deliberate 1:1 port of the prototype's second, partially-redundant
            # check (lines 838-839) — not simplified, kept faithful to source.
            if min_date > mon and min_date <= sug:
                sug = min_date
            guard = 0
            while not is_business_day(sug, holidays) and guard < 10:
                sug += timedelta(days=1)
                guard += 1
            return NextAvailableResult(week_key=key, monday=mon, date=sug)
        mon = mon + timedelta(weeks=1)
    return NextAvailableResult(week_key=week_start(min_date), monday=week_start(min_date), date=min_date)
