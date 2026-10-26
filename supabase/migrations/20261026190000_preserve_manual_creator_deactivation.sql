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

  update public.import_log
  set status='completed',
      matched_count=row_count,
      unmatched_count=p_invalid,
      created_count=created_rows,
      updated_count=row_count-created_rows,
      completed_at=now(),
      metadata=coalesce(metadata,'{}'::jsonb) || jsonb_build_object(
        'deactivation_rule',
        'CRM deactivation is authoritative. Roster imports update creator data but never reactivate an inactive Creator ID or linked user.'
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
      'preserves_manual_deactivation',true
    )
  );
end;
$function$;