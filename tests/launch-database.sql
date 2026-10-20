-- All fixtures and audit events in this regression run roll back together.
begin;
do $test$
declare a uuid:=gen_random_uuid(); c1 uuid:=gen_random_uuid(); c2 uuid:=gen_random_uuid(); m uuid:=gen_random_uuid(); t1 uuid:=gen_random_uuid(); t2 uuid:=gen_random_uuid(); cr1 uuid:=gen_random_uuid(); cr2 uuid:=gen_random_uuid(); il uuid; rows jsonb; before_count integer;
begin
 perform set_config('qa.admin',a::text,true);perform set_config('qa.c1',c1::text,true);perform set_config('qa.c2',c2::text,true);perform set_config('qa.manager',m::text,true);perform set_config('qa.cr1',cr1::text,true);perform set_config('qa.cr2',cr2::text,true);
 insert into auth.users(id,email,raw_user_meta_data) values
 (a,'qa-launch-admin@example.invalid','{"login_username":"qa_launch_admin","display_name":"QA Admin"}'),
 (c1,'qa-launch-c1@example.invalid','{"login_username":"qa_launch_c1","display_name":"QA Creator One"}'),
 (c2,'qa-launch-c2@example.invalid','{"login_username":"qa_launch_c2","display_name":"QA Creator Two"}'),
 (m,'qa-launch-manager@example.invalid','{"login_username":"qa_launch_manager","display_name":"QA Manager"}');
 update public.profiles set active=true,must_change_password=false,active_role=case when id=a then 'admin' when id=m then 'manager' else 'creator' end where id in (a,c1,c2,m);
 insert into public.user_roles(user_id,role) values(a,'admin'),(m,'manager'),(c1,'creator'),(c1,'manager'),(c2,'creator');
 insert into public.teams(id,name,slug) values(t1,'QA One','qa-launch-one'),(t2,'QA Two','qa-launch-two');
 insert into public.team_memberships(team_id,user_id,membership_role) values(t1,m,'manager');
 insert into public.creators(id,agency_creator_id,auth_user_id,creator_name,tiktok_handle,team_id) values(cr1,'QA-LAUNCH-ONE',c1,'QA One','@qa_launch_one',t1),(cr2,'QA-LAUNCH-TWO',c2,'QA Two','@qa_launch_two',t2);
 insert into public.profile_details(user_id,email,phone) values(c1,'private-one@example.invalid','0000000000'),(c2,'private-two@example.invalid','0000000000');
 insert into public.campaigns(title,start_at,end_at,created_by,audience_type)
   values('QA inactive Manager existing campaign',now(),now()+interval '1 day',c1,'targeted');
 begin
   perform public.admin_update_access(a,m,array['creator'],array[gen_random_uuid()]);
   raise exception 'Invalid team accepted' using errcode='P0002';
 exception when foreign_key_violation then null;end;
 if not exists(select 1 from public.user_roles where user_id=m and role='manager')
   or not exists(select 1 from public.team_memberships where user_id=m and team_id=t1)
   or (select active_role from public.profiles where id=m)<>'manager' then
   raise exception 'Failed access change partially removed permissions';
 end if;
 perform public.admin_update_access(a,m,array['manager','creator'],array[t2]);
 if not exists(select 1 from public.user_roles where user_id=m and role='creator')
   or not exists(select 1 from public.team_memberships where user_id=m and team_id=t2) then
   raise exception 'Access update did not persist';
 end if;
 perform public.admin_update_access(a,m,array['manager'],array[t1]);
 begin
   perform public.admin_update_access(c1,m,array['admin']);
   raise exception 'Non-admin changed access' using errcode='P0002';
 exception when insufficient_privilege then null;end;
 perform public.admin_set_creator_active(a,cr2,false);
 if exists(select 1 from public.creators where id=cr2 and active)
   or exists(select 1 from public.profiles where id=c2 and active) then raise exception 'Archive did not disable login';end if;
 perform public.admin_set_creator_active(a,cr2,true);
 if not exists(select 1 from public.creators where id=cr2 and active and agency_creator_id='QA-LAUNCH-TWO')
   or not exists(select 1 from public.profiles where id=c2 and active) then raise exception 'Restore lost creator identity';end if;
 if has_function_privilege('authenticated','public.admin_update_access(uuid,uuid,text[],uuid[])','execute')
   or has_function_privilege('anon','public.admin_set_creator_active(uuid,uuid,boolean)','execute') then
   raise exception 'Administrative transaction RPC exposed';
 end if;
 insert into public.import_log(import_type,created_by,received_count) values('manage_creators',a,1) returning id into il;
 rows=jsonb_build_array(jsonb_build_object('agency_creator_id','QA-IMPORT-ONE','creator_name','QA Import','tiktok_handle','@qa_import_one','active',true,'status','active'));
 perform public.commit_creators_import(rows,il,a,0);
 if not exists(select 1 from public.import_log where id=il and status='completed' and created_count=1) then raise exception 'Import completion log failed';end if;
 insert into public.import_log(import_type,created_by,received_count) values('manage_creators',a,1) returning id into il;
 rows=jsonb_build_array(jsonb_build_object('agency_creator_id','QA-IMPORT-ONE','creator_name','QA Import Updated','tiktok_handle','@qa_import_changed','active',true,'status','active'));
 perform public.commit_creators_import(rows,il,a,0);
 if (select count(*) from public.creators where agency_creator_id='QA-IMPORT-ONE')<>1 then raise exception 'Stable identity failed';end if;
 select count(*) into before_count from public.creators;
 insert into public.import_log(import_type,created_by,received_count) values('manage_creators',a,2) returning id into il;
 begin
  perform public.commit_creators_import(rows||rows,il,a,0);raise exception 'Duplicate rejection failed' using errcode='P0002';
 exception when sqlstate 'P0002' then raise; when others then null;end;
 if (select count(*) from public.creators)<>before_count then raise exception 'Duplicate import corrupted roster';end if;
 insert into public.metrics_current(creator_id,data_period,diamonds) values(cr1,'QA',123);
 insert into public.import_log(import_type,created_by,received_count) values('metrics_current',a,1) returning id into il;
 rows=jsonb_build_array(jsonb_build_object('creator_id',gen_random_uuid(),'import_id',il,'data_period','QA','diamonds',456));
 begin
  perform public.commit_metrics_import(rows,il,a,0);raise exception 'Invalid metrics accepted' using errcode='P0002';
 exception when sqlstate 'P0002' then raise; when others then null;end;
 if not exists(select 1 from public.metrics_current where creator_id=cr1 and diamonds=123) then raise exception 'Failed metrics replacement erased snapshot';end if;
 insert into public.import_log(import_type,created_by,received_count) values('campaign_import',a,1) returning id into il;
 rows=jsonb_build_array(jsonb_build_object('title','QA campaign import','import_key','qa-launch-import-one','start_at',now(),'end_at',now()+interval '1 day'));
 perform public.commit_campaigns_import(rows,il,a,0);
 if not exists(select 1 from public.import_log where id=il and status='completed' and created_count=1) then raise exception 'Campaign creation count failed';end if;
 insert into public.import_log(import_type,created_by,received_count) values('campaign_import',a,1) returning id into il;
 rows=jsonb_build_array(jsonb_build_object('title','QA campaign updated','import_key','qa-launch-import-one','start_at',now(),'end_at',now()+interval '1 day'));
 perform public.commit_campaigns_import(rows,il,a,0);
 if not exists(select 1 from public.import_log where id=il and status='completed' and updated_count=1) then raise exception 'Campaign update count failed';end if;
 insert into public.import_log(import_type,created_by,received_count) values('campaign_import',a,2) returning id into il;
 begin
   perform public.commit_campaigns_import(
     jsonb_build_array(jsonb_build_object('title','QA forbidden partial update','import_key','qa-launch-import-one','start_at',now(),'end_at',now()+interval '1 day'),
       jsonb_build_object('title','QA invalid dates','import_key','qa-launch-import-two','start_at',now(),'end_at',now()-interval '1 day')),il,a,0);
   raise exception 'Campaign invalid date accepted' using errcode='P0002';
 exception when check_violation then null;end;
 if not exists(select 1 from public.campaigns where import_key='qa-launch-import-one' and title='QA campaign updated')
   or exists(select 1 from public.campaigns where import_key='qa-launch-import-two') then raise exception 'Campaign import partially committed';end if;
 begin
   perform public.commit_campaigns_import(rows||rows,il,a,0);
   raise exception 'Campaign duplicate accepted' using errcode='P0002';
 exception when sqlstate 'P0002' then raise;when others then null;end;
 if has_function_privilege('authenticated','public.commit_campaigns_import(jsonb,uuid,uuid,integer)','execute') then raise exception 'Campaign import RPC exposed';end if;
 if has_function_privilege('authenticated','public.commit_metrics_import(jsonb,uuid,uuid,integer)','execute') or has_function_privilege('anon','public.commit_creators_import(jsonb,uuid,uuid,integer)','execute') then raise exception 'Import RPC exposed';end if;
