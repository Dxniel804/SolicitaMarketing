-- 0006_profiles_trigger.sql
-- Auto-creates a public.profiles row whenever Supabase Auth creates a new
-- auth.users row (magic-link solicitante signup, or admin/gestor accounts
-- created via scripts/seed_admin_users.py). SECURITY DEFINER so it can write
-- to public.profiles regardless of the invoking session's RLS.
--
-- name/area come from the auth call's user metadata, e.g.:
--   supabase.auth.signInWithOtp({ email, options: { data: { name, area } } })

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, area, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'area', ''),
    coalesce(new.raw_user_meta_data->>'role', 'solicitante')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
