create or replace function private.moderate_community_impl(
  p_kind text,
  p_id uuid,
  p_hidden boolean
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  actor uuid := auth.uid();
  parent_id uuid;
  author_id uuid;
begin
  if not private.is_active_user(actor) or p_hidden is null then
    raise exception 'Active account required' using errcode='42501';
  end if;

  if not p_hidden and not private.is_admin(actor) then
    raise exception 'Only Admin can restore hidden content' using errcode='42501';
  end if;

  if p_kind='post' then
    if not private.can_access_post(p_id,actor)
       or not private.can_moderate_post(p_id,actor) then
      raise exception 'Post not found or moderation denied' using errcode='42501';
    end if;

    update public.community_posts
    set active=not p_hidden,
        hidden_by=case when p_hidden then actor else null end,
        hidden_at=case when p_hidden then now() else null end
    where id=p_id;

  elsif p_kind='reply' then
    select post_id,author_user_id
    into parent_id,author_id
    from public.community_replies
    where id=p_id;

    if not found
       or not private.can_access_post(parent_id,actor)
       or not (
         private.is_admin(actor)
         or author_id=actor
         or exists (
           select 1
           from public.community_posts p
           where p.id=parent_id
             and p.channel_type='team'
             and p.team_id is not null
             and private.is_manager_for_team(p.team_id,actor)
         )
       ) then
      raise exception 'Reply not found or moderation denied' using errcode='42501';
    end if;

    update public.community_replies
    set active=not p_hidden,
        hidden_by=case when p_hidden then actor else null end,
        hidden_at=case when p_hidden then now() else null end
    where id=p_id;
  else
    raise exception 'Unknown content type' using errcode='22023';
  end if;
end;
$function$;

revoke all on function private.moderate_community_impl(text,uuid,boolean)
from public, anon, authenticated;
grant execute on function private.moderate_community_impl(text,uuid,boolean)
to authenticated, service_role;

create or replace function public.moderate_community(
  p_kind text,
  p_id uuid,
  p_hidden boolean
)
returns void
language sql
security invoker
set search_path = pg_catalog, private
as $function$
  select private.moderate_community_impl(p_kind,p_id,p_hidden);
$function$;

revoke all on function public.moderate_community(text,uuid,boolean)
from public, anon;
grant execute on function public.moderate_community(text,uuid,boolean)
to authenticated, service_role;
