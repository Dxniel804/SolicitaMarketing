from datetime import date, timedelta

from app.core.scoring import priority_score, queue_rank

TODAY = date(2026, 6, 29)


def test_priority_score_spec_example():
    # spec.txt lines 545-547: critical + proposta comercial + 5 days + complete
    # briefing -> 100 + 20 + 30 = 150.
    score = priority_score(
        priority_requested="Crítica",
        impact_type="Proposta comercial",
        real_use_date=TODAY + timedelta(days=5),
        today=TODAY,
        viability_status="verde",
        status="Em triagem",
    )
    assert score == 150


def test_priority_score_penalty_for_incomplete_briefing():
    score = priority_score(
        priority_requested="Normal",
        impact_type="",
        real_use_date=None,
        today=TODAY,
        viability_status="vermelho",
        status="Aguardando briefing",
    )
    # base 40 - 50 penalty, floored at 0
    assert score == 0


def test_queue_rank_critical_approved_outranks_everything():
    score_low_priority = priority_score("Baixa", "", TODAY + timedelta(days=60), TODAY, "verde", "Em triagem")
    rank_critical = queue_rank("Crítica", "Aprovado para produção", 100, TODAY + timedelta(days=1), TODAY)
    rank_baixa = queue_rank("Baixa", "Em triagem", score_low_priority, TODAY + timedelta(days=60), TODAY)
    assert rank_critical > rank_baixa
