-- Disposable content and identities are never committed.
begin;
do $test$
declare a uuid:=gen_random_uuid(); m uuid:=gen_random_uuid(); c1 uuid:=gen_random_uuid(); c2 uuid:=gen_random_uuid();
  t1 uuid:=gen_random_uuid(); t2 uuid:=gen_random_uuid(); cr1 uuid:=gen_random_uuid(); cr2 uuid:=gen_random_uuid();
  n uuid:=gen_random_uuid(); p1 uuid:=gen_random_uuid(); p2 uuid:=gen_random_uuid(); l uuid:=gen_random_uuid();
  r uuid:=gen_random_uuid(); s1 uuid:=gen_random_uuid(); s2 uuid:=gen_random_uuid();
begin
  perform set_config('qa.admin',a::text,true);perform set_config('qa.manager',m::text,true);
  perform set_config('qa.c1',c1::text,true);perform set_config('qa.c2',c2::text,true);
  perform set_config('qa.p1',p1::text,true);perform set_config('qa.p2',p2::text,true);
  perform set_config('qa.network',n::text,true);perform set_config('qa.reply',r::text,true);
  perform set_config('qa.ticket2',s2::text,true);
  insert into auth.users(id,email,raw_user_meta_data) values
    (a,'qa-content-admin@example.invalid','{"login_username":"qa_content_admin","display_name":"QA Admin"}'),
    (m,'qa-content-manager@example.invalid','{"login_username":"qa_content_manager","display_name":"QA Manager"}'),
    (c1,'qa-content-one@example.invalid','{"login_username":"qa_content_one","display_name":"QA One"}'),
    (c2,'qa-content-two@example.invalid','{"login_username":"qa_content_two","display_name":"QA Two"}');
  update public.profiles set active=true,must_change_password=false,
    active_role=case when id=a then 'admin' when id=m then 'manager' else 'creator' end where id in(a,m,c1,c2);
  insert into public.user_roles(user_id,role) values(a,'admin'),(m,'manager'),(c1,'creator'),(c2,'creator');
  insert into public.teams(id,name,slug) values(t1,'QA Content One','qa-content-one'),(t2,'QA Content Two','qa-content-two');
  insert into public.team_memberships(team_id,user_id) values(t1,m);
  insert into public.creators(id,agency_creator_id,auth_user_id,creator_name,team_id)
    values(cr1,'QA-CONTENT-ONE',c1,'QA One',t1),(cr2,'QA-CONTENT-TWO',c2,'QA Two',t2);
  insert into public.community_posts(id,channel_type,team_id,author_user_id,body) values
    (n,'network',null,c2,'QA network'),(p1,'team',t1,c1,'QA team one'),
    (p2,'team',t2,c2,'QA team two'),(l,'leadership',null,a,'QA leadership');
  insert into public.community_replies(id,post_id,author_user_id,body) values(r,p1,c1,'QA reply');
  insert into public.announcements(title,body,audience_type,team_id,created_by) values
    ('QA-CONTENT network','QA','network',null,a),('QA-CONTENT one','QA','team',t1,a),
    ('QA-CONTENT two','QA','team',t2,a),('QA-CONTENT leadership','QA','leadership',null,a);
  insert into public.campaigns(title,start_at,end_at,audience_type,team_id,created_by) values
    ('QA-CONTENT network',now(),now()+interval '1 day','network',null,a),
    ('QA-CONTENT one',now(),now()+interval '1 day','team',t1,a),
    ('QA-CONTENT two',now(),now()+interval '1 day','team',t2,a);
  insert into public.support_tickets(id,creator_id,opened_by_user_id,team_id,subject) values
    (s1,cr1,c1,t1,'QA-CONTENT one'),(s2,cr2,c2,t2,'QA-CONTENT two');
  insert into public.attachments(parent_type,parent_id,object_path,file_name,uploaded_by,visibility) values
    ('support_ticket',s1,c1::text||'/qa-one.txt','QA-CONTENT one',c1,'all'),
    ('support_ticket',s2,c2::text||'/qa-two.txt','QA-CONTENT two',c2,'all');
