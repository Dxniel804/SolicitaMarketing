"""RLS-impersonation DB session dependency.

The single most architecturally sensitive piece of the backend: it makes
Supabase's row-level security policies (which key off `auth.uid()`/`auth.role()`)
actually gate the FastAPI app's own queries, even though FastAPI talks to
Postgres directly via SQLAlchemy/asyncpg instead of going through PostgREST.

How: per request, inside a single transaction, we run the same two settings
PostgREST itself sets before executing a query on behalf of an authenticated
user:
    select set_config('request.jwt.claims', '<json>', true);  -- transaction-local
    SET LOCAL ROLE authenticated;                              -- transaction-local

Both are scoped with `is_local=true` / `LOCAL`, so they automatically reset at
COMMIT/ROLLBACK — this is critical because connections are reused from a pool,
so nothing here can leak from one request into an unrelated later request.

The connecting DB login must be a role that is NOT BYPASSRLS/superuser (never
`postgres` or `service_role`) — see supabase/migrations/0008_app_role.sql,
which creates a dedicated `app_backend` login role granted membership in
`authenticated` specifically so it can `SET ROLE authenticated` per
transaction, the same way PostgREST's own `authenticator` role does
internally. Connecting as `postgres`/`service_role` would make every RLS
policy silently inert for the app's own queries.
"""

import json
from collections.abc import AsyncGenerator

from fastapi import Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.deps.auth import Claims, verify_jwt

engine = create_async_engine(settings.DATABASE_URL, pool_pre_ping=True) if settings.DATABASE_URL else None
SessionLocal = async_sessionmaker(engine, expire_on_commit=False) if engine else None


async def get_db(claims: Claims = Depends(verify_jwt)) -> AsyncGenerator[AsyncSession, None]:
    if SessionLocal is None:
        raise HTTPException(status_code=500, detail="DATABASE_URL is not configured")

    async with SessionLocal() as session:
        async with session.begin():
            claims_json = json.dumps({"sub": claims.sub, "role": "authenticated", "email": claims.email})
            await session.execute(
                text("select set_config('request.jwt.claims', :claims, true)"),
                {"claims": claims_json},
            )
            await session.execute(text("SET LOCAL ROLE authenticated"))
            yield session
