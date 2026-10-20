create or replace function public.commit_campaigns_import(p_rows jsonb,p_import_id uuid,p_actor_id uuid,p_invalid integer default 0)
returns jsonb language plpgsql set search_path = pg_catalog, public
as $$
declare log_row public.import_log; created_rows integer; processed integer;
begin
  if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows)=0 or jsonb_array_length(p_rows)>5000 then
    raise exception 'Import must contain 1-5000 valid rows';end if;
  perform pg_advisory_xact_lock(728418,3);
  select * into log_row from public.import_log where id=p_import_id and created_by=p_actor_id and status='processing' for update;
  if not found or not private.is_admin(p_actor_id) then raise exception 'Active Admin import required';end if;
  if log_row.import_type<>'campaign_import' then raise exception 'Import type mismatch';end if;
  if exists(select 1 from jsonb_array_elements(p_rows) x where nullif(btrim(x->>'import_key'),'') is null)
    or (select count(distinct x->>'import_key') from jsonb_array_elements(p_rows)x)<>jsonb_array_length(p_rows) then
    raise exception 'Missing or duplicate campaign keys';end if;
  select count(*) into created_rows from jsonb_array_elements(p_rows)x
    where not exists(select 1 from public.campaigns c where c.import_key=x->>'import_key');
  insert into public.campaigns(title,description,start_at,end_at,rules,metric,status,active,audience_type,created_by,source_type,import_key,source_metadata)
    select r.title,r.description,r.start_at,r.end_at,r.rules,r.metric,'scheduled',true,'network',p_actor_id,'backstage_import',r.import_key,coalesce(r.source_metadata,'{}'::jsonb)
    from jsonb_populate_recordset(null::public.campaigns,p_rows)r
  on conflict(import_key) do update set title=excluded.title,description=excluded.description,start_at=excluded.start_at,
    end_at=excluded.end_at,rules=excluded.rules,metric=excluded.metric,source_metadata=excluded.source_metadata;
  get diagnostics processed=row_count;
  update public.import_log set status='completed',matched_count=processed,unmatched_count=p_invalid,
    created_count=created_rows,updated_count=processed-created_rows,completed_at=now() where id=p_import_id;
  insert into public.audit_log(actor_user_id,action,entity_type,entity_id,result,metadata)
    values(p_actor_id,'campaigns_import','import_log',p_import_id::text,'success',jsonb_build_object('processed',processed,'invalid',p_invalid,'atomic',true));
  return jsonb_build_object('created',created_rows,'updated',processed-created_rows);
end;
$$;
revoke all on function public.commit_campaigns_import(jsonb,uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.commit_campaigns_import(jsonb,uuid,uuid,integer) to service_role;
