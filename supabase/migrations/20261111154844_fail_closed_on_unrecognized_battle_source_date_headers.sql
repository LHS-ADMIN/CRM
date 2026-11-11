CREATE OR REPLACE FUNCTION private.sync_google_battles()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private', 'extensions'
AS $function$
declare
 cfg record; row_record record; response extensions.http_response;
 source_url text; sheet_day integer; day_marker text; raw_creator text; raw_opponent text; raw_time text;
 normal_time text; parsed_time text; order_time time without time zone; match_parts text[];
 notes_val text; confirm_val text; status_val text; form_date date; last_date date;
 old_count integer; fresh_count integer; stale_count integer;
 total_count integer:=0; changed_count integer:=0; removed_count integer:=0; synced_count integer:=0;
 local_year integer;local_month integer; checked_at timestamptz:=now();
begin
 if not pg_try_advisory_xact_lock(923600101) then
   return jsonb_build_object('ok',false,'reason','already_running');
 end if;
 local_year:=extract(year from timezone('America/New_York',now()))::integer;
 local_month:=extract(month from timezone('America/New_York',now()))::integer;

 create temporary table if not exists lhs_battle_sync_incoming (
  source_key text primary key, source_spreadsheet_id text not null,source_sheet_name text not null,
  source_row integer, source_confirm text,league text,battle_date date,time_est text,time_sort time without time zone,
  creator_handle text,opponent_name text,opponent_agency text,diamond_range text,lhs_manager text,
  notes text,battle_sheet_url text,status text
 ) on commit drop;

 for cfg in
  select * from (values
   ('A','1aeRaVKJgQLcCQx3ZXogcnsfCrgBguFZTpVe-TUtJv3w',794449467,2026,11,'A Nov 26'),
   ('B','1MAvE8MazgSx83Dv1VYa8x_KVGRUDSZzTti922Ypx_F0',687500014,2026,11,'Nov. 26'),
   ('A','1aeRaVKJgQLcCQx3ZXogcnsfCrgBguFZTpVe-TUtJv3w',383605712,2026,12,'A Dec 26'),
   ('B','1MAvE8MazgSx83Dv1VYa8x_KVGRUDSZzTti922Ypx_F0',1074419424,2026,12,'Dec 26')
  ) as tabs(league,id,gid,year,month,sheet_name)
  where year>local_year or (year=local_year and month>=local_month)
 loop
  source_url:='https://docs.google.com/spreadsheets/d/'||cfg.id||'/export?format=csv&gid='||cfg.gid;
  select * into response from extensions.http_get(source_url::varchar);
  if response.status<>200 or coalesce(response.content_type,'') not ilike '%csv%' then
    raise exception 'Google battle sheet % % unreachable: HTTP %',cfg.league,cfg.sheet_name,response.status;
  end if;
  if length(response.content)<50 or length(response.content)>3500000 then
    raise exception 'Unexpected response length from sheet %',cfg.sheet_name;
  end if;
  sheet_day:=null;
  for row_record in select row_number,cells from private.parse_google_csv(response.content) loop
   if row_record.row_number=3 and not coalesce(row_record.cells[3],'') ilike '%username%' then
    raise exception 'Google battle sheet % header is incorrect',cfg.sheet_name;
   end if;

   day_marker:=btrim(coalesce(row_record.cells[1],''));
   if cfg.league='A' then
    -- Accept MM/DD/YY and MM/DD/YYYY; never carry forward a prior date after an invalid header.
    match_parts:=regexp_match(day_marker,'^0?'||cfg.month::text||'/([0-9]{1,2})/('||cfg.year::text||'|'||right(cfg.year::text,2)||')$');
    if match_parts is not null then
      sheet_day:=match_parts[1]::integer;
      if sheet_day<1 or sheet_day>extract(day from make_date(cfg.year,cfg.month,1)+interval '1 month - 1 day')::integer then
        sheet_day:=null;
      end if;
    elsif day_marker<>'' and row_record.row_number>4 then
      -- Unknown date headers must never silently inherit the previous day's date.
      sheet_day:=null;
    end if;
   elsif day_marker ~ '^[0-9]{1,2}$' then
    sheet_day:=day_marker::integer;
    if sheet_day<1 or sheet_day>extract(day from make_date(cfg.year,cfg.month,1)+interval '1 month - 1 day')::integer then
      sheet_day:=null;
    end if;
   elsif day_marker<>'' and row_record.row_number>4 then
     sheet_day:=null;
   end if;

   if row_record.row_number<=4 then continue;end if;
   raw_creator:=btrim(regexp_replace(coalesce(row_record.cells[3],''),'^@','','g'));
   if raw_creator='' or lower(raw_creator)='username' then continue;end if;
   if sheet_day is null then
     raise exception 'No valid source date for battle in sheet %, row %; refusing wrong-day import',cfg.sheet_name,row_record.row_number;
   end if;
   form_date:=make_date(cfg.year,cfg.month,sheet_day);
   raw_opponent:=btrim(coalesce(row_record.cells[case when cfg.league='A' then 6 else 7 end],''));
   raw_time:=btrim(coalesce(row_record.cells[2],''));
   notes_val:=btrim(coalesce(row_record.cells[case when cfg.league='A' then 9 else 10 end],''));
   confirm_val:=case when cfg.league='B' then btrim(coalesce(row_record.cells[11],'')) else '' end;
   normal_time:=regexp_replace(upper(replace(raw_time,'.','')),'[[:space:]]*(EST|EDT)[[:space:]]*$','','i');
   normal_time:=regexp_replace(btrim(normal_time),'([0-9])([AP]M)$','\1 \2');
   match_parts:=regexp_match(normal_time,'^([0-9]{1,2})(:([0-9]{1,2}))?[[:space:]]*(AM|PM)$');
   order_time:=null;parsed_time:=coalesce(nullif(raw_time,''),'Time TBD');
   if match_parts is not null and match_parts[1]::integer between 1 and 12
        and coalesce(match_parts[3],'0')::integer between 0 and 59 then
      order_time:=make_time(
        mod(match_parts[1]::integer,12)+case when match_parts[4]='PM' then 12 else 0 end,
        coalesce(match_parts[3],'0')::integer,0);
      parsed_time:=match_parts[1]||':'||lpad(coalesce(match_parts[3],'0'),2,'0')||' '||match_parts[4]||' EST';
   end if;
   status_val:=case when raw_opponent='' then 'open'
      when cfg.league='B' and upper(confirm_val)='YES' then 'confirmed'
      when cfg.league='A' and notes_val ~* '^CONFIRMED!?$' then 'confirmed'
      else 'filled' end;
   insert into pg_temp.lhs_battle_sync_incoming
   (source_key,source_spreadsheet_id,source_sheet_name,source_row,source_confirm,
     league,battle_date,time_est,time_sort,creator_handle,opponent_name,opponent_agency,
     diamond_range,lhs_manager,notes,battle_sheet_url,status)
   values (
     cfg.id||'|'||cfg.gid||'|'||row_record.row_number,cfg.id,cfg.sheet_name,row_record.row_number,
     nullif(confirm_val,''),cfg.league,form_date,parsed_time,order_time,'@'||raw_creator,nullif(raw_opponent,''),
     nullif(btrim(coalesce(row_record.cells[8],'')),''),
     nullif(btrim(coalesce(row_record.cells[case when cfg.league='A' then 4 else 5 end],'')),''),
     case when cfg.league='B' then nullif(btrim(coalesce(row_record.cells[4],'')),'') else null end,
     nullif(notes_val,''),'https://docs.google.com/spreadsheets/d/'||cfg.id||'/edit#gid='||cfg.gid||'&range=A'||row_record.row_number,status_val
   );
  end loop;
  select count(*) into fresh_count from pg_temp.lhs_battle_sync_incoming r
   where r.source_spreadsheet_id=cfg.id and r.source_sheet_name=cfg.sheet_name;
  select count(*) into old_count from public.battles b
   where b.source_spreadsheet_id=cfg.id and b.source_sheet_name=cfg.sheet_name;
  if old_count>0 and fresh_count=0 then raise exception 'Source % returned no battles; existing records preserved',cfg.sheet_name;end if;
  if old_count>=10 and fresh_count*10<old_count*7 then
    raise exception 'Source % unexpectedly lost too many rows; sync aborted',cfg.sheet_name;
  end if;
  total_count:=total_count+fresh_count;
 end loop;

 if total_count=0 then raise exception 'No active source tabs; cannot refresh';end if;
 select count(*) into changed_count
 from pg_temp.lhs_battle_sync_incoming i left join public.battles b on b.source_key=i.source_key
 where b.id is null or b.battle_date is distinct from i.battle_date or b.opponent_name is distinct from i.opponent_name
   or b.time_sort is distinct from i.time_sort or b.time_est is distinct from i.time_est
   or b.source_confirm is distinct from i.source_confirm or b.creator_handle is distinct from i.creator_handle;

 with prepared as (
 select i.*,c.id as match_creator,c.team_id as match_team,t.name as match_team_name,
 b.creator_id as prev_creator,b.team_id as prev_team,b.team_name as prev_team_name,b.creator_handle as prev_handle
 from pg_temp.lhs_battle_sync_incoming i
 left join lateral (
   select id,team_id from public.creators
   where active and lower(regexp_replace(regexp_replace(coalesce(tiktok_handle,''),'^@',''),'[^a-zA-Z0-9._].*$','','g'))=
   lower(regexp_replace(regexp_replace(i.creator_handle,'^@',''),'[^a-zA-Z0-9._].*$','','g'))
   order by created_at limit 1
 ) c on true
 left join public.teams t on t.id=c.team_id
 left join public.battles b on b.source_key=i.source_key
 )
 insert into public.battles
 (source_key,source_spreadsheet_id,source_sheet_name,source_row,source_confirm,
  league,battle_date,time_est,time_sort,creator_handle,opponent_name,opponent_agency,
  diamond_range,lhs_manager,notes,battle_sheet_url,creator_id,team_id,team_name,status,synced_at)
 select source_key,source_spreadsheet_id,source_sheet_name,source_row,source_confirm,
 league,battle_date,time_est,time_sort,creator_handle,opponent_name,opponent_agency,
 diamond_range,lhs_manager,notes,battle_sheet_url,
 coalesce(match_creator,case when lower(coalesce(prev_handle,''))=lower(creator_handle) then prev_creator end),
 coalesce(match_team,case when lower(coalesce(prev_handle,''))=lower(creator_handle) then prev_team end),
 coalesce(match_team_name,case when lower(coalesce(prev_handle,''))=lower(creator_handle) then prev_team_name end),
 status,now()
 from prepared
 on conflict(source_key) do update set
 source_confirm=excluded.source_confirm,league=excluded.league,battle_date=excluded.battle_date,
 time_est=excluded.time_est,time_sort=excluded.time_sort,creator_handle=excluded.creator_handle,opponent_name=excluded.opponent_name,
 opponent_agency=excluded.opponent_agency,diamond_range=excluded.diamond_range,lhs_manager=excluded.lhs_manager,
 notes=excluded.notes,battle_sheet_url=excluded.battle_sheet_url,creator_id=excluded.creator_id,team_id=excluded.team_id,
 team_name=excluded.team_name,status=excluded.status,synced_at=now(),updated_at=now();

 select count(*) into stale_count
 from public.battles b
 where (b.source_spreadsheet_id,b.source_sheet_name) in
  (select distinct i.source_spreadsheet_id,i.source_sheet_name from pg_temp.lhs_battle_sync_incoming i)
 and not exists (select 1 from pg_temp.lhs_battle_sync_incoming i where i.source_key=b.source_key);
 if stale_count>greatest(10,ceil(total_count*.30)::integer) then
  raise exception 'Too many shifted/removed source rows; sync aborted without deleting records';
 end if;
 if stale_count>0 then
  delete from public.battles b
  where (b.source_spreadsheet_id,b.source_sheet_name) in
   (select distinct i.source_spreadsheet_id,i.source_sheet_name from pg_temp.lhs_battle_sync_incoming i)
  and not exists(select 1 from pg_temp.lhs_battle_sync_incoming i where i.source_key=b.source_key);
  get diagnostics removed_count=row_count;
 end if;
 insert into private.battle_sync_audit(checked_at,synced_count,changed_count,removed_count)
 values (checked_at,total_count,changed_count,removed_count);
 return jsonb_build_object('ok',true,'checked_at',checked_at,'synced',total_count,'changed',changed_count,'removed',removed_count);
end;
$function$;