end;
$test$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('qa.c1'),true);
do $test$
begin
  if (select count(*) from public.community_posts where body like 'QA %')<>2 then raise exception 'Creator channel isolation failed';end if;
  if (select count(*) from public.announcements where title like 'QA-CONTENT%')<>2 then raise exception 'Creator announcement scope failed';end if;
  if (select count(*) from public.campaigns where title like 'QA-CONTENT%')<>2 then raise exception 'Creator campaign scope failed';end if;
  if (select count(*) from public.support_tickets where subject like 'QA-CONTENT%')<>1 then raise exception 'Creator ticket scope failed';end if;
  if (select count(*) from public.attachments where file_name like 'QA-CONTENT%')<>1 then raise exception 'Attachment parent isolation failed';end if;
  begin
    insert into public.attachments(parent_type,parent_id,object_path,file_name,uploaded_by,visibility)
      values('support_ticket',current_setting('qa.ticket2')::uuid,auth.uid()::text||'/bad.txt','QA forbidden',auth.uid(),'all');
    raise exception 'Cross-owner attachment accepted' using errcode='P0002';
  exception when insufficient_privilege then null;end;
  begin
    perform public.moderate_community('post',current_setting('qa.p2')::uuid,true);
    raise exception 'Creator moderated other team' using errcode='P0002';
  exception when insufficient_privilege then null;end;
end;
$test$;
select set_config('request.jwt.claim.sub',current_setting('qa.manager'),true);
do $test$
begin
  if (select count(*) from public.community_posts where body like 'QA %')<>3 then raise exception 'Manager channel isolation failed';end if;
  if (select count(*) from public.announcements where title like 'QA-CONTENT%')<>3 then raise exception 'Manager announcement scope failed';end if;
  if (select count(*) from public.campaigns where title like 'QA-CONTENT%')<>2 then raise exception 'Manager campaign scope failed';end if;
  if (select count(*) from public.support_tickets where subject like 'QA-CONTENT%')<>1 then raise exception 'Manager ticket scope failed';end if;
  if (select count(*) from public.attachments where file_name like 'QA-CONTENT%')<>1 then raise exception 'Manager attachment scope failed';end if;
  begin
    perform public.moderate_community('post',current_setting('qa.network')::uuid,true);
    raise exception 'Manager moderated other author network post' using errcode='P0002';
  exception when insufficient_privilege then null;end;
  perform public.moderate_community('reply',current_setting('qa.reply')::uuid,true);
  perform public.moderate_community('post',current_setting('qa.p1')::uuid,true);
  if exists(select 1 from public.community_posts where id=current_setting('qa.p1')::uuid) then raise exception 'Hidden post remained visible';end if;
  begin
    perform public.moderate_community('post',current_setting('qa.p1')::uuid,false);
    raise exception 'Manager restored hidden content' using errcode='P0002';
  exception when insufficient_privilege then null;end;
end;
$test$;
select set_config('request.jwt.claim.sub',current_setting('qa.admin'),true);
do $test$
begin
  if (select count(*) from public.community_posts where body like 'QA %')<>4 then raise exception 'Admin channel visibility failed';end if;
  if (select count(*) from public.announcements where title like 'QA-CONTENT%')<>4 then raise exception 'Admin announcement visibility failed';end if;
  if (select count(*) from public.support_tickets where subject like 'QA-CONTENT%')<>2 then raise exception 'Admin ticket visibility failed';end if;
  if (select count(*) from public.attachments where file_name like 'QA-CONTENT%')<>2 then raise exception 'Admin attachment visibility failed';end if;
  perform public.moderate_community('post',current_setting('qa.p1')::uuid,false);
  perform public.moderate_community('reply',current_setting('qa.reply')::uuid,false);
  if not exists(select 1 from public.community_posts where id=current_setting('qa.p1')::uuid and active and hidden_at is null) then raise exception 'Post restore failed';end if;
  if not exists(select 1 from public.community_replies where id=current_setting('qa.reply')::uuid and active and hidden_at is null) then raise exception 'Reply restore failed';end if;
end;
$test$;
reset role;
rollback;
select 'PASS: Creator/Manager/Admin channel, campaign, announcement, ticket and attachment metadata scope; attachment injection rejection; scoped moderation and Admin restore. All fixtures rolled back.' as result;
