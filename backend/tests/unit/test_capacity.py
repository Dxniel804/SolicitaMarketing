from datetime import date, timedelta

from app.core.capacity import (
    WeekCapacityConfig,
    cap_for_week,
    cap_style_for,
    next_available_week,
    occupied_for_week,
)

MONDAY = date(2026, 6, 29)


def make_request(id_, status, weight, delivery_date, reserve_capacity=False):
    return {
        "id": id_,
        "status": status,
        "adjusted_weight": weight,
        "default_weight": weight,
        "reserve_capacity": reserve_capacity,
        "approved_delivery_date": None,
        "system_suggested_date": None,
        "desired_delivery_date": delivery_date,
    }


def test_cap_for_week_default_when_unconfigured():
    assert cap_for_week({}, MONDAY) == 20


def test_cap_for_week_blocked_is_zero():
    configs = {MONDAY: WeekCapacityConfig(points=20, blocked=True)}
    assert cap_for_week(configs, MONDAY) == 0


def test_occupied_for_week_spec_worked_example():
    # spec.txt lines 857-860: capacity 20, occupied 18 -> 90% "semana cheia"
    requests = [
        make_request("R1", "Em produção", 10, MONDAY + timedelta(days=3)),
        make_request("R2", "Aprovado para produção", 8, MONDAY + timedelta(days=4)),
    ]
    occ = occupied_for_week(requests, MONDAY)
    assert occ == 18
    pct = round(occ / 20 * 100)
    assert pct == 90
    assert cap_style_for(pct)["tag"] == "semana cheia"


def test_occupied_for_week_ignores_non_consuming_status():
    requests = [make_request("R1", "Recebido", 18, MONDAY + timedelta(days=2))]
    assert occupied_for_week(requests, MONDAY) == 0


def test_occupied_for_week_reserve_capacity_override():
    requests = [
        make_request("R1", "Recebido", 18, MONDAY + timedelta(days=2), reserve_capacity=True)
    ]
    assert occupied_for_week(requests, MONDAY) == 18


def test_occupied_for_week_excludes_self():
    requests = [make_request("R1", "Em produção", 10, MONDAY + timedelta(days=1))]
    assert occupied_for_week(requests, MONDAY, exclude_id="R1") == 0


def test_next_available_week_walks_forward_when_full():
    configs = {MONDAY: WeekCapacityConfig(points=20, blocked=False)}
    requests = [make_request("R1", "Em produção", 20, MONDAY)]  # fully occupies current week
    result = next_available_week(weight=5, min_date=MONDAY, configs=configs, requests=requests)
    assert result.monday == MONDAY + timedelta(weeks=1)


def test_next_available_week_blocked_week_is_skipped():
    next_monday = MONDAY + timedelta(weeks=1)
    configs = {
        MONDAY: WeekCapacityConfig(points=20, blocked=False),
        next_monday: WeekCapacityConfig(points=20, blocked=True),
    }
    requests = [make_request("R1", "Em produção", 20, MONDAY)]
    result = next_available_week(weight=5, min_date=MONDAY, configs=configs, requests=requests)
    assert result.monday == next_monday + timedelta(weeks=1)


def test_cap_style_for_tiers():
    assert cap_style_for(50)["tag"] == "saudável"
    assert cap_style_for(75)["tag"] == "atenção"
    assert cap_style_for(90)["tag"] == "semana cheia"
    assert cap_style_for(105)["tag"] == "sobrecarga"
