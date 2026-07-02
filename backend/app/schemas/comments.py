from datetime import datetime

from pydantic import BaseModel


class RequestCommentCreate(BaseModel):
    comment: str
    is_internal: bool = False


class RequestCommentOut(BaseModel):
    id: str
    user_id: str | None
    comment: str
    is_internal: bool
    created_at: datetime
