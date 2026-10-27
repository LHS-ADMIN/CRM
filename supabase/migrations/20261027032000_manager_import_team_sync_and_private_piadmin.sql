alter table public.teams
  add column if not exists source_manager_email text;

create unique index if not exists teams_source_manager_email_unique
  on public.teams (lower(btrim(source_manager_email)))
  where source_manager_email is not null;

update public.teams set source_manager_email='miaigarcia01@gmail.com' where slug='mia-garcia';
update public.teams set source_manager_email='tennille.branch@lhs-usa.org' where slug='tennille-branch';
update public.teams set source_manager_email='nmallen19@outlook.com' where slug='nm-allen';
update public.teams set source_manager_email='bigzay292.lhs@gmail.com' where slug='big-zay';

create or replace function public.commit_creators_import(
  p_rows jsonb,
  p_import_id uuid,
  p_actor_id uuid,
  p_invalid integer default 0
)
returns void
language plpgsql
set search_path to ''
as $function$
declare
  log_row public.import_log;
  row_count integer;
  created_rows integer := 0;
  unmapped_manager_rows integer := 0;
begin
  if jsonb_typeof(p_rows) is distinct from 'array'
     or jsonb_array_length(p_rows) = 0
     or jsonb_array_length(p_rows) > 10000 then
    raise exception 'Import must contain 1-10000 valid rows';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(728418, 2);

  select * into log_row
  from public.import_log
  where id=p_import_id and created_by=p_actor_id and status='processing'
  for update;

  if not found
     or not exists (
       select 1
       from public.profiles p
       join public.user_roles r on r.user_id=p.id and r.role='admin'
       where p.id=p_actor_id and p.active and p.active_role='admin'
     ) then
    raise exception 'Active Admin import required';
  end if;

  if log_row.import_type <> 'manage_creators' then
    raise exception 'Import type mismatch';
  end if;

  if exists (
       select 1
       from jsonb_array_elements(p_rows) x
       where nullif(btrim(x->>'agency_creator_id'),'') is null
     )
     or (
       select count(distinct lower(x->>'agency_creator_id'))
       from jsonb_array_elements(p_rows) x
     ) <> jsonb_array_length(p_rows) then
    raise exception 'Missing or duplicate creator IDs';
  end if;

  select count(*) into created_rows
  from jsonb_array_elements(p_rows) x
  where not exists (
    select 1 from public.creators c
    where c.agency_creator_id=x->>'agency_creator_id'
  );

  if exists (
    select 1
    from jsonb_array_elements(p_rows) x
    join public.creators c
      on lower(c.agency_creator_id)=lower(x->>'agency_creator_id')
     and c.agency_creator_id<>x->>'agency_creator_id'
  ) then
    raise exception 'Creator ID case mismatch';
  end if;

  insert into public.creators (
    agency_creator_id,creator_name,tiktok_handle,group_name,creator_network_manager,
    graduation_status,relationship_status,invitation_type,invited_by,promote_permission,
    backstage_notes,management_relationship_dates,renewed_management_relationship_dates,
    source_imported_at,source_import_file_name,status,active
  )
  select
    r.agency_creator_id,r.creator_name,r.tiktok_handle,r.group_name,r.creator_network_manager,
    r.graduation_status,r.relationship_status,r.invitation_type,r.invited_by,r.promote_permission,
    r.backstage_notes,r.management_relationship_dates,r.renewed_management_relationship_dates,
    r.source_imported_at,r.source_import_file_name,
    coalesce(r.status,'active'),
    coalesce(r.active,true)
  from jsonb_populate_recordset(null::public.creators,p_rows) r
  on conflict (agency_creator_id) do update set
    creator_name=excluded.creator_name,
    tiktok_handle=excluded.tiktok_handle,
    group_name=excluded.group_name,
    creator_network_manager=excluded.creator_network_manager,
    graduation_status=excluded.graduation_status,
    relationship_status=excluded.relationship_status,
    invitation_type=excluded.invitation_type,
    invited_by=excluded.invited_by,
    promote_permission=excluded.promote_permission,
    backstage_notes=excluded.backstage_notes,
    management_relationship_dates=excluded.management_relationship_dates,
    renewed_management_relationship_dates=excluded.renewed_management_relationship_dates,
    source_imported_at=excluded.source_imported_at,
    source_import_file_name=excluded.source_import_file_name,
    updated_at=now();

  get diagnostics row_count = row_count;

  update public.creators c
  set team_id=m.team_id,
      updated_at=now()
  from (
    select
      x->>'agency_creator_id' as agency_creator_id,
      (
        select t.id
        from public.teams t
        where t.active
          and t.source_manager_email is not null
          and lower(btrim(t.source_manager_email))=
              lower(btrim(coalesce(x->>'creator_network_manager','')))
        limit 1
      ) as team_id
    from jsonb_array_elements(p_rows) x
  ) m
  where c.agency_creator_id=m.agency_creator_id
    and c.team_id is distinct from m.team_id;

  select count(*) into unmapped_manager_rows
  from jsonb_array_elements(p_rows) x
  where nullif(btrim(x->>'creator_network_manager'),'') is not null
    and not exists (
      select 1
      from public.teams t
      where t.active
        and t.source_manager_email is not null
        and lower(btrim(t.source_manager_email))=
            lower(btrim(x->>'creator_network_manager'))
    );

  update public.import_log
  set status='completed',
      matched_count=row_count,
      unmatched_count=p_invalid,
      created_count=created_rows,
      updated_count=row_count-created_rows,
      completed_at=now(),
      metadata=coalesce(metadata,'{}'::jsonb) || jsonb_build_object(
        'deactivation_rule',
        'CRM deactivation is authoritative. Roster imports update creator data but never reactivate an inactive Creator ID or linked user.',
        'manager_assignment_rule',
        'Manager email from the current roster is authoritative for creator team assignment. Existing notes remain attached to the Creator ID.',
        'unmapped_manager_rows',
        unmapped_manager_rows
      )
  where id=p_import_id;

  insert into public.audit_log(actor_user_id,action,entity_type,entity_id,result,metadata)
  values(
    p_actor_id,
    'creators_import',
    'import_log',
    p_import_id::text,
    'success',
    jsonb_build_object(
      'processed',row_count,
      'invalid',p_invalid,
      'atomic',true,
      'preserves_manual_deactivation',true,
      'manager_team_assignment_from_roster',true,
      'unmapped_manager_rows',unmapped_manager_rows
    )
  );
