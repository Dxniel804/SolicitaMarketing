-- 0008_app_role.sql
-- Dedicated Postgres login role for the FastAPI backend.
--
-- Supabase's internal `authenticator` role (the one PostgREST itself connects
-- as) does not have a password exposed anywhere in the Dashboard, so the
-- backend cannot connect as that role directly. Instead we create our own
-- login role that is granted membership in `authenticated` — per request,
-- the backend runs `SET LOCAL ROLE authenticated` (see backend/app/deps/db.py)
-- to assume the authenticated role's table grants + RLS visibility for the
-- duration of that transaction, exactly like PostgREST does internally.
--
-- IMPORTANT: never use the `postgres` or `service_role` connection string for
-- DATABASE_URL — both bypass RLS entirely (BYPASSRLS), which would make every
-- RLS policy in 0003_rls_policies.sql silently inert for the app's own
-- queries.
--
-- Run this once in the Supabase SQL editor, replacing the password below,
-- then use that same password in backend/.env's DATABASE_URL.

create role app_backend with login password 'TROQUE-ESTA-SENHA-POR-UMA-FORTE';

grant authenticated to app_backend;
grant usage on schema public to app_backend;
