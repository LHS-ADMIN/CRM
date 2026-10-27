
create table if not exists public.creator_login_invites (
  creator_id uuid primary key references public.creators(id) on delete cascade,
  invited_at timestamptz not null default now(),
  invited_by uuid null references auth.users(id) on delete set null
);

alter table public.creator_login_invites enable row level security;
revoke all on public.creator_login_invites from anon, authenticated;
grant all on public.creator_login_invites to service_role;

insert into public.creator_login_invites(creator_id)
values
  ('54733b97-f8a8-4a87-ac8b-871ecdfdbb76'),
  ('8a82e197-b090-4759-bc09-fe02e87aa827')
on conflict (creator_id) do nothing;
