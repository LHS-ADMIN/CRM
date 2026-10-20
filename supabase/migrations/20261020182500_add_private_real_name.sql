alter table public.profile_details
  add column if not exists real_name text;

alter table public.profile_details
  drop constraint if exists profile_details_real_name_length;

alter table public.profile_details
  add constraint profile_details_real_name_length
  check (real_name is null or char_length(real_name) <= 150);
