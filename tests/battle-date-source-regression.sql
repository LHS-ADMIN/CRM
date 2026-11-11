-- LHS November/December 2026 source date regression checks.
-- Run as a project administrator after applying the battle sync migrations.
-- No database data is changed.
do $verify$
declare
  short_year text[];
  long_year text[];
  actual_rows integer;
begin
  short_year := regexp_match('11/13/26','^0?'||11::text||'/([0-9]{1,2})/('||2026::text||'|'||right(2026::text,2)||')$');
  long_year := regexp_match('11/12/2026','^0?'||11::text||'/([0-9]{1,2})/('||2026::text||'|'||right(2026::text,2)||')$');
  if short_year is null or short_year[1]<>'13' or long_year is null or long_year[1]<>'12' then
    raise exception 'A League source date format regression';
  end if;

  if extract(day from make_date(2026,11,1)+interval '1 month - 1 day')::integer<>30 then
    raise exception 'November month-end guard regression';
  end if;

  select count(*) into actual_rows from public.battles
  where source_sheet_name='A Nov 26'
    and source_spreadsheet_id='1aeRaVKJgQLcCQx3ZXogcnsfCrgBguFZTpVe-TUtJv3w'
    and source_row in (172,173)
    and battle_date=date '2026-11-13'
    and (
      (source_row=172 and lower(creator_handle)='@lisathexperience')
      or (source_row=173 and lower(creator_handle)='@terenacooks')
    );
  if actual_rows<>2 then
    raise exception 'A League November 13 source dates do not match the CRM';
  end if;
end
$verify$;
