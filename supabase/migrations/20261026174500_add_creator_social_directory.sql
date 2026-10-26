create table if not exists public.creator_directory (
  creator_id uuid primary key references public.creators(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  display_name text not null,
  tiktok_handle text,
  avatar_url text,
  niche text,
  bio text,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create index if not exists creator_directory_user_idx on public.creator_directory(user_id);
create index if not exists creator_directory_name_idx on public.creator_directory(lower(display_name));
create index if not exists creator_directory_handle_idx on public.creator_directory(lower(tiktok_handle));

alter table public.creator_directory enable row level security;

revoke all on public.creator_directory from anon;
revoke insert, update, delete, truncate, references, trigger on public.creator_directory from authenticated;
grant select on public.creator_directory to authenticated;
grant all on public.creator_directory to service_role;

drop policy if exists creator_directory_active_read on public.creator_directory;
create policy creator_directory_active_read
on public.creator_directory
for select
to authenticated
using (active = true and private.is_active_user());

drop policy if exists launch_active_account_guard on public.creator_directory;
create policy launch_active_account_guard
on public.creator_directory
as restrictive
for all
to authenticated
using (private.is_active_user())
with check (private.is_active_user());

create or replace function private.sync_creator_directory()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  if tg_op = 'DELETE' then
    delete from public.creator_directory where creator_id = old.id;
    return old;
  end if;

  insert into public.creator_directory(
    creator_id,user_id,display_name,tiktok_handle,avatar_url,niche,bio,active,updated_at
  )
  values(
    new.id,
    new.auth_user_id,
    coalesce(nullif(btrim(new.display_name),''),new.creator_name),
    new.tiktok_handle,
    new.profile_photo_url,
    new.niche,
    new.bio,
    new.active,
    now()
  )
  on conflict (creator_id) do update set
    user_id = excluded.user_id,
    display_name = excluded.display_name,
    tiktok_handle = excluded.tiktok_handle,
    avatar_url = excluded.avatar_url,
    niche = excluded.niche,
    bio = excluded.bio,
    active = excluded.active,
    updated_at = now();

  return new;
end;
$function$;

drop trigger if exists creators_sync_directory on public.creators;
create trigger creators_sync_directory
after insert or delete or update of auth_user_id,creator_name,display_name,tiktok_handle,profile_photo_url,niche,bio,active
on public.creators
for each row execute function private.sync_creator_directory();

insert into public.creator_directory(
  creator_id,user_id,display_name,tiktok_handle,avatar_url,niche,bio,active,updated_at
)
select
  c.id,
  c.auth_user_id,
  coalesce(nullif(btrim(c.display_name),''),c.creator_name),
  c.tiktok_handle,
  c.profile_photo_url,
  c.niche,
  c.bio,
  c.active,
  now()
from public.creators c
on conflict (creator_id) do update set
  user_id = excluded.user_id,
  display_name = excluded.display_name,
  tiktok_handle = excluded.tiktok_handle,
  avatar_url = excluded.avatar_url,
  niche = excluded.niche,
  bio = excluded.bio,
  active = excluded.active,
  updated_at = now();
