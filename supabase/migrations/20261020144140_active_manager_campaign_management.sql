-- Apply the same active-role boundary to existing campaigns and their children.
create or replace function private.can_manage_campaign(target_campaign uuid, uid uuid default auth.uid())
returns boolean language sql stable security definer
set search_path = pg_catalog, public
as $$
  select private.is_admin(uid) or exists (
    select 1 from public.campaigns c
    where c.id = target_campaign and c.created_by = uid
      and private.current_role(uid) = 'manager'
      and private.has_role('manager', uid)
      and (
        (c.audience_type = 'team' and c.team_id is not null and private.is_manager_for_team(c.team_id, uid))
        or c.audience_type = 'targeted'
      )
  );
$$;
