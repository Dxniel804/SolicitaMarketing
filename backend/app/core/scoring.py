"""Priority scoring and queue ranking.

Ported 1:1 from CentraldeSolicitações.dc.html lines 896-905 (`priorityScore`)
and lines 1122-1126 (`queueRequests` rank formula).
"""

from datetime import date

from .constants import IMPACT_BONUS, PRIORITY_BASE


def priority_score(
    priority_requested: str,
    impact_type: str | None,
    real_use_date: date | None,
    today: date,
    viability_status: str | None,
    status: str,
) -> int:
    base = PRIORITY_BASE.get(priority_requested, 40)
    impact = IMPACT_BONUS.get(impact_type or "", 0)

    prox = 0
    if real_use_date:
        days = (real_use_date - today).days
        if days <= 3:
            prox = 40
        elif days <= 7:
            prox = 30
        elif days <= 14:
            prox = 20
        elif days <= 30:
            prox = 10
        else:
            prox = 0

    penalty = -50 if (viability_status == "vermelho" and status == "Aguardando briefing") else 0

    return max(0, base + impact + prox + penalty)


def queue_rank(
    priority_requested: str,
    status: str,
    score: int,
    real_use_date: date | None,
    today: date,
) -> int:
    s = 0
    if priority_requested == "Crítica" and status == "Aprovado para produção":
        s += 10000
    s += score
    if real_use_date:
        days = (real_use_date - today).days
        s += max(0, 5000 - days)
    return s
