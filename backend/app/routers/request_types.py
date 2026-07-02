from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps.db import get_db
from app.deps.roles import require_role
from app.schemas.request_types import RequestTypeCreate, RequestTypeOut, RequestTypeUpdate
from app.db_utils import row_dict, row_dicts

router = APIRouter(prefix="/request-types", tags=["request-types"])


@router.get("", response_model=list[RequestTypeOut])
async def list_request_types(
    include_inactive: bool = Query(False),
    db: AsyncSession = Depends(get_db),
):
    query = "select * from public.request_types"
    if not include_inactive:
        query += " where active = true"
    query += " order by default_weight, name"
    rows = (await db.execute(text(query))).mappings().all()
    return [RequestTypeOut(**d) for d in row_dicts(rows)]


@router.post("", response_model=RequestTypeOut, status_code=201)
async def create_request_type(
    body: RequestTypeCreate,
    db: AsyncSession = Depends(get_db),
    _profile: dict = Depends(require_role("admin")),
):
    row = (
        await db.execute(
            text(
                """insert into public.request_types (name, default_weight, default_min_business_days, description, requires_attachment)
                   values (:name, :default_weight, :default_min_business_days, :description, :requires_attachment)
                   returning *"""
            ),
            body.model_dump(),
        )
    ).mappings().first()
    return RequestTypeOut(**row_dict(row))


@router.patch("/{type_id}", response_model=RequestTypeOut)
async def update_request_type(
    type_id: str,
    body: RequestTypeUpdate,
    db: AsyncSession = Depends(get_db),
    _profile: dict = Depends(require_role("admin")),
):
    updates = body.model_dump(exclude_unset=True)
    if updates:
        set_clauses = ", ".join(f"{k} = :{k}" for k in updates)
        updates["id"] = type_id
        await db.execute(text(f"update public.request_types set {set_clauses}, updated_at = now() where id = :id"), updates)
    row = (await db.execute(text("select * from public.request_types where id = :id"), {"id": type_id})).mappings().first()
    return RequestTypeOut(**row_dict(row))
