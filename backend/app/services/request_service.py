"""Request lifecycle: creation (with server-side hard validation + viability
calc), admin triage actions, and generic field updates. Every mutation that
changes status/weight/priority/reserve_capacity/confidential/dates appends a
`status_history` row; every state-changing action also sends the matching
automatic email (logged in email_logs regardless of send success).
"""

from datetime import date, datetime, timezone
from typing import Any

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dates import week_start
from app.db_utils import row_dict
from app.emails import templates
from app.schemas.requests import RequestCreate, RequestUpdate
from app.services import viability_service
from app.services.email_service import send_email

REQUIRED_FIELD_LABELS = {
    "requester_name": "Nome",
    "area": "Área",
    "email": "E-mail",
    "approver_name": "Responsável pela aprovação",
    "title": "Título",
    "request_type_id": "Tipo de demanda",
    "what_needs_to_be_done": "O que precisa ser feito",
    "objective": "Objetivo",
    "target_audience": "Público-alvo",
    "channel": "Canal",
    "output_format": "Formato",
}


async def _next_code(db: AsyncSession, year: int) -> str:
    row = (
        await db.execute(
            text(
                """insert into public.code_counters (year, last_seq) values (:year, 1)
                   on conflict (year) do update set last_seq = code_counters.last_seq + 1
                   returning last_seq"""
            ),
            {"year": year},
        )
    ).first()
    seq = row[0]
    return f"MKT-{year}-{seq:04d}"


async def add_history(
    db: AsyncSession,
    request_id: str,
    changed_by: str | None,
    old_status: str | None,
    new_status: str | None,
    reason: str | None = None,
) -> None:
    await db.execute(
        text(
            """insert into public.status_history (request_id, old_status, new_status, changed_by, reason)
               values (:request_id, :old_status, :new_status, :changed_by, :reason)"""
        ),
        {
            "request_id": request_id,
            "old_status": old_status,
            "new_status": new_status,
            "changed_by": changed_by,
            "reason": reason,
        },
    )


async def get_request_row(db: AsyncSession, request_id: str) -> dict[str, Any]:
    row = (
        await db.execute(text("select * from public.requests where id = :id"), {"id": request_id})
    ).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Solicitação não encontrada")
    return row_dict(row)


async def get_request_type_name(db: AsyncSession, type_id: str) -> str:
    row = (
        await db.execute(text("select name from public.request_types where id = :id"), {"id": type_id})
    ).first()
    return row[0] if row else "—"


def _validate_create(body: RequestCreate) -> list[str]:
    errors: list[str] = []
    for field, label in REQUIRED_FIELD_LABELS.items():
        if not str(getattr(body, field) or "").strip():
            errors.append(f"Preencher: {label}")

    if body.priority_requested in ("Alta", "Crítica") and not str(body.priority_justification or "").strip():
        errors.append("Justificativa obrigatória para prioridade Alta/Crítica")

    today = date.today()
    if body.desired_delivery_date < today:
        errors.append("Data desejada não pode ser anterior a hoje")
    if body.real_use_date < body.desired_delivery_date:
        errors.append("Data real de uso não pode ser anterior à data de entrega")
    if not body.ciente:
        errors.append("Marcar o aceite das regras de solicitação")
    return errors


def _draft_from_create(body: RequestCreate) -> dict:
    return {
        "nome": body.requester_name,
        "area": body.area,
        "email": body.email,
        "aprovador": body.approver_name,
        "titulo": body.title,
        "tipoId": body.request_type_id,
        "oQue": body.what_needs_to_be_done,
        "objetivo": body.objective,
        "publico": body.target_audience,
        "canal": body.channel,
        "formato": body.output_format,
        "dataDesejada": body.desired_delivery_date,
        "dataUso": body.real_use_date,
        "prioridade": body.priority_requested,
        "justificativa": body.priority_justification,
        "anexoNome": body.attachment_name,
        "anexoLink": body.attachment_link,
    }


