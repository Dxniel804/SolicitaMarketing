from datetime import date

from pydantic import BaseModel


class HolidayOut(BaseModel):
    id: str
    date: date
    name: str
    type: str


class HolidayCreate(BaseModel):
    date: date
    name: str
    type: str = "nacional"
