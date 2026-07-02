from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps.db import get_db
from app.deps.roles import get_current_profile
from app.emails.templates import comment_email
from app.schemas.comments import RequestCommentCreate, RequestCommentOut
from app.services.email_service import send_email
from app.services.request_service import get_request_row
from app.db_utils import row_dict, row_dicts

router = APIRouter(prefix="/requests/{request_id}/comments", tags=["request-comments"])


@router.get("", response_model=list[RequestCommentOut])
async def list_comments(
    request_id: str,
    db: AsyncSession = Depends(get_db),
    _profile: dict = Depends(get_current_profile),
):
    # RLS on request_comments already filters out internal comments for
    # non-admin callers — this query intentionally doesn't add its own
    # is_internal filter, so the DB-layer policy is what's actually tested.
    rows = (
        await db.execute(
            text("select * from public.request_comments where request_id = :request_id order by created_at"),
            {"request_id": request_id},
        )
    ).mappings().all()
    return [RequestCommentOut(**d) for d in row_dicts(rows)]


@router.post("", response_model=RequestCommentOut, status_code=201)
async def add_comment(
    request_id: str,
    body: RequestCommentCreate,
    db: AsyncSession = Depends(get_db),
    profile: dict = Depends(get_current_profile),
):
    is_internal = body.is_internal if profile["role"] == "admin" else False
    row = (
        await db.execute(
            text(
                """insert into public.request_comments (request_id, user_id, comment, is_internal)
                   values (:request_id, :user_id, :comment, :is_internal) returning *"""
            ),
            {"request_id": request_id, "user_id": profile["id"], "comment": body.comment, "is_internal": is_internal},
        )
    ).mappings().first()

    if profile["role"] == "admin" and not is_internal:
        r = await get_request_row(db, request_id)
        subject, email_body = comment_email(r["code"], body.comment)
        await send_email(db, request_id=request_id, email_type="comentario", recipient=r["email"], subject=subject, body=email_body)

    return RequestCommentOut(**row_dict(row))