async def create_request(db: AsyncSession, requester_id: str, body: RequestCreate) -> dict[str, Any]:
    errors = _validate_create(body)
    if errors:
        raise HTTPException(status_code=422, detail={"errors": errors})

    today = date.today()
    draft = _draft_from_create(body)
    result = await viability_service.compute_viability_for_draft(db, draft, today, exclude_id=None)
    if result.type_id is None:
        raise HTTPException(status_code=422, detail={"errors": ["Tipo de demanda inválido"]})
    if not result.attach_ok:
        raise HTTPException(status_code=422, detail={"errors": ["Este tipo de demanda exige um anexo ou link"]})

    code = await _next_code(db, today.year)
    suggested = result.suggested
    delivery_week = week_start(suggested) if suggested else None

    row = (
        await db.execute(
            text(
                """insert into public.requests (
                    code, requester_id, requester_name, area, email, whatsapp, approver_name,
                    approver_email, confidential, title, request_type_id, client_or_project,
                    is_commercial_opportunity, commercial_owner, crm_link, what_needs_to_be_done,
                    objective, problem_to_solve, expected_action, target_audience, audience_profile,
                    segment, company, audience_knows_vendamais, mandatory_content, base_text,
                    reference_links, forbidden_content, channel, output_format, dimensions,
                    needs_editable_version, needs_spanish_version, needs_english_version,
                    desired_delivery_date, real_use_date, is_deadline_flexible, consequence_if_late,
                    priority_requested, priority_approved, priority_justification, impact_type,
                    status, default_weight, adjusted_weight, min_business_days, min_possible_date,
                    system_suggested_date, delivery_week_start, viability_status
                ) values (
                    :code, :requester_id, :requester_name, :area, :email, :whatsapp, :approver_name,
                    :approver_email, :confidential, :title, :request_type_id, :client_or_project,
                    :is_commercial_opportunity, :commercial_owner, :crm_link, :what_needs_to_be_done,
                    :objective, :problem_to_solve, :expected_action, :target_audience, :audience_profile,
                    :segment, :company, :audience_knows_vendamais, :mandatory_content, :base_text,
                    :reference_links, :forbidden_content, :channel, :output_format, :dimensions,
                    :needs_editable_version, :needs_spanish_version, :needs_english_version,
                    :desired_delivery_date, :real_use_date, :is_deadline_flexible, :consequence_if_late,
                    :priority_requested, :priority_requested, :priority_justification, :impact_type,
                    'Recebido', :default_weight, :default_weight, :min_business_days, :min_possible_date,
                    :system_suggested_date, :delivery_week_start, :viability_status
                ) returning *"""
            ),
            {
                "code": code,
                "requester_id": requester_id,
                "requester_name": body.requester_name,
                "area": body.area,
                "email": body.email,
                "whatsapp": body.whatsapp,
                "approver_name": body.approver_name,
                "approver_email": body.approver_email,
                "confidential": body.confidential,
                "title": body.title,
                "request_type_id": body.request_type_id,
                "client_or_project": body.client_or_project,
                "is_commercial_opportunity": body.is_commercial_opportunity,
                "commercial_owner": body.commercial_owner,
                "crm_link": body.crm_link,
                "what_needs_to_be_done": body.what_needs_to_be_done,
                "objective": body.objective,
                "problem_to_solve": body.problem_to_solve,
                "expected_action": body.expected_action,
                "target_audience": body.target_audience,
                "audience_profile": body.audience_profile,
                "segment": body.segment,
                "company": body.company,
                "audience_knows_vendamais": body.audience_knows_vendamais,
                "mandatory_content": body.mandatory_content,
                "base_text": body.base_text,
                "reference_links": body.reference_links,
                "forbidden_content": body.forbidden_content,
                "channel": body.channel,
                "output_format": body.output_format,
                "dimensions": body.dimensions,
                "needs_editable_version": body.needs_editable_version,
                "needs_spanish_version": body.needs_spanish_version,
                "needs_english_version": body.needs_english_version,
                "desired_delivery_date": body.desired_delivery_date,
                "real_use_date": body.real_use_date,
                "is_deadline_flexible": body.is_deadline_flexible,
                "consequence_if_late": body.consequence_if_late,
                "priority_requested": body.priority_requested,
                "priority_justification": body.priority_justification,
                "impact_type": body.impact_type,
                "default_weight": result.weight,
                "min_business_days": result.min_days,
                "min_possible_date": result.min_date,
                "system_suggested_date": suggested,
                "delivery_week_start": delivery_week,
                "viability_status": result.level,
            },
        )
    ).mappings().first()
    request = row_dict(row)

    await add_history(db, request["id"], requester_id, None, "Recebido", "Solicitação criada com status Recebido")

    type_name = await get_request_type_name(db, body.request_type_id)
    subj1, body1 = templates.received_email(code, body.title, type_name, body.desired_delivery_date, suggested)
    await send_email(db, request_id=request["id"], email_type="recebido", recipient=body.email, subject=subj1, body=body1)

    viability_labels = {"verde": "Viável", "amarelo": "Atenção", "vermelho": "Inviável"}
    subj2, body2 = templates.new_request_email(
        code, body.requester_name, body.area, type_name, result.weight, body.priority_requested,
        body.desired_delivery_date, suggested, viability_labels.get(result.level, result.level),
    )
    await send_email(db, request_id=request["id"], email_type="nova", recipient="marketing@vendamais.com.br", subject=subj2, body=body2)

    return request


