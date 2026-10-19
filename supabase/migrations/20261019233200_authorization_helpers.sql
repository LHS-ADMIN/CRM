-- Authorization helper functions for LHS CRM.
create or replace function private.is_admin(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.profiles p on p.id = ur.user_id
    where ur.user_id = uid
      and ur.role = 'admin'
      and p.active = true
  );
$$;

create or replace function private.is_manager_for_team(target_team uuid, uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select private.is_admin(uid) or exists (
    select 1
    from public.team_memberships tm
    join public.profiles p on p.id = tm.user_id
    join public.user_roles ur on ur.user_id = tm.user_id and ur.role = 'manager'
    where tm.user_id = uid
      and tm.team_id = target_team
      and tm.active = true
      and p.active = true
  );
$$;

create or replace function private.is_creator_self(target_creator uuid, uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.creators c
    join public.profiles p on p.id = c.auth_user_id
    where c.id = target_creator
      and c.auth_user_id = uid
      and c.active = true
      and p.active = true
  );
$$;

revoke all on function private.is_admin(uuid) from public, anon;
revoke all on function private.is_manager_for_team(uuid, uuid) from public, anon;
revoke all on function private.is_creator_self(uuid, uuid) from public, anon;
grant execute on function private.is_admin(uuid) to authenticated, service_role;
grant execute on function private.is_manager_for_team(uuid, uuid) to authenticated, service_role;
grant execute on function private.is_creator_self(uuid, uuid) to authenticated, service_role;
