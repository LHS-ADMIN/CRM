# LHS live battle-sheet synchronization (November 2026)
Both shared Google Sheets have explicit anyone-with-link permissions at the time of setup. The CRM does **not** grant new Google permissions.

## Schedule
Supabase pg_cron job 3: `lhs-google-sheets-auto-battle-sync`, every five minutes.
The job runs the private function `private.sync_google_battles()`. It has no callable public API and cannot be invoked by normal creator logins.
The built-in PostgreSQL `http` extension retrieves the sheet CSV directly, with no Google credentials stored in the CRM.

## Source tabs
- A League: Nov `A Nov 26` (gid 794449467), Dec `A Dec 26` (gid 383605712).
- B League: Nov `Nov. 26` (gid 687500014), Dec `Dec 26` (gid 1074419424).

Source keys are spreadsheet ID + sheet gid + one-based physical row number.
The date is carried forward from column A section headers. Creator handle is column C.
Opponent is F (A League), G (B League). B confirmation requires exactly YES in K; A confirmation uses the exact CONFIRMED note in I. Changes are detected from cell **values**, never from orange background formatting.

## Failure and safety behavior
All four currently relevant tabs must be retrieved and their headers validated before any records are updated. A dramatically truncated/empty response aborts the transaction, preserving existing battles.
Source upserts preserve matched creator/team identities when possible. Changes to an existing opponent or time are captured by the existing private battle update trigger.
Obsolete source rows are removed only after a valid full-source comparison and a safe count check.
`private.battle_sync_audit` records checked_at, synced_count, changed_count, removed_count.

## Verification
```sql
select jobid,jobname,schedule,active from cron.job where jobname='lhs-google-sheets-auto-battle-sync';
select checked_at,synced_count,changed_count,removed_count from private.battle_sync_audit order by checked_at desc limit 5;
select * from cron.job_run_details where jobid=3 order by start_time desc limit 5;
```

This configuration explicitly covers November and December 2026; for 2027, update the private sync function after the next source tabs and IDs are known.

## November 11, 2026 date correction
The A League November sheet has both `11/12/2026` and `11/13/26` headers. The initial live sync accepted only four-digit years, so two November 13 A League battles were mistakenly stored as November 12. The same short-year pattern exists on the December 13 template row.

Production migrations `20261111154506` and `20261111154844` now:
- Interpret MM/DD/YY and MM/DD/YYYY headers for their explicitly configured month/year.
- Reject missing, invalid, and unfamiliar source headers instead of placing creator battles on a previous day.
- Count date changes in synchronization audit totals.
- Preserve the normal five-minute automated sync.

After the fix, the two November 13 A League records (source rows 172–173) were corrected. An independent audit compared all **107** current November/December A and B League source rows with CRM records: zero missing rows and zero wrong dates at the time of testing.

A League November has a `11/31/2026` template heading with no associated creator battles. November 31 is not a valid date: the new parser ignores that empty section and will refuse any battle entered under it, rather than create a nonexistent schedule.

### Follow-up verification after source sheet edits
Run `select private.sync_google_battles();` as a database administrator, confirm `ok=true` and check `private.battle_sync_audit`. Match the source sheet's date header against `battles.battle_date` for the same `source_key`. See `tests/battle-date-source-regression.sql` for the November 13 regression checks.
