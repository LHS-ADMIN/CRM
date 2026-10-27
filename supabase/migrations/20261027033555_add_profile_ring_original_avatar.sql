alter table public.profiles
add column if not exists avatar_original_url text;

comment on column public.profiles.avatar_original_url is
'Original creator-uploaded profile photo retained for LHS profile-ring regeneration. Public avatar_url stores the generated ringed version.';
