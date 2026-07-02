-- 0005_seed_weekly_capacities.sql
-- Seeds the default weekly capacity (20 points, not blocked) for the current
-- week plus the next 25 weeks (~6 months), so the app has usable capacity
-- data from day one. The admin can edit any of these later in Settings.
-- Idempotent: week_start is unique, ON CONFLICT DO NOTHING.

insert into public.weekly_capacities (week_start, week_end, capacity_points, is_blocked, notes)
select
  monday,
  monday + 4,
  20,
  false,
  null
from (
  select (date_trunc('week', current_date)::date + (n * 7)) as monday
  from generate_series(0, 25) as n
) weeks
on conflict (week_start) do nothing;
