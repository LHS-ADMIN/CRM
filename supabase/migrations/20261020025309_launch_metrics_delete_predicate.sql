-- Keep API safe-update protection enabled. Creator IDs are non-null primary keys,
-- so this explicit predicate replaces exactly the existing current snapshot.
do $migration$
declare definition text;
begin
  definition := pg_get_functiondef('public.commit_metrics_import(jsonb,uuid,uuid,integer)'::regprocedure);
  if position('delete from public.metrics_current;' in definition) = 0 then
    raise exception 'Expected metrics replacement definition was not found';
  end if;
  execute replace(definition,
    'delete from public.metrics_current;',
    'delete from public.metrics_current where creator_id is not null;');
end;
$migration$;
