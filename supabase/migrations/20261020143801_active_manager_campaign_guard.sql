-- Role assignments allow switching roles; they must not stack authorizations.
alter policy campaigns_insert on public.campaigns with check (
  private.is_admin()
  or (
    created_by = (select auth.uid())
    and private.current_role() = 'manager'
    and private.has_role('manager')
    and (
      (audience_type = 'team' and team_id is not null and private.is_manager_for_team(team_id))
      or audience_type = 'targeted'
    )
  )
);