end;
$test$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('qa.c1'),true);
do $test$
begin
 if (select count(*) from public.creators where agency_creator_id like 'QA-LAUNCH-%')<>1 then raise exception 'Creator isolation failed';end if;
 if (select count(*) from public.profile_details where user_id in(current_setting('qa.c1')::uuid,current_setting('qa.c2')::uuid))<>1 then raise exception 'Private details isolation failed';end if;
 begin update public.profiles set must_change_password=false where id=auth.uid();raise exception 'Password flag writable' using errcode='P0002';exception when insufficient_privilege then null;end;
 begin update public.creators set agency_creator_id='QA-STOLEN' where id=current_setting('qa.cr1')::uuid;raise exception 'Permanent ID writable' using errcode='P0002';exception when insufficient_privilege then null;end;
 begin
  insert into public.campaigns(title,start_at,end_at,created_by,audience_type)
    values('QA forbidden targeted campaign',now(),now()+interval '1 day',auth.uid(),'targeted');
  raise exception 'Inactive Manager role granted campaign creation' using errcode='P0002';
 exception when insufficient_privilege then null;end;
 if exists(select 1 from public.campaigns where created_by=auth.uid() and private.can_manage_campaign(id)) then
   raise exception 'Inactive Manager role granted campaign management';
 end if;
 update public.campaigns set title='QA forbidden edit' where created_by=auth.uid();
 if found then
   raise exception 'Inactive Manager role edited campaign';
 end if;
