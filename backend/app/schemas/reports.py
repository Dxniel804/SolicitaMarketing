from datetime import datetime

from pydantic import BaseModel


class ReportsSummaryOut(BaseModel):
    total_by_month: dict[str, int]
    total_by_area: dict[str, int]
    total_by_type: dict[str, int]
    total_by_priority: dict[str, int]
    delivered_on_time: int
    delivered_late: int
    returned_for_briefing_count: int
    avg_triage_days: float | None
    avg_production_days: float | None


class DashboardOut(BaseModel):
    open_count: int
    in_production_count: int
    awaiting_briefing_count: int
    awaiting_approval_count: int
    delivered_this_month_count: int
    delayed_count: int
    current_week_capacity: int
    current_week_occupied: int
    current_week_available: int
    current_week_pct: int
    by_status: dict[str, int]
    open_delta_pct: float | None
    awaiting_approval_delta_pct: float | None
    delivered_delta_pct: float | None


class ActivityItemOut(BaseModel):
    request_code: str
    request_title: str
    new_status: str
    created_at: datetime
