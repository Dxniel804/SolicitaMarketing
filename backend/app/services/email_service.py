"""Email sending contract.

Always writes exactly one row to email_logs, regardless of outcome. Never
raises — callers (triage actions, submit flow) must not fail the primary DB
transaction just because email sending had a problem.

Without RESEND_API_KEY configured (current state — the user will add it
later): skips the network call entirely, logs status='pending_no_api_key'.
No feature flag, no retry queue — just a guard. The app is fully functional
end to end without ever configuring Resend; once the key is set, the exact
same code path starts actually sending, with no other changes required.
"""

from dataclasses import dataclass

import httpx
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings

RESEND_API_URL = "https://api.resend.com/emails"


@dataclass
class EmailResult:
    status: str  # 'sent' | 'failed' | 'pending_no_api_key'
    error: str | None = None


async def _send_via_resend(recipient: str, subject: str, body: str) -> None:
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            RESEND_API_URL,
            headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
            json={
                "from": settings.EMAIL_FROM,
                "to": [recipient],
                "subject": subject,
                "text": body,
            },
        )
        resp.raise_for_status()


async def send_email(
    db: AsyncSession,
    *,
    request_id: str | None,
    email_type: str,
    recipient: str,
    subject: str,
    body: str,
) -> EmailResult:
    if not settings.RESEND_API_KEY:
        result = EmailResult(status="pending_no_api_key")
    else:
        try:
            await _send_via_resend(recipient, subject, body)
            result = EmailResult(status="sent")
        except Exception as e:  # noqa: BLE001 - never let email failures break the caller
            result = EmailResult(status="failed", error=str(e))

    await db.execute(
        text(
            """insert into public.email_logs (request_id, email_type, recipient, subject, body, status)
               values (:request_id, :email_type, :recipient, :subject, :body, :status)"""
        ),
        {
            "request_id": request_id,
            "email_type": email_type,
            "recipient": recipient,
            "subject": subject,
            "body": body,
            "status": result.status,
        },
    )
    return result
