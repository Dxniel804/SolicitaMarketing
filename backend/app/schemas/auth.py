from pydantic import BaseModel


class MeOut(BaseModel):
    id: str
    name: str
    role: str
    area: str | None = None
    active: bool
