from datetime import datetime

from pydantic import BaseModel


class RequestFileCreate(BaseModel):
    file_name: str
    file_url: str  # storage object path, e.g. "{user_id}/{uuid}-{filename}"
    file_type: str | None = None


class RequestFileOut(BaseModel):
    id: str
    file_name: str
    file_type: str | None
    signed_url: str
    created_at: datetime
