-- 0003_rls_policies.sql
-- Enables RLS on every table and defines concrete policies per role.
--
-- IMPORTANT: for these policies to gate the backend's OWN queries (not just
-- PostgREST/direct client access), the backend must, per request/transaction:
--   select set_config('request.jwt.claims', '<json with sub + role=authenticated>', true);
--   SET LOCAL ROLE authenticated;
-- before running any query. See backend/app/deps/db.py.

alter table public.profiles enable row level security;
alter table public.request_types enable row level security;
alter table public.weekly_capacities enable row level security;
alter table public.requests enable row level security;
alter table public.request_files enable row level security;
alter table public.request_comments enable row level security;
alter table public.status_history enable row level security;
alter table public.effort_allocations enable row level security;
alter table public.holidays enable row level security;
alter table public.email_logs enable row level security;
alter table public.code_counters enable row level security;

-- ---------------------------------------------------------------------------
-- helper: resolve the current user's own role. SECURITY DEFINER so a
-- 'solicitante' session (which cannot read other people's profiles) can still
-- resolve ITS OWN role for use inside other tables' policies. This function
-- only ever returns the caller's own role (filtered by auth.uid()), so it does
-- not leak other users' roles.
-- ---------------------------------------------------------------------------
create or replace function public.current_role_name()
returns text
language sql stable security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin on public.profiles
  for select using (id = auth.uid() or public.current_role_name() in ('admin','gestor'));

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
-- inserts happen only via the security-definer handle_new_user() trigger (0006);
-- no insert policy needed/granted for the 'authenticated' role.

-- ---------------------------------------------------------------------------
-- request_types — everyone reads (needed for the live viability form), admin writes
-- ---------------------------------------------------------------------------
drop policy if exists request_types_select_all on public.request_types;
create policy request_types_select_all on public.request_types
  for select using (true);

drop policy if exists request_types_admin_write on public.request_types;
create policy request_types_admin_write on public.request_types
  for all using (public.current_role_name() = 'admin')
  with check (public.current_role_name() = 'admin');

-- ---------------------------------------------------------------------------
-- weekly_capacities — everyone reads, admin writes
-- ---------------------------------------------------------------------------
drop policy if exists weekly_capacities_select_all on public.weekly_capacities;
create policy weekly_capacities_select_all on public.weekly_capacities
  for select using (true);

drop policy if exists weekly_capacities_admin_write on public.weekly_capacities;
create policy weekly_capacities_admin_write on public.weekly_capacities
  for all using (public.current_role_name() = 'admin')
  with check (public.current_role_name() = 'admin');

-- ---------------------------------------------------------------------------
-- holidays — everyone reads, admin writes
-- ---------------------------------------------------------------------------
drop policy if exists holidays_select_all on public.holidays;
create policy holidays_select_all on public.holidays
  for select using (true);

drop policy if exists holidays_admin_write on public.holidays;
create policy holidays_admin_write on public.holidays
  for all using (public.current_role_name() = 'admin')
  with check (public.current_role_name() = 'admin');

-- ---------------------------------------------------------------------------
-- code_counters — no direct client access; any authenticated user creating a
-- request needs to bump the counter (server-side, inside the create-request
-- transaction). Gestor never creates requests, so excluded from the write check.
-- ---------------------------------------------------------------------------
drop policy if exists code_counters_rw on public.code_counters;
create policy code_counters_rw on public.code_counters
  for all using (public.current_role_name() in ('admin','solicitante'))
  with check (public.current_role_name() in ('admin','solicitante'));

-- ---------------------------------------------------------------------------
-- requests
-- ---------------------------------------------------------------------------

-- SELECT: admin/gestor see everything; solicitante sees own rows OR any
-- non-confidential row (needed for "fila geral resumida"). Column-level hiding
-- of briefing/attachments/internal fields for non-owned rows is enforced in
-- the API layer (Postgres RLS is row-level only, not column-level).
drop policy if exists requests_select on public.requests;
create policy requests_select on public.requests
  for select using (
    public.current_role_name() in ('admin','gestor')
    or requester_id = auth.uid()
    or confidential = false
  );

-- INSERT: solicitante can only insert rows for themselves; admin on behalf of anyone.
drop policy if exists requests_insert on public.requests;
create policy requests_insert on public.requests
  for insert with check (
    requester_id = auth.uid()
    or public.current_role_name() = 'admin'
  );

-- UPDATE: admin full; solicitante only their own request, and only while it's
-- still in a pre-triage status (protects against silent edits after approval).
drop policy if exists requests_update on public.requests;
create policy requests_update on public.requests
  for update using (
    public.current_role_name() = 'admin'
    or (requester_id = auth.uid() and status in ('Recebido','Aguardando briefing'))
  )
  with check (
    public.current_role_name() = 'admin'
    or (requester_id = auth.uid() and status in ('Recebido','Aguardando briefing'))
  );

-- DELETE: nobody. Soft-cancel via status='Cancelado' instead — no delete policy
-- means DELETE is denied by default under RLS.

-- ---------------------------------------------------------------------------
-- request_files — visible/insertable by the owner of the parent request, or admin.
-- gestor has no policy here => denied (attachments are never shown to gestor).
-- ---------------------------------------------------------------------------
drop policy if exists request_files_select on public.request_files;
create policy request_files_select on public.request_files
  for select using (
    public.current_role_name() = 'admin'
    or exists (select 1 from public.requests r where r.id = request_id and r.requester_id = auth.uid())
  );

drop policy if exists request_files_insert on public.request_files;
create policy request_files_insert on public.request_files
  for insert with check (
    public.current_role_name() = 'admin'
    or exists (select 1 from public.requests r where r.id = request_id and r.requester_id = auth.uid())
  );

drop policy if exists request_files_delete on public.request_files;
create policy request_files_delete on public.request_files
  for delete using (
    public.current_role_name() = 'admin'
    or exists (select 1 from public.requests r where r.id = request_id and r.requester_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- request_comments — internal comments hidden from requester and gestor
-- ---------------------------------------------------------------------------
drop policy if exists request_comments_select on public.request_comments;
create policy request_comments_select on public.request_comments
  for select using (
    public.current_role_name() = 'admin'
    or (
      is_internal = false
      and exists (select 1 from public.requests r where r.id = request_id and r.requester_id = auth.uid())
    )
  );

drop policy if exists request_comments_insert on public.request_comments;
create policy request_comments_insert on public.request_comments
  for insert with check (
    public.current_role_name() = 'admin'
    or (
      is_internal = false
      and exists (select 1 from public.requests r where r.id = request_id and r.requester_id = auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- status_history — audit log, visible to admin/gestor or the owner of the request
-- ---------------------------------------------------------------------------
drop policy if exists status_history_select on public.status_history;
create policy status_history_select on public.status_history
  for select using (
    public.current_role_name() in ('admin','gestor')
    or exists (select 1 from public.requests r where r.id = request_id and r.requester_id = auth.uid())
  );

drop policy if exists status_history_insert on public.status_history;
create policy status_history_insert on public.status_history
  for insert with check (
    public.current_role_name() = 'admin'
    or exists (select 1 from public.requests r where r.id = request_id and r.requester_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- effort_allocations — admin-managed feature, gestor read-only
-- ---------------------------------------------------------------------------
drop policy if exists effort_allocations_admin_all on public.effort_allocations;
create policy effort_allocations_admin_all on public.effort_allocations
  for all using (public.current_role_name() = 'admin')
  with check (public.current_role_name() = 'admin');

drop policy if exists effort_allocations_gestor_read on public.effort_allocations;
create policy effort_allocations_gestor_read on public.effort_allocations
  for select using (public.current_role_name() = 'gestor');

-- ---------------------------------------------------------------------------
-- email_logs — admin-only screen ("Notificações"); inserts allowed for admin
-- or the solicitante whose own submit/action triggered the email.
-- ---------------------------------------------------------------------------
drop policy if exists email_logs_admin_read on public.email_logs;
create policy email_logs_admin_read on public.email_logs
  for select using (public.current_role_name() = 'admin');

drop policy if exists email_logs_insert on public.email_logs;
create policy email_logs_insert on public.email_logs
  for insert with check (public.current_role_name() in ('admin','solicitante'));
