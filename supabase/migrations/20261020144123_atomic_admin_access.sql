-- Only the authenticated Admin Edge Functions may invoke these transactions.
create or replace function public.admin_update_access(
  p_actor_id uuid, p_user_id uuid, p_roles text[] default null, p_team_ids uuid[] default null
) returns void language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  if not private.is_admin(p_actor_id) then
    raise exception 'Admin role must be active' using errcode = '42501';
  end if;
  if p_roles is null and p_team_ids is null then
    raise exception 'No access change supplied' using errcode = '22023';
  end if;
  perform 1 from public.profiles where id = p_user_id for update;
  if not found then raise exception 'Account not found' using errcode = '22023'; end if;
  if p_roles is not null then
    if p_user_id = p_actor_id then
      raise exception 'Your own access cannot be changed here' using errcode = '42501';
    end if;
    if cardinality(p_roles) = 0 or exists (
      select 1 from unnest(p_roles) r where r is null or r not in ('creator','manager','admin')
    ) then raise exception 'At least one valid role is required' using errcode = '22023'; end if;
    delete from public.user_roles where user_id = p_user_id;
    insert into public.user_roles(user_id,role,assigned_by)
      select p_user_id,r,p_actor_id from (select distinct unnest(p_roles) r) roles;
    update public.profiles set active_role = case
      when 'admin' = any(p_roles) then 'admin'
      when 'manager' = any(p_roles) then 'manager' else 'creator' end
      where id = p_user_id;
  end if;
  if p_team_ids is not null then
    delete from public.team_memberships where user_id = p_user_id;
    insert into public.team_memberships(team_id,user_id,membership_role,active)
      select t,p_user_id,'manager',true from (select distinct unnest(p_team_ids) t) teams;
  end if;
end;
$$;
revoke all on function public.admin_update_access(uuid,uuid,text[],uuid[]) from public, anon, authenticated;
grant execute on function public.admin_update_access(uuid,uuid,text[],uuid[]) to service_role;

create or replace function public.admin_set_creator_active(p_actor_id uuid,p_creator_id uuid,p_active boolean)
returns void language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare linked_user uuid;
begin
  if not private.is_admin(p_actor_id) then
    raise exception 'Admin role must be active' using errcode = '42501';
  end if;
  if p_active is null then raise exception 'Active status is required' using errcode = '22023'; end if;
  select auth_user_id into linked_user from public.creators where id=p_creator_id for update;
  if not found then raise exception 'Creator not found' using errcode = '22023'; end if;
  if linked_user = p_actor_id and not p_active then
    raise exception 'Your own access cannot be changed here' using errcode = '42501';
  end if;
  update public.creators set active=p_active,status=case when p_active then 'active' else 'archived' end,
    archived_at=case when p_active then null else now() end,
    archived_by=case when p_active then null else p_actor_id end
    where id=p_creator_id;
  if linked_user is not null then
    update public.profiles set active=p_active where id=linked_user;
  end if;
end;
$$;
revoke all on function public.admin_set_creator_active(uuid,uuid,boolean) from public, anon, authenticated;
grant execute on function public.admin_set_creator_active(uuid,uuid,boolean) to service_role;
