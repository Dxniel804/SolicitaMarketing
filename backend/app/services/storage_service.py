"""Supabase Storage helper — signed URL generation only.

This is one of only two legitimate uses of the service_role key in this app
(the other is scripts/seed_admin_users.py). By the time this function is
called, the caller (a router) has ALREADY verified — via RLS on
`request_files` plus the endpoint's own authorization check — that the
current user is allowed to see this request's files. Minting a short-lived
signed URL for a path we've already authorized is not "answering an
access-control question," so this does not reintroduce a bypass-RLS risk for
data access.
"""

from supabase import Client, create_client

from app.config import settings

_client: Client | None = None


def _get_client() -> Client:
    global _client
    if _client is None:
        _client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    return _client


def sign_url(path: str, expires_in: int | None = None) -> str:
    client = _get_client()
    ttl = expires_in or settings.SIGNED_URL_TTL_SECONDS
    result = client.storage.from_(settings.STORAGE_BUCKET).create_signed_url(path, ttl)
    return result["signedURL"] if "signedURL" in result else result.get("signed_url", "")
