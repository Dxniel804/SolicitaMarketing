-- 0002_indexes.sql

create index if not exists idx_profiles_role on public.profiles(role);

create index if not exists idx_request_types_active on public.request_types(active);

create index if not exists idx_weekly_capacities_week_start on public.weekly_capacities(week_start);

-- "requests by requester" — solicitante's own list + RLS filter
create index if not exists idx_requests_requester_id on public.requests(requester_id);

-- "requests by status" — dashboard counts, queue filters, consume/closed checks
create index if not exists idx_requests_status on public.requests(status);

-- "requests in a given week" — the hottest lookup: capacity/occupancy recompute,
-- runs on every viability calc and every dashboard/calendar render.
create index if not exists idx_requests_delivery_week_start on public.requests(delivery_week_start);

-- composite for the actual occupancy query shape: WHERE delivery_week_start = :key AND status in (...)
create index if not exists idx_requests_week_status on public.requests(delivery_week_start, status);

create index if not exists idx_requests_type on public.requests(request_type_id);
create index if not exists idx_requests_confidential on public.requests(confidential) where confidential = true;

create index if not exists idx_request_files_request_id on public.request_files(request_id);
create index if not exists idx_request_comments_request_id on public.request_comments(request_id);
create index if not exists idx_status_history_request_id on public.status_history(request_id, created_at desc);
create index if not exists idx_effort_allocations_request_id on public.effort_allocations(request_id);
create index if not exists idx_effort_allocations_week_start on public.effort_allocations(week_start);
create index if not exists idx_holidays_date on public.holidays(date);
create index if not exists idx_email_logs_request_id on public.email_logs(request_id);
