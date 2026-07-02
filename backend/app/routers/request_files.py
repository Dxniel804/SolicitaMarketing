from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps.db import get_db
from app.deps.roles import get_current_profile, require_role
from app.schemas.files import RequestFileCreate, RequestFileOut
from app.services.storage_service import sign_url

router = APIRouter(prefix="/requests/{request_id}/files", tags=["request-files"])


@router.post("", response_model=RequestFileOut, status_code=201)
async def add_file(
    request_id: str,
    body: RequestFileCreate,
    db: AsyncSession = Depends(get_db),
    profile: dict = Depends(get_current_profile),
):
    row = (
        await db.execute(
            text(
                """insert into public.request_files (request_id, file_name, file_url, file_type, uploaded_by)
                   values (:request_id, :file_name, :file_url, :file_type, :uploaded_by)
                   returning id, file_name, file_type, file_url, created_at"""
            ),
            {
                "request_id": request_id,
                "file_name": body.file_name,
                "file_url": body.file_url,
                "file_type": body.file_type,
                "uploaded_by": profile["id"],
            },
        )
    ).mappings().first()
    return RequestFileOut(
        id=str(row["id"]),
        file_name=row["file_name"],
        file_type=row["file_type"],
        signed_url=sign_url(row["file_url"]),
        created_at=row["created_at"],
    )


@router.get("", response_model=list[RequestFileOut])
async def list_files(
    request_id: str,
    db: AsyncSession = Depends(get_db),
    _profile: dict = Depends(get_current_profile),
):
    rows = (
        await db.execute(
            text(
                """select id, file_name, file_type, file_url, created_at
                   from public.request_files where request_id = :request_id order by created_at"""
            ),
            {"request_id": request_id},
        )
    ).mappings().all()
    return [
        RequestFileOut(
            id=str(r["id"]),
            file_name=r["file_name"],
            file_type=r["file_type"],
            signed_url=sign_url(r["file_url"]),
            created_at=r["created_at"],
        )
        for r in rows
    ]


@router.delete("/{file_id}", status_code=204)
async def delete_file(
    request_id: str,
    file_id: str,
    db: AsyncSession = Depends(get_db),
    _profile: dict = Depends(get_current_profile),
):
    await db.execute(
        text("delete from public.request_files where id = :file_id and request_id = :request_id"),
        {"file_id": file_id, "request_id": request_id},
    )
