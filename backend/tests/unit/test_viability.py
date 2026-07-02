from datetime import date, timedelta

from app.core.capacity import WeekCapacityConfig
from app.core.viability import RequestTypeInfo, compute_viability

TODAY = date(2026, 6, 29)  # Monday


def complete_draft(**overrides):
    d = {
        "nome": "Marina Alves",
        "area": "Marketing",
        "email": "marina@vendamais.com.br",
        "aprovador": "Carla Souza",
        "titulo": "Post comemorativo",
        "tipoId": "T4",
        "oQue": "Produzir o post",
        "objetivo": "Engajamento",
        "publico": "Clientes",
        "canal": "Instagram",
        "formato": "Imagem",
        "dataDesejada": TODAY + timedelta(days=10),
        "dataUso": TODAY + timedelta(days=10),
        "prioridade": "Normal",
    }
    d.update(overrides)
    return d


def test_green_when_everything_fits():
    rtype = RequestTypeInfo(id="T4", weight=1, min_days=3, requires_attachment=False)
    result = compute_viability(complete_draft(), rtype, TODAY, {}, [])
    assert result.level == "verde"
    assert result.reasons == []


def test_red_when_briefing_incomplete():
    rtype = RequestTypeInfo(id="T4", weight=1, min_days=3, requires_attachment=False)
    draft = complete_draft(titulo="")
    result = compute_viability(draft, rtype, TODAY, {}, [])
    assert result.level == "vermelho"
    assert "Briefing incompleto" in result.reasons


def test_red_when_desired_before_min_date():
    rtype = RequestTypeInfo(id="T12", weight=3, min_days=7, requires_attachment=False)
    draft = complete_draft(dataDesejada=TODAY + timedelta(days=1), dataUso=TODAY + timedelta(days=1))
    result = compute_viability(draft, rtype, TODAY, {}, [])
    assert result.level == "vermelho"
    assert "Data solicitada menor que o prazo mínimo" in result.reasons


def test_red_when_missing_required_attachment():
    rtype = RequestTypeInfo(id="T13", weight=3, min_days=5, requires_attachment=True)
    result = compute_viability(complete_draft(), rtype, TODAY, {}, [])
    assert result.level == "vermelho"
    assert "Arquivos obrigatórios ausentes" in result.reasons


def test_green_when_attachment_provided():
    rtype = RequestTypeInfo(id="T13", weight=3, min_days=5, requires_attachment=True)
    draft = complete_draft(anexoLink="https://example.com/file.pdf")
    result = compute_viability(draft, rtype, TODAY, {}, [])
    assert result.attach_ok is True


def test_vermelho_when_priority_alta_without_justification():
    # Faithful port of a prototype quirk (line 862 vs 884): missing justification
    # for Alta/Crítica flips briefing_complete to False, which always produces a
    # "Briefing incompleto" reason (-> vermelho) before the alerts branch (which
    # also checks justification) is ever reached. Not "fixed" here on purpose.
    rtype = RequestTypeInfo(id="T4", weight=1, min_days=3, requires_attachment=False)
    draft = complete_draft(prioridade="Alta")
    result = compute_viability(draft, rtype, TODAY, {}, [])
    assert result.level == "vermelho"
    assert "Briefing incompleto" in result.reasons


def test_amarelo_when_near_90_percent_capacity():
    rtype = RequestTypeInfo(id="T4", weight=2, min_days=3, requires_attachment=False)
    desired = TODAY + timedelta(days=10)
    from app.core.dates import week_start

    week_key = week_start(desired)
    configs = {week_key: WeekCapacityConfig(points=20, blocked=False)}
    requests = [
        {
            "id": "existing",
            "status": "Em produção",
            "adjusted_weight": 16,
            "default_weight": 16,
            "reserve_capacity": False,
            "approved_delivery_date": None,
            "system_suggested_date": None,
            "desired_delivery_date": desired,
        }
    ]
    draft = complete_draft(dataDesejada=desired, dataUso=desired)
    result = compute_viability(draft, rtype, TODAY, configs, requests)
    # occ_before=16, weight=2 -> occ_after=18/20=90% -> amarelo alert
    assert result.level == "amarelo"
    assert "Semana ficará com 90% ou mais da capacidade ocupada" in result.alerts


def test_vermelho_when_week_has_no_capacity():
    rtype = RequestTypeInfo(id="T12", weight=5, min_days=3, requires_attachment=False)
    desired = TODAY + timedelta(days=10)
    from app.core.dates import week_start

    week_key = week_start(desired)
    configs = {week_key: WeekCapacityConfig(points=20, blocked=False)}
    requests = [
        {
            "id": "existing",
            "status": "Aprovado para produção",
            "adjusted_weight": 18,
            "default_weight": 18,
            "reserve_capacity": False,
            "approved_delivery_date": None,
            "system_suggested_date": None,
            "desired_delivery_date": desired,
        }
    ]
    draft = complete_draft(dataDesejada=desired, dataUso=desired)
    result = compute_viability(draft, rtype, TODAY, configs, requests)
    assert result.level == "vermelho"
    assert "Semana sem capacidade disponível" in result.reasons
    # suggested date should have moved forward via next_available_week
    assert result.suggested != desired
