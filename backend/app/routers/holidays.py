from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps.db import get_db
from app.deps.roles import require_role
from app.schemas.holidays import HolidayCreate, HolidayOut
from app.db_utils import row_dict, row_dicts

router = APIRouter(prefix="/holidays", tags=["holidays"])


@router.get("", response_model=list[HolidayOut])
async def list_holidays(
    date_from: date = Query(..., alias="from"),
    date_to: date = Query(..., alias="to"),
    db: AsyncSession = Depends(get_db),
):
    rows = (
        await db.execute(
            text("select * from public.holidays where date >= :f and date <= :t order by date"),
            {"f": date_from, "t": date_to},
        )
    ).mappings().all()
    return [HolidayOut(**d) for d in row_dicts(rows)]


@router.post("", response_model=HolidayOut, status_code=201)
async def create_holiday(
    body: HolidayCreate,
    db: AsyncSession = Depends(get_db),
    _profile: dict = Depends(require_role("admin")),
):
    row = (
        await db.execute(
            text("insert into public.holidays (date, name, type) values (:date, :name, :type) returning *"),
            body.model_dump(),
        )
    ).mappings().first()
    return HolidayOut(**row_dict(row))


@router.delete("/{holiday_id}", status_code=204)
async def delete_holiday(
    holiday_id: str,
    db: AsyncSession = Depends(get_db),
    _profile: dict = Depends(require_role("admin")),
):
    await db.execute(text("delete from public.holidays where id = :id"), {"id": holiday_id})
