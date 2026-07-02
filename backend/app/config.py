from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Postgres connection used by the app for normal traffic. Must NOT be a
    # BYPASSRLS/superuser role for request-scoped queries — connect as the
    # Supabase 'authenticator' role, which is allowed to `SET LOCAL ROLE
    # authenticated` per-transaction (see app/deps/db.py). Example:
    # postgresql+asyncpg://authenticator:<password>@<host>:5432/postgres
    DATABASE_URL: str = ""

    # Supabase project settings
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""  # only used by scripts/ and signed-URL generation
    SUPABASE_JWT_SECRET: str = ""

    # Resend (email) — optional. When unset, emails are logged but not sent.
    RESEND_API_KEY: str | None = None
    EMAIL_FROM: str = "Central de Marketing <marketing@vendamais.com.br>"

    # CORS
    FRONTEND_ORIGIN: str = "http://localhost:3000"

    STORAGE_BUCKET: str = "request-attachments"
    SIGNED_URL_TTL_SECONDS: int = 300


settings = Settings()
