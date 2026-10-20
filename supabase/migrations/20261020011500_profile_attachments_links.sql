-- Expand profile, announcement, support, and attachment capabilities.

alter table public.announcements
  add column if not exists external_url text;

alter table public.support_tickets
  add column if not exists description text,
  add column if not exists external_url text;

create table if not exists public.profile_details (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  email text,
  phone text,
  address text,
  birthday date,
  bio text check (bio is null or char_length(bio) <= 200),
  niche text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profile_details enable row level security;

drop policy if exists profile_details_read on public.profile_details;
create policy profile_details_read
on public.profile_details for select
to authenticated
using (user_id = (select auth.uid()) or private.is_admin());

drop policy if exists profile_details_insert on public.profile_details;
create policy profile_details_insert
on public.profile_details for insert
to authenticated
with check (user_id = (select auth.uid()) or private.is_admin());

drop policy if exists profile_details_update on public.profile_details;
create policy profile_details_update
on public.profile_details for update
to authenticated
using (user_id = (select auth.uid()) or private.is_admin())
with check (user_id = (select auth.uid()) or private.is_admin());

grant select, insert, update on public.profile_details to authenticated;
grant select, insert, update on public.announcements to authenticated;
grant select, insert, update on public.support_tickets to authenticated;

drop trigger if exists profile_details_set_updated_at on public.profile_details;
create trigger profile_details_set_updated_at
before update on public.profile_details
for each row execute function private.set_updated_at();

drop policy if exists attachments_read on public.attachments;
create policy attachments_read
on public.attachments for select
to authenticated
using (
  private.is_admin()
  or visibility = 'all'
  or (visibility = 'owner' and uploaded_by = (select auth.uid()))
  or (visibility = 'owner' and creator_id is not null and private.is_creator_self(creator_id))
  or (visibility = 'team' and team_id is not null and private.can_access_team(team_id))
  or (visibility = 'leadership' and private.is_leadership())
  or (parent_type = 'support_ticket' and private.can_access_ticket(parent_id))
  or (parent_type = 'announcement' and private.can_access_announcement(parent_id))
);
