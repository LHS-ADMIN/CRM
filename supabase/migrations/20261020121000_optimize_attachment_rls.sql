-- Optimize attachment RLS auth.uid() lookups without changing authorization semantics.

drop policy if exists attachments_parent_guard on public.attachments;
create policy attachments_parent_guard
on public.attachments
for insert
to authenticated
with check (
  bucket_id = 'crm-uploads'
  and split_part(object_path, '/', 1) = (select auth.uid())::text
  and case parent_type
    when 'support_ticket' then exists (
      select 1
      from public.support_tickets t
      where t.id = attachments.parent_id
        and (
          t.opened_by_user_id = (select auth.uid())
          or private.can_manage_ticket(t.id)
        )
    )
    when 'announcement' then exists (
      select 1
      from public.announcements a
      where a.id = attachments.parent_id
        and (
          a.created_by = (select auth.uid())
          or private.is_admin()
        )
    )
    when 'campaign' then private.can_manage_campaign(parent_id)
    else private.is_admin()
  end
);

drop policy if exists attachments_read on public.attachments;
create policy attachments_read
on public.attachments
for select
to authenticated
using (
  case parent_type
    when 'support_ticket' then private.can_access_ticket(parent_id)
    when 'announcement' then private.can_access_announcement(parent_id)
    when 'campaign' then private.can_access_campaign(parent_id)
    else (
      private.is_admin()
      or visibility = 'all'
      or (visibility = 'owner' and uploaded_by = (select auth.uid()))
      or (visibility = 'team' and private.can_access_team(team_id))
      or (visibility = 'leadership' and private.is_leadership())
    )
  end
);
