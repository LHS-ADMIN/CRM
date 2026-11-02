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