async def approve_request(db: AsyncSession, request_id: str, actor_id: str) -> dict[str, Any]:
    r = await get_request_row(db, request_id)
    approved_date = r["approved_delivery_date"] or r["system_suggested_date"] or r["desired_delivery_date"]
    old_status = r["status"]
    await db.execute(
        text(
            """update public.requests set approved_delivery_date = :d, status = 'Aprovado para produção',
               viability_status = 'verde', delivery_week_start = :wk, updated_at = now()
               where id = :id"""
        ),
        {"d": approved_date, "wk": week_start(approved_date), "id": request_id},
    )
    await add_history(db, request_id, actor_id, old_status, "Aprovado para produção", f"Prazo aprovado para {approved_date}")

    type_name = await get_request_type_name(db, r["request_type_id"])
    subj, body = templates.approved_email(r["code"], type_name, approved_date)
    await send_email(db, request_id=request_id, email_type="aprovado", recipient=r["email"], subject=subj, body=body)
    return await get_request_row(db, request_id)


async def reprogram_request(db: AsyncSession, request_id: str, actor_id: str) -> dict[str, Any]:
    r = await get_request_row(db, request_id)
    today = date.today()
    draft = {
        "tipoId": str(r["request_type_id"]),
        "dataDesejada": r["desired_delivery_date"],
        "adjusted_weight": r["adjusted_weight"],
        "prioridade": r["priority_requested"],
    }
    result = await viability_service.compute_viability_for_draft(db, draft, today, exclude_id=request_id)
    new_date = result.suggested
    old_status = r["status"]

    await db.execute(
        text(
            """update public.requests set approved_delivery_date = :d, system_suggested_date = :d,
               status = 'Aguardando aprovação de prazo', delivery_week_start = :wk, updated_at = now()
               where id = :id"""
        ),
        {"d": new_date, "wk": week_start(new_date) if new_date else None, "id": request_id},
    )
    await add_history(
        db, request_id, actor_id, old_status, "Aguardando aprovação de prazo",
        f"Reprogramado para {new_date} (próxima semana com capacidade)",
    )

    subj, body = templates.reprogrammed_email(
        r["code"], r["desired_delivery_date"], new_date, "capacidade da semana solicitada esgotada"
    )
    await send_email(db, request_id=request_id, email_type="reprogramado", recipient=r["email"], subject=subj, body=body)
    return await get_request_row(db, request_id)


