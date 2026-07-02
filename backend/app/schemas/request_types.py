from pydantic import BaseModel


class RequestTypeOut(BaseModel):
    id: str
    name: str
    default_weight: int
    default_min_business_days: int
    description: str | None = None
    requires_attachment: bool
    active: bool


class RequestTypeCreate(BaseModel):
    name: str
    default_weight: int
    default_min_business_days: int
    description: str | None = None
    requires_attachment: bool = False


class RequestTypeUpdate(BaseModel):
    default_weight: int | None = None
    default_min_business_days: int | None = None
    description: str | None = None
    requires_attachment: bool | None = None
    active: bool | None = None