end;
$test$;
select set_config('request.jwt.claim.sub',current_setting('qa.manager'),true);
do $test$
begin
 if (select count(*) from public.creators where agency_creator_id like 'QA-LAUNCH-%')<>1 then raise exception 'Manager team isolation failed';end if;
 if exists(select 1 from public.profile_details where user_id in(current_setting('qa.c1')::uuid,current_setting('qa.c2')::uuid)) then raise exception 'Manager accessed private contacts';end if;
 insert into public.campaigns(title,start_at,end_at,created_by,audience_type)
   values('QA permitted Manager campaign',now(),now()+interval '1 day',auth.uid(),'targeted');
end;
$test$;
select set_config('request.jwt.claim.sub',current_setting('qa.admin'),true);
insert into public.campaigns(title,start_at,end_at,created_by,audience_type)
  values('QA permitted Admin campaign',now(),now()+interval '1 day',auth.uid(),'targeted');
reset role;
update public.profiles set must_change_password=true where id=current_setting('qa.c1')::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('qa.c1'),true);
do $test$
begin
 if exists(select 1 from public.creators) or exists(select 1 from public.battles) then raise exception 'First-login bypass';end if;
 begin perform public.finish_password_change();raise exception 'Password-change RPC bypass' using errcode='P0002';exception when sqlstate 'P0002' then raise; when others then null;end;
end;
$test$;
reset role;
update public.profiles set active=false,must_change_password=false where id=current_setting('qa.c1')::uuid;
set local role authenticated;
do $test$
begin
 if exists(select 1 from public.creators) or exists(select 1 from public.profile_details) then raise exception 'Inactive access failed';end if;
end;
$test$;
reset role;
rollback;
select 'PASS: stable IDs, duplicate rejection, atomic metrics/campaign imports, atomic account access/archive, service-only RPCs, creator isolation, active-role campaign management, manager scope, private contacts, first-login enforcement, inactive access. All fixtures rolled back.' as result;
