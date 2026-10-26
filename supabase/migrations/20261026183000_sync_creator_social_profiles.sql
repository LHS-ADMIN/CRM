-- Keep linked creator social profiles synchronized with account profile changes.
create or replace function private.sync_linked_creator_public_profile()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  update public.creators
  set display_name=coalesce(nullif(btrim(new.display_name),''),display_name),
      profile_photo_url=new.avatar_url,
      updated_at=now()
  where auth_user_id=new.id;
  return new;
end;
$function$;

drop trigger if exists profiles_sync_linked_creator on public.profiles;
create trigger profiles_sync_linked_creator
after update of display_name,avatar_url
on public.profiles
for each row execute function private.sync_linked_creator_public_profile();

-- Production repair: link Mia's existing LHS account to her permanent Creator ID.
update public.creators c
set auth_user_id=p.id,
    display_name=coalesce(nullif(c.display_name,''),p.display_name),
    profile_photo_url=coalesce(p.avatar_url,c.profile_photo_url),
    updated_at=now()
from public.profiles p
where c.agency_creator_id='7475365987928408081'
  and p.login_username='mia_i_garcia'
  and (c.auth_user_id is null or c.auth_user_id=p.id);

-- Backfill currently linked creator social fields.
update public.creators c
set display_name=coalesce(nullif(btrim(p.display_name),''),c.display_name),
    profile_photo_url=p.avatar_url,
    updated_at=now()
from public.profiles p
where c.auth_user_id=p.id;
