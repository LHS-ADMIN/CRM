alter table public.notifications
  add column if not exists source_type text,
  add column if not exists source_id uuid,
  add column if not exists dedupe_key text;

create unique index if not exists notifications_dedupe_key_uidx
  on public.notifications(dedupe_key)
  where dedupe_key is not null;

drop policy if exists launch_active_account_guard on public.notifications;
drop policy if exists notifications_own_read on public.notifications;
drop policy if exists notifications_own_update on public.notifications;

create policy notifications_own_read
on public.notifications
for select
to authenticated
using (user_id = (select auth.uid()) and private.is_active_user());

create policy notifications_own_update
on public.notifications
for update
to authenticated
using (user_id = (select auth.uid()) and private.is_active_user())
with check (user_id = (select auth.uid()) and private.is_active_user());

revoke all on public.notifications from authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

create or replace function private.create_announcement_notifications()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  if new.active is not true then
    return new;
  end if;

  if new.audience_type = 'network' then
    insert into public.notifications(
      user_id, announcement_id, notification_type, title, body,
      action_url, source_type, source_id, dedupe_key
    )
    select
      p.id, new.id, 'announcement', new.title, new.body,
      '/portal/announcements', 'announcement', new.id,
      'announcement:' || new.id::text || ':' || p.id::text
    from public.profiles p
    where p.active = true
    on conflict do nothing;

  elsif new.audience_type = 'team' then
    insert into public.notifications(
      user_id, announcement_id, notification_type, title, body,
      action_url, source_type, source_id, dedupe_key
    )
    select distinct
      x.user_id, new.id, 'announcement', new.title, new.body,
      '/portal/announcements', 'announcement', new.id,
      'announcement:' || new.id::text || ':' || x.user_id::text
    from (
      select tm.user_id
      from public.team_memberships tm
      where tm.team_id = new.team_id and tm.active = true
      union
      select c.auth_user_id
      from public.creators c
      where c.team_id = new.team_id and c.active = true and c.auth_user_id is not null
    ) x
    join public.profiles p on p.id = x.user_id and p.active = true
    on conflict do nothing;

  elsif new.audience_type = 'leadership' then
    insert into public.notifications(
      user_id, announcement_id, notification_type, title, body,
      action_url, source_type, source_id, dedupe_key
    )
    select distinct
      ur.user_id, new.id, 'announcement', new.title, new.body,
      '/portal/announcements', 'announcement', new.id,
      'announcement:' || new.id::text || ':' || ur.user_id::text
    from public.user_roles ur
    join public.profiles p on p.id = ur.user_id and p.active = true
    where ur.role in ('manager','admin')
    on conflict do nothing;
  end if;

  return new;
end;
$function$;

create or replace function private.create_campaign_notifications()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  if new.active is not true or lower(coalesce(new.status,'')) = 'draft' then
    return new;
  end if;

  if new.audience_type = 'network' then
    insert into public.notifications(
      user_id, notification_type, title, body, action_url,
      source_type, source_id, dedupe_key
    )
    select
      p.id,
      'campaign',
      'New campaign: ' || new.title,
      coalesce(new.description, 'A new LHS campaign is available.'),
      '/portal/campaigns',
      'campaign',
      new.id,
      'campaign:' || new.id::text || ':' || p.id::text
    from public.profiles p
    where p.active = true
    on conflict do nothing;

  elsif new.audience_type = 'team' then
    insert into public.notifications(
      user_id, notification_type, title, body, action_url,
      source_type, source_id, dedupe_key
    )
    select distinct
      x.user_id,
      'campaign',
      'New campaign: ' || new.title,
      coalesce(new.description, 'A new LHS campaign is available.'),
      '/portal/campaigns',
      'campaign',
      new.id,
      'campaign:' || new.id::text || ':' || x.user_id::text
    from (
      select tm.user_id
      from public.team_memberships tm
      where tm.team_id = new.team_id and tm.active = true
      union
      select c.auth_user_id
      from public.creators c
      where c.team_id = new.team_id and c.active = true and c.auth_user_id is not null
    ) x
    join public.profiles p on p.id = x.user_id and p.active = true
    on conflict do nothing;
  end if;

  return new;
end;
$function$;

drop trigger if exists campaigns_create_notifications on public.campaigns;
create trigger campaigns_create_notifications
after insert on public.campaigns
for each row execute function private.create_campaign_notifications();

create or replace function private.create_campaign_target_notification()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  campaign_row public.campaigns%rowtype;
  recipient uuid;
