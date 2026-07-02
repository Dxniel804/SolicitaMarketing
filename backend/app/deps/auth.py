import jwt
from fastapi import Depends, HTTPException, Request
from jwt import PyJWKClient

from app.config import settings

_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = PyJWKClient(f"{settings.SUPABASE_URL}/auth/v1/.well-known/jwks.json")
    return _jwks_client


class Claims:
    def __init__(self, sub: str, email: str | None, raw: dict):
        self.sub = sub
        self.email = email
        self.raw = raw


def get_bearer_token(request: Request) -> str:
    auth = request.headers.get("authorization", "")
    if not auth.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    return auth.split(" ", 1)[1]


def verify_jwt(token: str = Depends(get_bearer_token)) -> Claims:
    """Verifies a Supabase-issued access token.

    Supabase projects can sign session tokens either with the legacy shared
    secret (HS256, `SUPABASE_JWT_SECRET`) or with newer asymmetric JWT Signing
    Keys (ES256/RS256, verified via the project's public JWKS endpoint) —
    which mode is active can change over a project's lifetime (e.g. after a
    key rotation), so this reads the `alg` from the token's own header and
    picks the matching verification path rather than hard-coding one.
    """
    try:
        header = jwt.get_unverified_header(token)
    except jwt.PyJWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token header: {e}")

    alg = header.get("alg", "HS256")

    try:
        if alg.startswith("HS"):
            payload = jwt.decode(
                token, settings.SUPABASE_JWT_SECRET, algorithms=[alg], audience="authenticated"
            )
        else:
            signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
            payload = jwt.decode(token, signing_key.key, algorithms=[alg], audience="authenticated")
    except jwt.PyJWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")

    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=401, detail="Token missing sub")
    return Claims(sub=sub, email=payload.get("email"), raw=payload)
