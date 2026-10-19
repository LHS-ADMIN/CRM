-- LHS CRM: core data model
-- Supabase project: uapqewolovgbbhemmphb
-- Non-destructive foundation migration.

create schema if not exists private;

-- The platform-installed RLS event trigger is useful, but its SECURITY DEFINER
-- function should not be callable through the Data API.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated, service_role;

-- Make new public functions opt-in rather than automatically executable.
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  login_username text not null,
  display_name text not null,
  avatar_url text,
  active boolean not null default true,
  must_change_password boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_login_username_format check (
    login_username = lower(login_username)
    and login_username ~ '^[a-z0-9][a-z0-9._-]{2,49}$'
  )
);
create unique index profiles_login_username_lower_uidx
  on public.profiles (lower(login_username));

create table public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('creator','manager','admin')),
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.team_memberships (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  membership_role text not null default 'manager'
    check (membership_role in ('manager','admin')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);
create index team_memberships_user_idx
  on public.team_memberships(user_id)
  where active;

create table public.import_log (
  id uuid primary key default gen_random_uuid(),
  import_type text not null,
  source_file_name text,
  source_file_id text,
  received_count integer not null default 0,
  matched_count integer not null default 0,
  unmatched_count integer not null default 0,
  created_count integer not null default 0,
  updated_count integer not null default 0,
  status text not null default 'processing'
    check (status in ('processing','completed','failed')),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.creators (
  id uuid primary key default gen_random_uuid(),
  agency_creator_id text not null unique,
  auth_user_id uuid unique references public.profiles(id) on delete set null,
  creator_name text not null,
  display_name text,
  tiktok_handle text,
  team_id uuid references public.teams(id) on delete set null,
  group_name text,
  creator_network_manager text,
  niche text,
  bio text check (bio is null or char_length(bio) <= 200),
  profile_photo_url text,
  status text not null default 'active'
    check (status in ('active','inactive','archived')),
  tier text,
  join_date date,
  graduation_status text,
  relationship_status text,
  invitation_type text,
  invited_by text,
  promote_permission text,
  backstage_notes text,
  management_relationship_dates text,
  renewed_management_relationship_dates text,
  source_imported_at timestamptz,
  source_import_file_name text,
  active boolean not null default true,
  archived_at timestamptz,
  archived_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index creators_team_idx on public.creators(team_id) where active;
create index creators_auth_user_idx on public.creators(auth_user_id) where active;
create index creators_tiktok_handle_lower_idx
  on public.creators(lower(tiktok_handle))
  where active and tiktok_handle is not null;

create table public.creator_private_contacts (
  creator_id uuid primary key references public.creators(id) on delete cascade,
  email text,
  phone text,
  address text,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.creator_notes (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  author_user_id uuid not null references public.profiles(id) on delete restrict,
  note_text text not null,
  active boolean not null default true,
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index creator_notes_creator_idx
  on public.creator_notes(creator_id, created_at desc);

create table public.metrics_current (
  creator_id uuid primary key references public.creators(id) on delete cascade,
  data_period text,
  tiktok_handle text,
  team_id uuid references public.teams(id) on delete set null,
  team_name text,
  diamonds bigint not null default 0,
  live_duration_seconds bigint not null default 0,
  live_duration_display text,
  live_days integer not null default 0,
  new_followers integer not null default 0,
  live_streams integer not null default 0,
  matches integer not null default 0,
  diamonds_from_matches bigint not null default 0,
  multi_guest_diamonds bigint not null default 0,
  rank text,
  graduation_status text,
  tier_status text,
  source_file_name text,
  source_file_id text,
  source_updated_at timestamptz,
  imported_at timestamptz not null default now(),
  import_id uuid references public.import_log(id) on delete set null
);
create index metrics_current_team_idx on public.metrics_current(team_id);

create table public.audit_log (
  id bigint generated always as identity primary key,
  event_time timestamptz not null default now(),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_username text,
  action text not null,
  entity_type text not null,
  entity_id text,
  result text not null default 'success'
    check (result in ('success','failure')),
  metadata jsonb not null default '{}'::jsonb
);
create index audit_log_time_idx on public.audit_log(event_time desc);
create index audit_log_actor_idx on public.audit_log(actor_user_id, event_time desc);

create table public.app_settings (
  key text primary key,
  value jsonb not null,
  description text,
  public_readable boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.app_settings(key, value, description, public_readable)
values
  ('schema_version', '"1.0.0"'::jsonb, 'Production Supabase schema version', true),
  ('time_zone', '"America/New_York"'::jsonb, 'Primary application timezone', true),
  ('battle_display_timezone', '"EST"'::jsonb, 'Battle calendar display timezone', true),
  ('allow_self_registration', 'false'::jsonb, 'Accounts are provisioned by LHS Admin only', true),
  ('metrics_storage_mode', '"CURRENT_ONLY"'::jsonb, 'New metric import replaces current creator metrics', true),
  ('battle_source_mode', '"GOOGLE_SHEETS_SYNC"'::jsonb, 'Battle calendar syncs from A/B League Sheets', true),
  ('battle_crm_editing', 'false'::jsonb, 'Battle records are read-only in CRM', true),
  ('battle_sheet_a_name', '"LHS A League Battleground 2026"'::jsonb, 'A League source label', true),
  ('battle_sheet_a_url', '"https://docs.google.com/spreadsheets/d/1aeRaVKJgQLcCQx3ZXogcnsfCrgBguFZTpVe-TUtJv3w/edit?usp=drivesdk"'::jsonb, 'A League source', false),
  ('battle_sheet_b_name', '"LHS B League Battleground 2026"'::jsonb, 'B League source label', true),
  ('battle_sheet_b_url', '"https://docs.google.com/spreadsheets/d/1MAvE8MazgSx83Dv1VYa8x_KVGRUDSZzTti922Ypx_F0/edit?usp=drivesdk"'::jsonb, 'B League source', false)
on conflict (key) do update
set value = excluded.value,
    description = excluded.description,
    public_readable = excluded.public_readable,
    updated_at = now();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger teams_set_updated_at
before update on public.teams
for each row execute function private.set_updated_at();

create trigger creators_set_updated_at
before update on public.creators
for each row execute function private.set_updated_at();

create trigger creator_private_contacts_set_updated_at
before update on public.creator_private_contacts
for each row execute function private.set_updated_at();

create trigger creator_notes_set_updated_at
before update on public.creator_notes
for each row execute function private.set_updated_at();

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.teams enable row level security;
alter table public.team_memberships enable row level security;
alter table public.import_log enable row level security;
alter table public.creators enable row level security;
alter table public.creator_private_contacts enable row level security;
alter table public.creator_notes enable row level security;
alter table public.metrics_current enable row level security;
alter table public.audit_log enable row level security;
alter table public.app_settings enable row level security;