begin
  select * into campaign_row
  from public.campaigns c
  where c.id = new.campaign_id;

  if campaign_row.id is null
     or campaign_row.active is not true
     or lower(coalesce(campaign_row.status,'')) = 'draft'
     or campaign_row.audience_type <> 'targeted' then
    return new;
  end if;

  select c.auth_user_id into recipient
  from public.creators c
  join public.profiles p on p.id = c.auth_user_id and p.active = true
  where c.id = new.creator_id
    and c.active = true
    and c.auth_user_id is not null;

  if recipient is not null then
    insert into public.notifications(
      user_id, notification_type, title, body, action_url,
      source_type, source_id, dedupe_key
    )
    values(
      recipient,
      'campaign',
      'New campaign: ' || campaign_row.title,
      coalesce(campaign_row.description, 'A new LHS campaign is available.'),
      '/portal/campaigns',
      'campaign',
      campaign_row.id,
      'campaign:' || campaign_row.id::text || ':' || recipient::text
    )
    on conflict do nothing;
  end if;

  return new;
end;
$function$;

drop trigger if exists campaign_targets_create_notification on public.campaign_targets;
create trigger campaign_targets_create_notification
after insert on public.campaign_targets
for each row execute function private.create_campaign_target_notification();

create or replace function private.create_due_battle_notifications()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  inserted_count integer := 0;
  step_count integer := 0;
begin
  insert into public.notifications(
    user_id, notification_type, title, body, action_url,
    source_type, source_id, dedupe_key
  )
  select
    c.auth_user_id,
    'battle_tomorrow',
    'Battle tomorrow: ' ||
      case when coalesce(b.creator_handle,'') = '' then 'LHS Creator'
           when left(b.creator_handle,1)='@' then b.creator_handle
           else '@' || b.creator_handle end ||
      ' vs ' || coalesce(b.opponent_name,'TBD'),
    'Your battle is tomorrow at ' || b.time_est ||
      '. Open Battle Central for the latest schedule.',
    '/portal/battles?month=' || to_char(b.battle_date,'YYYY-MM') ||
      '&day=' || to_char(b.battle_date,'YYYY-MM-DD') || '#schedule-detail',
    'battle',
    b.id,
    'battle_day:' || b.id::text || ':' || b.battle_date::text || ':' || c.auth_user_id::text
  from public.battles b
  join public.creators c on c.id = b.creator_id
    and c.active = true
    and c.auth_user_id is not null
  join public.profiles p on p.id = c.auth_user_id and p.active = true
  where b.battle_date = (timezone('America/New_York', now())::date + 1)
    and lower(coalesce(b.status,'')) not in ('cancelled','canceled')
  on conflict do nothing;

  get diagnostics step_count = row_count;
  inserted_count := inserted_count + step_count;

  insert into public.notifications(
    user_id, notification_type, title, body, action_url,
    source_type, source_id, dedupe_key
  )
  select
    c.auth_user_id,
    'battle_hour',
    'Battle in about 1 hour: ' ||
      case when coalesce(b.creator_handle,'') = '' then 'LHS Creator'
           when left(b.creator_handle,1)='@' then b.creator_handle
           else '@' || b.creator_handle end ||
      ' vs ' || coalesce(b.opponent_name,'TBD'),
    'Your battle starts at ' || b.time_est ||
      '. Open Battle Central now to confirm the latest details.',
    '/portal/battles?month=' || to_char(b.battle_date,'YYYY-MM') ||
      '&day=' || to_char(b.battle_date,'YYYY-MM-DD') || '#schedule-detail',
    'battle',
    b.id,
    'battle_hour:' || b.id::text || ':' || b.battle_date::text || ':' ||
      coalesce(b.time_sort::text,'') || ':' || c.auth_user_id::text
  from public.battles b
  join public.creators c on c.id = b.creator_id
    and c.active = true
    and c.auth_user_id is not null
  join public.profiles p on p.id = c.auth_user_id and p.active = true
  where b.time_sort is not null
    and lower(coalesce(b.status,'')) not in ('cancelled','canceled')
    and ((b.battle_date::timestamp + b.time_sort) at time zone 'America/New_York')
        >= now() + interval '50 minutes'
    and ((b.battle_date::timestamp + b.time_sort) at time zone 'America/New_York')
        < now() + interval '70 minutes'
  on conflict do nothing;

  get diagnostics step_count = row_count;
  inserted_count := inserted_count + step_count;

  return inserted_count;
end;
$function$;

create extension if not exists pg_cron with schema pg_catalog;

do $block$
declare
  existing_job bigint;
begin
  select jobid into existing_job
  from cron.job
  where jobname = 'lhs-battle-reminder-notifications'
  limit 1;

  if existing_job is not null then
    perform cron.unschedule(existing_job);
  end if;

  perform cron.schedule(
    'lhs-battle-reminder-notifications',
    '*/5 * * * *',
    'select private.create_due_battle_notifications();'
  );
end;
$block$;