async def return_for_briefing(db: AsyncSession, request_id: str, actor_id: str, pendencias: str | None) -> dict[str, Any]:
    r = await get_request_row(db, request_id)
    old_status = r["status"]
    await db.execute(
        text("update public.requests set status = 'Aguardando briefing', updated_at = now() where id = :id"),
        {"id": request_id},
    )
    await add_history(db, request_id, actor_id, old_status, "Aguardando briefing", "Devolvida para complemento de briefing")

    subj, body = templates.briefing_incomplete_email(
        r["code"], pendencias or "Complementar o briefing conforme observações do marketing"
    )
    await send_email(db, request_id=request_id, email_type="briefing", recipient=r["email"], subject=subj, body=body)
    return await get_request_row(db, request_id)


async def cancel_request(db: AsyncSession, request_id: str, actor_id: str) -> dict[str, Any]:
    r = await get_request_row(db, request_id)
    old_status = r["status"]
    await db.execute(
        text("update public.requests set status = 'Cancelado', updated_at = now() where id = :id"), {"id": request_id}
    )
    await add_history(db, request_id, actor_id, old_status, "Cancelado", "Solicitação cancelada")
    return await get_request_row(db, request_id)


async def reject_request(db: AsyncSession, request_id: str, actor_id: str) -> dict[str, Any]:
    r = await get_request_row(db, request_id)
    old_status = r["status"]
    await db.execute(
        text("update public.requests set status = 'Recusado', updated_at = now() where id = :id"), {"id": request_id}
    )
    await add_history(db, request_id, actor_id, old_status, "Recusado", "Solicitação recusada")
    return await get_request_row(db, request_id)


async def deliver_request(db: AsyncSession, request_id: str, actor_id: str, final_delivery_link: str | None) -> dict[str, Any]:
    r = await get_request_row(db, request_id)
    old_status = r["status"]
    now = datetime.now(timezone.utc)
    await db.execute(
        text(
            """update public.requests set status = 'Entregue', delivered_at = :now,
               final_delivery_link = :link, updated_at = now() where id = :id"""
        ),
        {"now": now, "link": final_delivery_link, "id": request_id},
    )
    await add_history(db, request_id, actor_id, old_status, "Entregue", "Solicitação entregue")

    type_name = await get_request_type_name(db, r["request_type_id"])
    subj, body = templates.delivered_email(r["code"], type_name, now.date(), final_delivery_link)
    await send_email(db, request_id=request_id, email_type="entrega", recipient=r["email"], subject=subj, body=body)
    return await get_request_row(db, request_id)


HISTORY_TRACKED_FIELDS = {
    "status", "adjusted_weight", "priority_approved", "reserve_capacity", "confidential",
    "desired_delivery_date", "real_use_date", "approved_delivery_date",
}


async def update_request(db: AsyncSession, request_id: str, actor_id: str, body: RequestUpdate) -> dict[str, Any]:
    current = await get_request_row(db, request_id)
    updates = body.model_dump(exclude_unset=True)
    if not updates:
        return current

    set_clauses = ", ".join(f"{k} = :{k}" for k in updates)
    params = dict(updates)
    params["id"] = request_id

    # Recompute delivery_week_start if a date field affecting it changed.
    if "desired_delivery_date" in updates:
        effective = current["approved_delivery_date"] or current["system_suggested_date"] or updates["desired_delivery_date"]
        set_clauses += ", delivery_week_start = :delivery_week_start"
        params["delivery_week_start"] = week_start(effective) if effective else None

    await db.execute(text(f"update public.requests set {set_clauses}, updated_at = now() where id = :id"), params)

    for field in HISTORY_TRACKED_FIELDS & updates.keys():
        old_val = current.get(field)
        new_val = updates[field]
        if old_val != new_val:
            await add_history(db, request_id, actor_id, str(old_val), str(new_val), f"Campo '{field}' alterado")

    return await get_request_row(db, request_id)
