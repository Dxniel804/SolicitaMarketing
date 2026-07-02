from fastapi import APIRouter, Depends

from app.deps.roles import get_current_profile
from app.schemas.auth import MeOut

router = APIRouter(tags=["auth"])


@router.get("/me", response_model=MeOut)
async def get_me(profile: dict = Depends(get_current_profile)) -> MeOut:
    return MeOut(**profile)
