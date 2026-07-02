from fastapi import Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db_utils import row_dict
from app.deps.auth import Claims, verify_jwt
from app.deps.db import get_db


async def get_current_profile(claims: Claims = Depends(verify_jwt), db: AsyncSession = Depends(get_db)) -> dict:
    row = (
        await db.execute(
            text("select id, name, role, active, area from public.profiles where id = :id"),
            {"id": claims.sub},
        )
    ).mappings().first()
    if not row or not row["active"]:
        raise HTTPException(status_code=403, detail="No active profile")
    return row_dict(row)


def require_role(*roles: str):
    """Fast, explicit 403 for whole endpoints. This complements RLS rather than
    replacing it: RLS is the non-negotiable data-layer gate (a bug here would
    still leave the DB safe), this dependency just avoids a confusing
    200-with-no-effect when RLS silently blocks an UPDATE/INSERT."""

    async def _dep(profile: dict = Depends(get_current_profile)) -> dict:
        if profile["role"] not in roles:
            raise HTTPException(status_code=403, detail="Insufficient role")
        return profile

    return _dep
