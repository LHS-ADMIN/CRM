-- First-login and deactivation protections apply at the database boundary.
revoke update(must_change_password,last_login_at) on public.profiles from authenticated;
do $block$
declare f record; t record;
begin
  for f in select p.oid,pg_get_functiondef(p.oid) as definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname in ('is_active_user','current_role','is_admin','has_role','is_creator_self','is_manager_for_team') loop
    execute replace(f.definition,'p.active = true','p.active = true and p.must_change_password = false');
  end loop;
  for t in select tablename from pg_tables where schemaname='public' and tablename not in ('profiles','user_roles') loop
    execute format('create policy launch_active_account_guard on public.%I as restrictive for all to authenticated using (private.is_active_user()) with check (private.is_active_user())',t.tablename);
  end loop;
end;
$block$;
-- Only Auth's password update can complete the mandatory password change.
create or replace function private.complete_auth_password_change()
returns trigger language plpgsql security definer set search_path = '' as $fn$
begin
  if old.encrypted_password is distinct from new.encrypted_password then
    update public.profiles set must_change_password=false where id=new.id and active;
    insert into public.audit_log(actor_user_id,actor_username,action,entity_type,entity_id,result)
      select id,login_username,'password_change','profiles',id::text,'success' from public.profiles where id=new.id;
  end if;
  return new;
end;
$fn$;
revoke all on function private.complete_auth_password_change() from public,anon,authenticated;
create trigger lhs_password_change_completed after update of encrypted_password on auth.users for each row execute function private.complete_auth_password_change();
create or replace function private.finish_password_change_impl()
returns void language plpgsql security definer set search_path = '' as $fn$
begin
  if not exists(select 1 from public.profiles where id=auth.uid() and active and not must_change_password) then
    raise exception 'Change your temporary password before continuing';
  end if;
end;
$fn$;
-- An attachment inherits its parent record's visibility; a broad file tag cannot expose a private ticket.
drop policy attachments_read on public.attachments;
create policy attachments_read on public.attachments for select to authenticated using (
  case parent_type
    when 'support_ticket' then private.can_access_ticket(parent_id)
    when 'announcement' then private.can_access_announcement(parent_id)
    when 'campaign' then private.can_access_campaign(parent_id)
    else private.is_admin() or visibility='all' or (visibility='owner' and uploaded_by=auth.uid()) or (visibility='team' and private.can_access_team(team_id)) or (visibility='leadership' and private.is_leadership())
  end
);
create policy attachments_parent_guard on public.attachments as restrictive for insert to authenticated with check (
  bucket_id='crm-uploads' and split_part(object_path,'/',1)=auth.uid()::text and
  case parent_type
    when 'support_ticket' then exists(select 1 from public.support_tickets t where t.id=parent_id and (t.opened_by_user_id=auth.uid() or private.can_manage_ticket(t.id)))
    when 'announcement' then exists(select 1 from public.announcements a where a.id=parent_id and (a.created_by=auth.uid() or private.is_admin()))
    when 'campaign' then private.can_manage_campaign(parent_id)
    else private.is_admin()
  end
);
