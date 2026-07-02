"""Pure date/business-day helpers.

Ported 1:1 from CentraldeSolicitações.dc.html lines 788-802 (pad/toISO/parseISO/
fmtBR/today/isWeekend/isHoliday/isBiz/addBiz/weekStart/weekEnd/weekKey/addWeeks).
No I/O, no DB — takes/returns plain `date` objects and sets of holiday dates.
"""

from datetime import date, timedelta


def is_weekend(d: date) -> bool:
    return d.weekday() >= 5  # Monday=0 ... Sunday=6; Saturday=5, Sunday=6


def is_business_day(d: date, holidays: set[date]) -> bool:
    return not is_weekend(d) and d not in holidays


def add_business_days(start: date, n: int, holidays: set[date]) -> date:
    """Advance from `start` by `n` business days, skipping weekends/holidays."""
    d = start
    count = 0
    guard = 0
    while count < n and guard < 2000:
        d += timedelta(days=1)
        guard += 1
        if is_business_day(d, holidays):
            count += 1
    return d


def week_start(d: date) -> date:
    """Monday of the week containing d."""
    return d - timedelta(days=d.weekday())


def week_end(monday: date) -> date:
    """Friday of the week starting at `monday`."""
    return monday + timedelta(days=4)


def week_key(d: date) -> date:
    return week_start(d)


def add_weeks(d: date, n: int) -> date:
    return d + timedelta(weeks=n)