end;
$function$;

update public.creators c
set team_id=t.id,
    updated_at=now()
from public.teams t
where t.active
  and t.source_manager_email is not null
  and c.creator_network_manager is not null
  and lower(btrim(c.creator_network_manager))=lower(btrim(t.source_manager_email))
  and c.team_id is distinct from t.id;

update public.creators c
set team_id=null,
    updated_at=now()
where c.team_id is not null
  and (
    c.creator_network_manager is null
    or not exists (
      select 1 from public.teams t
      where t.active
        and t.source_manager_email is not null
        and lower(btrim(t.source_manager_email))=lower(btrim(c.creator_network_manager))
    )
  );

alter table public.profile_directory
  add column if not exists admin_only boolean not null default false;

create or replace function private.sync_profile_directory()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog','public'
as $function$
begin
  insert into public.profile_directory(
    user_id,display_name,avatar_url,active,admin_only,updated_at
  )
  values(
    new.id,
    new.display_name,
    new.avatar_url,
    new.active,
    lower(new.login_username)='piadmin',
    now()
  )
  on conflict(user_id) do update
  set display_name=excluded.display_name,
      avatar_url=excluded.avatar_url,
      active=excluded.active,
      admin_only=excluded.admin_only,
      updated_at=now();
  return new;
end;
$function$;

drop trigger if exists profiles_sync_directory on public.profiles;
create trigger profiles_sync_directory
after insert or update of display_name,avatar_url,active,login_username
on public.profiles
for each row execute function private.sync_profile_directory();

update public.profile_directory pd
set admin_only=(lower(p.login_username)='piadmin'),
    updated_at=now()
from public.profiles p
where p.id=pd.user_id;

drop policy if exists profile_directory_active_read on public.profile_directory;
create policy profile_directory_active_read
on public.profile_directory
for select
to authenticated
using (
  private.is_active_user()
  and (admin_only=false or private.is_admin())
);
