-- Atomic import operations are callable only by the authenticated Edge Functions service client.
create or replace function public.commit_metrics_import(p_rows jsonb, p_import_id uuid, p_actor_id uuid, p_invalid integer default 0)
returns void language plpgsql security invoker set search_path = '' as $fn$
declare log_row public.import_log; row_count integer; created_rows integer := 0;
begin
  if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows) = 0 or jsonb_array_length(p_rows) > 10000 then
    raise exception 'Import must contain 1-10000 valid rows';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(728418, 1);
  select * into log_row from public.import_log where id=p_import_id and created_by=p_actor_id and status='processing' for update;
  if not found or not exists (select 1 from public.profiles p join public.user_roles r on r.user_id=p.id and r.role='admin' where p.id=p_actor_id and p.active and p.active_role='admin') then
    raise exception 'Active Admin import required';
  end if;
  if log_row.import_type <> 'metrics_current' then raise exception 'Import type mismatch'; end if;
  if exists (select 1 from jsonb_array_elements(p_rows) x where nullif(btrim(x->>'creator_id'),'') is null) or
     (select count(distinct lower(x->>'creator_id')) from jsonb_array_elements(p_rows) x) <> jsonb_array_length(p_rows) then
    raise exception 'Missing or duplicate creator IDs';
  end if;
  if exists (select 1 from jsonb_array_elements(p_rows) x where (x->>'import_id')::uuid is distinct from p_import_id) then raise exception 'Import ID mismatch'; end if;
  delete from public.metrics_current;
  insert into public.metrics_current (creator_id,data_period,tiktok_handle,team_id,team_name,diamonds,live_duration_seconds,live_duration_display,live_days,new_followers,live_streams,matches,diamonds_from_matches,multi_guest_diamonds,rank,graduation_status,tier_status,source_file_name,imported_at,import_id)
  select r.creator_id,r.data_period,r.tiktok_handle,r.team_id,r.team_name,r.diamonds,r.live_duration_seconds,r.live_duration_display,r.live_days,r.new_followers,r.live_streams,r.matches,r.diamonds_from_matches,r.multi_guest_diamonds,r.rank,r.graduation_status,r.tier_status,r.source_file_name,r.imported_at,r.import_id from jsonb_populate_recordset(null::public.metrics_current,p_rows) r
;
  get diagnostics row_count = row_count;
  update public.import_log set status='completed',matched_count=row_count,unmatched_count=p_invalid,
    created_count=row_count,updated_count=0,completed_at=now() where id=p_import_id;
  insert into public.audit_log(actor_user_id,action,entity_type,entity_id,result,metadata)
    values(p_actor_id,'metrics_import','import_log',p_import_id::text,'success',jsonb_build_object('processed',row_count,'invalid',p_invalid,'atomic',true));
end;
$fn$;
revoke all on function public.commit_metrics_import(jsonb,uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.commit_metrics_import(jsonb,uuid,uuid,integer) to service_role;
create or replace function public.commit_creators_import(p_rows jsonb, p_import_id uuid, p_actor_id uuid, p_invalid integer default 0)
returns void language plpgsql security invoker set search_path = '' as $fn$
declare log_row public.import_log; row_count integer; created_rows integer := 0;
begin
  if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows) = 0 or jsonb_array_length(p_rows) > 10000 then
    raise exception 'Import must contain 1-10000 valid rows';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(728418, 2);
  select * into log_row from public.import_log where id=p_import_id and created_by=p_actor_id and status='processing' for update;
  if not found or not exists (select 1 from public.profiles p join public.user_roles r on r.user_id=p.id and r.role='admin' where p.id=p_actor_id and p.active and p.active_role='admin') then
    raise exception 'Active Admin import required';
  end if;
  if log_row.import_type <> 'manage_creators' then raise exception 'Import type mismatch'; end if;
  if exists (select 1 from jsonb_array_elements(p_rows) x where nullif(btrim(x->>'agency_creator_id'),'') is null) or
     (select count(distinct lower(x->>'agency_creator_id')) from jsonb_array_elements(p_rows) x) <> jsonb_array_length(p_rows) then
    raise exception 'Missing or duplicate creator IDs';
  end if;
  select count(*) into created_rows from jsonb_array_elements(p_rows) x where not exists (select 1 from public.creators c where c.agency_creator_id=x->>'agency_creator_id');
  if exists (select 1 from jsonb_array_elements(p_rows) x join public.creators c on lower(c.agency_creator_id)=lower(x->>'agency_creator_id') and c.agency_creator_id<>x->>'agency_creator_id') then raise exception 'Creator ID case mismatch'; end if;
  insert into public.creators (agency_creator_id,creator_name,tiktok_handle,group_name,creator_network_manager,graduation_status,relationship_status,invitation_type,invited_by,promote_permission,backstage_notes,management_relationship_dates,renewed_management_relationship_dates,source_imported_at,source_import_file_name,status,active)
  select r.agency_creator_id,r.creator_name,r.tiktok_handle,r.group_name,r.creator_network_manager,r.graduation_status,r.relationship_status,r.invitation_type,r.invited_by,r.promote_permission,r.backstage_notes,r.management_relationship_dates,r.renewed_management_relationship_dates,r.source_imported_at,r.source_import_file_name,r.status,r.active from jsonb_populate_recordset(null::public.creators,p_rows) r
  on conflict (agency_creator_id) do update set creator_name=excluded.creator_name,tiktok_handle=excluded.tiktok_handle,group_name=excluded.group_name,creator_network_manager=excluded.creator_network_manager,graduation_status=excluded.graduation_status,relationship_status=excluded.relationship_status,invitation_type=excluded.invitation_type,invited_by=excluded.invited_by,promote_permission=excluded.promote_permission,backstage_notes=excluded.backstage_notes,management_relationship_dates=excluded.management_relationship_dates,renewed_management_relationship_dates=excluded.renewed_management_relationship_dates,source_imported_at=excluded.source_imported_at,source_import_file_name=excluded.source_import_file_name;
  get diagnostics row_count = row_count;
  update public.import_log set status='completed',matched_count=row_count,unmatched_count=p_invalid,
    created_count=created_rows,updated_count=row_count-created_rows,completed_at=now() where id=p_import_id;
  insert into public.audit_log(actor_user_id,action,entity_type,entity_id,result,metadata)
    values(p_actor_id,'creators_import','import_log',p_import_id::text,'success',jsonb_build_object('processed',row_count,'invalid',p_invalid,'atomic',true));
end;
$fn$;
revoke all on function public.commit_creators_import(jsonb,uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.commit_creators_import(jsonb,uuid,uuid,integer) to service_role;
