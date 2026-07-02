from datetime import date

from app.core.dates import add_business_days, week_end, week_start


def test_week_start_is_monday():
    # 2026-07-01 is a Wednesday
    assert week_start(date(2026, 7, 1)) == date(2026, 6, 29)


def test_week_end_is_friday():
    monday = date(2026, 6, 29)
    assert week_end(monday) == date(2026, 7, 3)


def test_add_business_days_skips_weekend():
    # Monday + 5 business days = following Monday
    start = date(2026, 6, 29)  # Monday
    assert add_business_days(start, 5, set()) == date(2026, 7, 6)


def test_add_business_days_skips_holiday():
    start = date(2026, 6, 29)  # Monday
    holidays = {date(2026, 6, 30)}  # Tuesday is a holiday
    # Skip Tue (holiday); Wed=1, Thu=2, Fri=3
    assert add_business_days(start, 3, holidays) == date(2026, 7, 3)


def test_spec_example_folder_from_monday():
    # spec.txt: "Hoje é segunda-feira. Proposta personalizada tem prazo mínimo
    # de 7 dias úteis. A menor data sugerida deve ser a próxima quarta-feira
    # da semana seguinte."
    today = date(2026, 6, 29)  # Monday
    result = add_business_days(today, 7, set())
    assert result == date(2026, 7, 8)  # Wednesday of the following week
    assert result.weekday() == 2  # Wednesday
