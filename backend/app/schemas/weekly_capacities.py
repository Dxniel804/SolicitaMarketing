from datetime import date

from pydantic import BaseModel


class WeeklyCapacityOut(BaseModel):
    week_start: date
    week_end: date
    capacity_points: int
    is_blocked: bool
    notes: str | None = None
    occupied: int | None = None
    available: int | None = None
    pct: int | None = None
    tag: str | None = None


class WeeklyCapacityUpsert(BaseModel):
    capacity_points: int
    is_blocked: bool = False
    notes: str | None = None
