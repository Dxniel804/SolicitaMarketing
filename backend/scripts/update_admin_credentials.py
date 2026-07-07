"""One-off script to change the email and/or password of an existing
Supabase Auth account (e.g. the marketing admin login).

Same service_role caveats as seed_admin_users.py: this runs OUTSIDE any
request path, directly against Supabase's Auth admin API.

Usage:
    NEW_PASSWORD='<nova senha>' python scripts/update_admin_credentials.py <email_atual> <novo_email>

The new password comes from the NEW_PASSWORD env var so it never lands in
this file or in shell history inside the repo. Omit NEW_PASSWORD to change
only the email. The profiles row keeps the same id, so nothing else changes.
"""

import os
import sys

from supabase import create_client

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings  # noqa: E402


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("Uso: NEW_PASSWORD='...' python scripts/update_admin_credentials.py <email_atual> <novo_email>")
    current_email = sys.argv[1].strip().lower()
    new_email = sys.argv[2].strip().lower()
    new_password = os.environ.get("NEW_PASSWORD", "")

    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise SystemExit("Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env antes de rodar este script.")

    client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

    page = client.auth.admin.list_users(page=1, per_page=1000)
    users = page if isinstance(page, list) else getattr(page, "users", [])
    target = next((u for u in users if (u.email or "").lower() == current_email), None)
    if target is None:
        raise SystemExit(f"Nenhum usuário com email {current_email} encontrado.")

    attrs: dict = {"email": new_email}
    if new_password:
        attrs["password"] = new_password
    result = client.auth.admin.update_user_by_id(target.id, attrs)

    print(f"Atualizado: {current_email} -> {result.user.email} (id={result.user.id})")
    if new_password:
        print("Senha alterada.")


if __name__ == "__main__":
    main()
