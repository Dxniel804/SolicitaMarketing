"""One-off script to create the initial admin/gestor accounts in Supabase Auth.

This is one of only two legitimate uses of the service_role key in this app
(the other is signed-URL generation in storage_service.py) — it runs OUTSIDE
any request path, directly against Supabase's Auth admin API.

Usage:
    python scripts/seed_admin_users.py

Reads SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY from the environment (.env).
Edit the ACCOUNTS list below before running, then consider deleting/rotating
the printed temporary passwords.
"""

import os
import sys

from supabase import create_client

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings  # noqa: E402

ACCOUNTS = [
    {
        "email": "solicitamkt@vendamais.com.br",
        "password": "TROQUE-ESTA-SENHA-DEPOIS-DO-PRIMEIRO-LOGIN",
        "name": "Administrador de Marketing",
        "area": "Marketing",
        "role": "admin",
    },
    {
        "email": "diretoria@vendamais.com.br",
        "password": "TROQUE-ESTA-SENHA-DEPOIS-DO-PRIMEIRO-LOGIN",
        "name": "Diretoria",
        "area": "Diretoria",
        "role": "gestor",
    },
]


def main() -> None:
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise SystemExit("Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env antes de rodar este script.")

    client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

    for account in ACCOUNTS:
        result = client.auth.admin.create_user(
            {
                "email": account["email"],
                "password": account["password"],
                "email_confirm": True,
                "user_metadata": {
                    "name": account["name"],
                    "area": account["area"],
                    "role": account["role"],
                },
            }
        )
        print(f"Criado: {account['email']} (role={account['role']}) -> id={result.user.id}")

    print("\nPronto. O trigger handle_new_user() já criou a linha correspondente em public.profiles.")
    print("IMPORTANTE: troque as senhas acima assim que possível.")


if __name__ == "__main__":
    main()
