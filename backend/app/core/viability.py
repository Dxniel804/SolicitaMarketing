"""Viability classifier.

Ported 1:1 from CentraldeSolicitações.dc.html lines 849-894 (`compute()`).
"""

from dataclasses import dataclass, field
from datetime import date

from .capacity import NextAvailableResult, WeekCapacityConfig, cap_for_week, next_available_week, occupied_for_week
from .constants import REQUIRED_DRAFT_FIELDS
from .dates import add_business_days, week_start


@dataclass
class RequestTypeInfo:
    id: str
    weight: int
    min_days: int
    requires_attachment: bool


@dataclass
class ViabilityResult:
    type_id: str | None
    weight: int
    min_days: int
    min_date: date | None
    desired: date | None
    priority: str
    briefing_complete: bool
    attach_ok: bool
    cap: int
    occ_before: int
    avail_before: int
    level: str  # 'verde' | 'amarelo' | 'vermelho'
    message: str
    reasons: list[str] = field(default_factory=list)
    alerts: list[str] = field(default_factory=list)
    suggested: date | None = None


MSG_VERMELHO = (
    "O prazo solicitado não é viável com base na fila atual ou no prazo mínimo "
    "recomendado. O marketing irá sugerir uma nova data."
)
MSG_AMARELO = (
    "Sua solicitação pode ser viável, mas depende da triagem do marketing. "
    "A semana solicitada está próxima do limite de capacidade."
)
MSG_VERDE = (
    "Sua solicitação está dentro da capacidade estimada. O prazo ainda será "
    "confirmado pelo marketing após triagem."
)


def compute_viability(
    src: dict,
    request_type: RequestTypeInfo | None,
    today: date,
    configs: dict[date, WeekCapacityConfig],
    requests: list[dict],
    exclude_id: str | None = None,
    holidays: set[date] | None = None,
) -> ViabilityResult:
    holidays = holidays or set()

    weight = src.get("adjusted_weight")
    if weight is None:
        weight = request_type.weight if request_type else 0
    min_days = request_type.min_days if request_type else 0
    min_date = add_business_days(today, min_days, holidays) if request_type else today

    desired = src.get("dataDesejada") or src.get("desired_delivery_date")
    priority = src.get("prioridade") or src.get("priority_requested") or "Normal"

    briefing_complete = all(str(src.get(k) or "").strip() != "" for k in REQUIRED_DRAFT_FIELDS)
    justification = str(src.get("justificativa") or src.get("priority_justification") or "").strip()
    if priority in ("Alta", "Crítica") and not justification:
        briefing_complete = False

    requires_attachment = bool(request_type and request_type.requires_attachment)
    has_attachment = bool(
        str(src.get("anexoLink") or "").strip()
        or str(src.get("anexoNome") or "").strip()
        or src.get("files")
    )
    attach_ok = (not requires_attachment) or has_attachment

    desired_week_key = week_start(desired) if desired else None
    cap = cap_for_week(configs, desired_week_key) if desired_week_key else 0
    occ_before = occupied_for_week(requests, desired_week_key, exclude_id) if desired_week_key else 0
    avail_before = cap - occ_before

    reasons: list[str] = []
    if desired and min_date and desired < min_date:
        reasons.append("Data solicitada menor que o prazo mínimo")
    if desired and avail_before < weight:
        reasons.append("Semana sem capacidade disponível")
    if not briefing_complete:
        reasons.append("Briefing incompleto")
    if not attach_ok:
        reasons.append("Arquivos obrigatórios ausentes")

    alerts: list[str] = []
    if reasons:
        level = "vermelho"
        message = MSG_VERMELHO
    else:
        occ_after = (occ_before + weight) / cap if cap > 0 else 0
        if occ_after >= 0.9:
            alerts.append("Semana ficará com 90% ou mais da capacidade ocupada")
        if desired and min_date and desired <= add_business_days(min_date, 1, holidays):
            alerts.append("Prazo no limite do mínimo recomendado")
        if priority in ("Alta", "Crítica") and not justification:
            alerts.append("Prioridade alta/crítica sem justificativa clara")
        if alerts:
            level = "amarelo"
            message = MSG_AMARELO
        else:
            level = "verde"
            message = MSG_VERDE

    suggested: date | None = None
    if desired:
        if desired >= min_date and avail_before >= weight:
            suggested = desired
        else:
            na: NextAvailableResult = next_available_week(
                weight, max(min_date, desired), configs, requests, exclude_id, holidays
            )
            suggested = na.date

    return ViabilityResult(
        type_id=request_type.id if request_type else None,
        weight=weight,
        min_days=min_days,
        min_date=min_date,
        desired=desired,
        priority=priority,
        briefing_complete=briefing_complete,
        attach_ok=attach_ok,
        cap=cap,
        occ_before=occ_before,
        avail_before=avail_before,
        level=level,
        message=message,
        reasons=reasons,
        alerts=alerts,
        suggested=suggested,
    )
