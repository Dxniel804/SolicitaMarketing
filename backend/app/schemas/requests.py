from datetime import date, datetime

from pydantic import BaseModel, Field


class RequestCreate(BaseModel):
    """Body for POST /requests. Field names mirror the `requests` table columns
    (see supabase/migrations/0001_schema.sql), not the prototype's short JS
    names — the service layer translates into the shape core.viability expects.
    """

    # bloco 1
    requester_name: str
    area: str
    email: str
    whatsapp: str | None = None
    approver_name: str
    approver_email: str | None = None
    confidential: bool = False

    # bloco 2
    title: str
    request_type_id: str
    client_or_project: str | None = None
    is_commercial_opportunity: bool = False
    commercial_owner: str | None = None
    crm_link: str | None = None

    # bloco 3
    what_needs_to_be_done: str
    objective: str
    problem_to_solve: str | None = None
    expected_action: str | None = None

    # bloco 4
    target_audience: str
    audience_profile: str | None = None
    segment: str | None = None
    company: str | None = None
    audience_knows_vendamais: str | None = None

    # bloco 5
    mandatory_content: str | None = None
    base_text: str | None = None
    reference_links: str | None = None
    forbidden_content: str | None = None

    # bloco 6
    channel: str
    output_format: str
    dimensions: str | None = None
    needs_editable_version: bool = False
    needs_spanish_version: bool = False
    needs_english_version: bool = False

    # bloco 7
    desired_delivery_date: date
    real_use_date: date
    is_deadline_flexible: bool = False
    consequence_if_late: str | None = None

    # bloco 8
    priority_requested: str
    priority_justification: str | None = None
    impact_type: str = ""

    # bloco 9 (attachment presence hints for the pre-submit validation, actual
    # rows come from POST /requests/{id}/files after this call returns an id)
    attachment_name: str | None = None
    attachment_link: str | None = None

    # bloco 10
    ciente: bool = Field(..., description="Aceite obrigatório das regras de solicitação")


class RequestOut(BaseModel):
    id: str
    code: str
    title: str
    requester_id: str
    requester_name: str
    area: str
    email: str
    whatsapp: str | None
    approver_name: str
    approver_email: str | None
    confidential: bool

    request_type_id: str
    client_or_project: str | None
    is_commercial_opportunity: bool
    commercial_owner: str | None
    crm_link: str | None

    what_needs_to_be_done: str
    objective: str
    problem_to_solve: str | None
    expected_action: str | None

    target_audience: str
    audience_profile: str | None
    segment: str | None
    company: str | None
    audience_knows_vendamais: str | None

    mandatory_content: str | None
    base_text: str | None
    reference_links: str | None
    forbidden_content: str | None

    channel: str
    output_format: str
    dimensions: str | None
    needs_editable_version: bool
    needs_spanish_version: bool
    needs_english_version: bool

    desired_delivery_date: date
    real_use_date: date
    is_deadline_flexible: bool
    consequence_if_late: str | None

    priority_requested: str
    priority_approved: str | None
    priority_justification: str | None
    impact_type: str | None

    status: str

    default_weight: int
    adjusted_weight: int | None
    min_business_days: int
    min_possible_date: date | None
    system_suggested_date: date | None
    approved_delivery_date: date | None
    delivery_week_start: date | None
    viability_status: str
    inviability_reason: str | None
    reserve_capacity: bool
    responsavel: str | None
    internal_notes: str | None

    final_delivery_link: str | None
    delivered_at: datetime | None

    created_at: datetime
    updated_at: datetime


class RequestUpdate(BaseModel):
    """Admin can patch any of these; solicitante only while pre-triage (enforced
    by RLS + the route's own role check)."""

    title: str | None = None
    objective: str | None = None
    target_audience: str | None = None
    channel: str | None = None
    output_format: str | None = None
    desired_delivery_date: date | None = None
    real_use_date: date | None = None
    priority_approved: str | None = None
    priority_justification: str | None = None
    impact_type: str | None = None
    adjusted_weight: int | None = None
    responsavel: str | None = None
    reserve_capacity: bool | None = None
    confidential: bool | None = None
    internal_notes: str | None = None


class QueueRowOut(BaseModel):
    """Deliberately narrow DTO for the summarized general queue (spec.txt
    lines 105-117): only order/type/area/status/week/deadline — no title,
    briefing, attachments, internal comments, or commercial value, even for
    rows RLS permits reading (RLS is row-level, not column-level). Rows
    marked confidential are additionally filtered out entirely for anyone but
    the owner/admin at the RLS layer itself (0003_rls_policies.sql)."""

    id: str
    order: int
    request_type_name: str
    area: str
    status: str
    delivery_week_start: date | None
    effective_date: date | None


class ViabilityPreviewIn(BaseModel):
    request_type_id: str | None = None
    adjusted_weight: int | None = None
    desired_delivery_date: date | None = None
    priority_requested: str = "Normal"
    priority_justification: str | None = None
    attachment_name: str | None = None
    attachment_link: str | None = None
    nome: str | None = None
    area: str | None = None
    email: str | None = None
    aprovador: str | None = None
    titulo: str | None = None
    oQue: str | None = None
    objetivo: str | None = None
    publico: str | None = None
    canal: str | None = None
    formato: str | None = None
    dataUso: date | None = None
    exclude_id: str | None = None


class ViabilityPreviewOut(BaseModel):
    level: str
    message: str
    reasons: list[str]
    alerts: list[str]
    weight: int
    min_days: int
    min_possible_date: date | None
    suggested_date: date | None
    capacity: int
    occupied_before: int
    available_before: int


class DeliverIn(BaseModel):
    final_delivery_link: str | None = None


class ReturnForBriefingIn(BaseModel):
    pendencias: str | None = None
