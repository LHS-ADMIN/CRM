-- Creator note access is role-scoped. All fixtures roll back.
begin;
do $setup$
declare
  a uuid:=gen_random_uuid(); m uuid:=gen_random_uuid(); c1 uuid:=gen_random_uuid(); c2 uuid:=gen_random_uuid();
  t1 uuid:=gen_random_uuid(); t2 uuid:=gen_random_uuid(); cr1 uuid:=gen_random_uuid(); cr2 uuid:=gen_random_uuid();
begin
  perform set_config('qa.notes_admin',a::text,true);
  perform set_config('qa.notes_manager',m::text,true);
  perform set_config('qa.notes_creator1',c1::text,true);
  perform set_config('qa.notes_creator2',c2::text,true);
  perform set_config('qa.notes_team1',t1::text,true);
  perform set_config('qa.notes_team2',t2::text,true);
  perform set_config('qa.notes_cr1',cr1::text,true);
  perform set_config('qa.notes_cr2',cr2::text,true);

  insert into auth.users(id,email,raw_user_meta_data) values
    (a,'qa-notes-admin@example.invalid','{"login_username":"qa_notes_admin","display_name":"QA Notes Admin"}'),
    (m,'qa-notes-manager@example.invalid','{"login_username":"qa_notes_manager","display_name":"QA Notes Manager"}'),
    (c1,'qa-notes-c1@example.invalid','{"login_username":"qa_notes_c1","display_name":"QA Notes One"}'),
    (c2,'qa-notes-c2@example.invalid','{"login_username":"qa_notes_c2","display_name":"QA Notes Two"}');

  update public.profiles set active=true,must_change_password=false,
    active_role=case when id=a then 'admin' when id=m then 'manager' else 'creator' end
  where id in(a,m,c1,c2);

  insert into public.user_roles(user_id,role) values(a,'admin'),(m,'manager'),(c1,'creator'),(c2,'creator');
  insert into public.teams(id,name,slug) values(t1,'QA Notes One','qa-notes-one'),(t2,'QA Notes Two','qa-notes-two');
  insert into public.team_memberships(team_id,user_id,membership_role,active) values(t1,m,'manager',true);
  insert into public.creators(id,agency_creator_id,auth_user_id,creator_name,team_id)
    values(cr1,'QA-NOTES-ONE',c1,'QA Notes One',t1),(cr2,'QA-NOTES-TWO',c2,'QA Notes Two',t2);

  insert into public.creator_notes(creator_id,author_user_id,note_text)
    values(cr1,a,'QA admin note team one'),(cr2,a,'QA admin note team two');
end;
$setup$;

set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('qa.notes_manager'),true);
do $manager$
begin
  if (select count(*) from public.creator_notes where note_text like 'QA admin note%')<>1 then
    raise exception 'Manager creator-note visibility escaped assigned team';
  end if;

  insert into public.creator_notes(creator_id,author_user_id,note_text)
    values(current_setting('qa.notes_cr1')::uuid,auth.uid(),'QA manager allowed note');

  begin
    insert into public.creator_notes(creator_id,author_user_id,note_text)
      values(current_setting('qa.notes_cr2')::uuid,auth.uid(),'QA manager forbidden note');
    raise exception 'Manager added a note outside assigned team' using errcode='P0002';
  exception when insufficient_privilege then null; end;
end;
$manager$;

select set_config('request.jwt.claim.sub',current_setting('qa.notes_creator1'),true);
do $creator$
begin
  if exists(select 1 from public.creator_notes) then
    raise exception 'Creator could read internal creator notes';
  end if;
  begin
    insert into public.creator_notes(creator_id,author_user_id,note_text)
      values(current_setting('qa.notes_cr1')::uuid,auth.uid(),'QA creator forbidden note');
    raise exception 'Creator could add internal creator note' using errcode='P0002';
  exception when insufficient_privilege then null; end;
end;
$creator$;

select set_config('request.jwt.claim.sub',current_setting('qa.notes_admin'),true);
do $admin$
begin
  if (select count(*) from public.creator_notes where note_text like 'QA %')<>3 then
    raise exception 'Admin could not view all creator notes';
  end if;
  update public.creator_notes set note_text='QA admin edited note',updated_at=now()
  where creator_id=current_setting('qa.notes_cr1')::uuid and note_text='QA admin note team one';
  if not exists(select 1 from public.creator_notes where note_text='QA admin edited note') then
    raise exception 'Admin creator-note edit failed';
  end if;
end;
$admin$;

reset role;
rollback;
select 'PASS: Admin network-wide notes; Manager assigned-team read/add; Creator denied. All fixtures rolled back.' as result;
