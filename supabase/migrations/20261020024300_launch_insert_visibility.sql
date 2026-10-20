-- Evaluate the candidate row directly so INSERT ... RETURNING is permitted.
-- The parent lookup helpers remain in use for child records and attachments.
alter policy campaigns_scoped_read on public.campaigns using (
  active and (
    (select private.is_admin())
    or (audience_type='network' and (select private.is_active_user()))
    or (audience_type='team' and team_id is not null and private.can_access_team(team_id))
    or (audience_type='targeted' and (created_by=(select auth.uid()) or private.can_access_campaign(id)))
  )
);
alter policy announcements_read on public.announcements using (
  active and starts_at<=now() and (ends_at is null or ends_at>=now()) and (
    (select private.is_admin())
    or (audience_type='network' and (select private.is_active_user()))
    or (audience_type='team' and team_id is not null and private.can_access_team(team_id))
    or (audience_type='leadership' and (select private.is_leadership()))
  )
);
alter policy support_tickets_read on public.support_tickets using (
  (select private.is_admin())
  or opened_by_user_id=(select auth.uid())
  or assigned_user_id=(select auth.uid())
  or (creator_id is not null and private.is_creator_self(creator_id))
  or (team_id is not null and private.is_manager_for_team(team_id))
);
