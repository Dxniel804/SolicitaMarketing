from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps.db import get_db
from app.deps.roles import get_current_profile, require_role
from app.schemas.requests import (
    DeliverIn,
    RequestCreate,
    RequestOut,
    RequestUpdate,
    ReturnForBriefingIn,
    ViabilityPreviewIn,
    ViabilityPreviewOut,
)
from app.services import request_service, viability_service
from app.db_utils import row_dict, row_dicts

router = APIRouter(prefix="/requests", tags=["requests"])


@router.post("/viability-preview", response_model=ViabilityPreviewOut)
async def viability_preview(
    body: ViabilityPreviewIn,
    db: AsyncSession = Depends(get_db),
    _profile: dict = Depends(get_current_profile),
):
    draft = {
        "tipoId": body.request_type_id,
        "adjusted_weight": body.adjusted_weight,
        "dataDesejada": body.desired_delivery_date,
        "prioridade": body.priority_requested,
        "justificativa": body.priority_justification,
        "anexoNome": body.attachment_name,
        "anexoLink": body.attachment_link,
        "nome": body.nome,
        "area": body.area,
        "email": body.email,
        "aprovador": body.aprovador,
        "titulo": body.titulo,
        "oQue": body.oQue,
        "objetivo": body.objetivo,
        "publico": body.publico,
        "canal": body.canal,
        "formato": body.formato,
        "dataUso": body.dataUso,
    }
    result = await viability_service.compute_viability_for_draft(
        db, draft, date.today(), exclude_id=body.exclude_id
    )
    return ViabilityPreviewOut(
        level=result.level,
        message=result.message,
        reasons=result.reasons,
        alerts=result.alerts,
        weight=result.weight,
        min_days=result.min_days,
        min_possible_date=result.min_date,
        suggested_date=result.suggested,
        capacity=result.cap,
        occupied_before=result.occ_before,
        available_before=result.avail_before,
    )


@router.post("", response_model=RequestOut, status_code=201)
async def create_request(
    body: RequestCreate,
    db: AsyncSession = Depends(get_db),
    profile: dict = Depends(get_current_profile),
):
    row = await request_service.create_request(db, profile["id"], body)
    return RequestOut(**row)


@router.get("", response_model=list[RequestOut])
async def list_requests(
    mine: bool = Query(False),
    status: str | None = Query(None),
    area: str | None = Query(None),
    type_id: str | None = Query(None),
    priority: str | None = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
    profile: dict = Depends(get_current_profile),
):
    clauses = []
    params: dict = {"limit": limit, "offset": offset}
    if mine or profile["role"] == "solicitante":
        clauses.append("requester_id = :requester_id")
        params["requester_id"] = profile["id"]
    if status:
        clauses.append("status = :status")
        params["status"] = status
    if area:
        clauses.append("area = :area")
        params["area"] = area
    if type_id:
        clauses.append("request_type_id = :type_id")
        params["type_id"] = type_id
    if priority:
        clauses.append("priority_requested = :priority")
        params["priority"] = priority

    where = f"where {' and '.join(clauses)}" if clauses else ""
    rows = (
        await db.execute(
            text(f"select * from public.requests {where} order by created_at desc limit :limit offset :offset"),
            params,
        )
    ).mappings().all()
    return [RequestOut(**d) for d in row_dicts(rows)]


@router.get("/{request_id}", response_model=RequestOut)
async def get_request(
    request_id: str,
    db: AsyncSession = Depends(get_db),
    profile: dict = Depends(get_current_profile),
):
    row = await request_service.get_request_row(db, request_id)
    is_owner = row["requester_id"] == profile["id"]
    if profile["role"] not in ("admin", "gestor") and not is_owner:
        # Solicitantes never get full detail on someone else's request — only
        # the summarized /queue view. Enforced here even though RLS may
        # technically permit reading the (non-confidential) row.
        raise HTTPException(status_code=404, detail="Solicitação não encontrada")
    return RequestOut(**row)


@router.patch("/{request_id}", response_model=RequestOut)
async def patch_request(
    request_id: str,
    body: RequestUpdate,
    db: AsyncSession = Depends(get_db),
    profile: dict = Depends(get_current_profile),
):
    current = await request_service.get_request_row(db, request_id)
    is_owner = current["requester_id"] == profile["id"]
    if profile["role"] != "admin":
        if not is_owner or current["status"] not in ("Recebido", "Aguardando briefing"):
            raise HTTPException(status_code=403, detail="Não é possível editar esta solicitação agora")
    row = await request_service.update_request(db, request_id, profile["id"], body)
    return RequestOut(**row)


@router.post("/{request_id}/approve", response_model=RequestOut)
async def approve(
    request_id: str,
    db: AsyncSession = Depends(get_db),
    profile: dict = Depends(require_role("admin")),
):
    row = await request_service.approve_request(db, request_id, profile["id"])
    return RequestOut(**row)


@router.post("/{request_id}/reprogram", response_model=RequestOut)
async def reprogram(
    request_id: str,
    db: AsyncSession = Depends(get_db),
    profile: dict = Depends(require_role("admin")),
):
    row = await request_service.reprogram_request(db, request_id, profile["id"])
    return RequestOut(**row)


@router.post("/{request_id}/return-for-briefing", response_model=RequestOut)
async def return_for_briefing(
    request_id: str,
    body: ReturnForBriefingIn,
    db: AsyncSession = Depends(get_db),
    profile: dict = Depends(require_role("admin")),
):
    row = await request_service.return_for_briefing(db, request_id, profile["id"], body.pendencias)
    return RequestOut(**row)


@router.post("/{request_id}/cancel", response_model=RequestOut)
async def cancel(
    request_id: str,
    db: AsyncSession = Depends(get_db),
    profile: dict = Depends(require_role("admin")),
):
    row = await request_service.cancel_request(db, request_id, profile["id"])
    return RequestOut(**row)


@router.post("/{request_id}/reject", response_model=RequestOut)
async def reject(
    request_id: str,
    db: AsyncSession = Depends(get_db),
    profile: dict = Depends(require_role("admin")),
):
    row = await request_service.reject_request(db, request_id, profile["id"])
    return RequestOut(**row)


@router.post("/{request_id}/deliver", response_model=RequestOut)
async def deliver(
    request_id: str,
    body: DeliverIn,
    db: AsyncSession = Depends(get_db),
    profile: dict = Depends(require_role("admin")),
):
    row = await request_service.deliver_request(db, request_id, profile["id"], body.final_delivery_link)
    return RequestOut(**row)
