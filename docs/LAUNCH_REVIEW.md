# LHS Connect launch review — October 19, 2026

## Launch status
**NOT READY FOR LAUNCH.** This is an interim review, not a completion certificate.

## Verified in production during this review
- Pi's Admin session persists and reaches the dashboard and Administration.
- Username-only creator provisioning creates Auth/profile/Creator role, a linked creator, a permanent Agency Creator ID, and mandatory first-login password change.
- Creator archive and restore both update roster and profile activation.
- Leadership community post and reply render with author and timestamp.
- Scoped campaign creation and editing persist rules and prizes after the policy correction.
- Leadership announcement publishes with an external link and a private text attachment.
- Support ticket creation, private attachment, reply, and status resolution work.
- October calendar contains 102 October-only records, no spillover battle cards. October 20 shows four selected-day rows. September opens as archive with 83 rows.
- Roster XLSX upload counts malformed rows. Updating a handle preserves its permanent ID. Duplicate IDs reject the transaction without modifying the roster.
- SQL regression passes stable identity, import rollback, service-only RPCs, Creator isolation, Manager scope, private contacts, first-login guards, and inactive access. All SQL fixtures roll back.
- TypeScript and production build pass with the project's public Supabase configuration. Production dependency audit reports zero vulnerabilities.

## Fixes and release state
- Existing production commit: `7169e4e0d3abecf5b1000910386d420a5172bb84`, Vercel deployment `dpl_949JYvmMPLGirz5s4qzdqS2FyEjN` READY.
- Migration `20261020024300_launch_insert_visibility.sql` applied successfully to the existing database. Campaign/announcement/ticket SELECT policies evaluate candidate rows directly, preserving existing role/audience predicates and restrictive account guards. This fixes INSERT RETURNING failures. The migration is in local commit `e719f15`; its push was rejected by automatic approval review.
- Local import UI correction exposes the backend's useful error, reports received/processed/invalid/created/updated counts, refreshes logs after completion, labels the import selector, and locks it during upload.
- Local metrics diagnostic correction records the failed RPC's code and message in the Admin-only import log, without recording credentials or the file's rows.

## Remaining software verification and issues
- Metrics XLSX upload now passes through the production UI. API safe-update protection required an explicit DELETE predicate. The transactional replacement now limits deletion to non-null creator IDs (the primary key). An unmatched file fails with a clear message and preserves the successful 12,345-diamond snapshot.
- Approved import UI and diagnostic changes were published through the authenticated GitHub connector as commit 92e1b1b740b921d94f4cca5cf64fb57ee5830f7c. Vercel deployment dpl_BpBBE8R225hhsMCsesKAYt99aW1w is READY. The metrics diagnostic function is active at version 4.
- Full Creator/Manager browser sessions, first-login/password-change, logout/return login, role switching, profile/photo replacement, cross-role attachment access, campaign import, campaign attachments, moderation, complete device/zoom coverage, GitHub Actions build result, and runtime log review remain unverified.
- No claim is made that all launch requirements have passed.

## Role matrix: evidence limits
| Role | Verified evidence | Still required |
| --- | --- | --- |
| Creator | SQL: own creator/private contacts only, inactive/first-login restrictions | Browser workflows |
| Manager | SQL: assigned team creators only, no private contacts | Browser workflows and all content scopes |
| Admin | Live provisioning, archive/restore, campaigns, community, announcements, support, roster upload | Remaining administrative and import flows |

## Security
All 29 public tables retain RLS. Account guards remain enforced. The document bucket is private. Security advisor reports one warning: leaked-password protection is disabled. No service-role key was placed in client source.

## Accessibility
Readability changes are in the existing deployment. The required 100%, 125%, 150% zoom and desktop/tablet/mobile certification is still pending; it must not be marked passed.

## Cleanup and data safety
All 666 original battles remain. Disposable QA creator Auth/profile/roster records, imported roster record, campaign/prize, community post/reply were removed. The QA team was deactivated. Audit evidence and import outcomes were retained.
Two private storage text objects and their QA announcement/resolved support ticket remain pending storage cleanup through its supported API. The QA announcement is inactive. Do not claim release cleanup is complete.

## External dependency and import readiness
The approved real LHS roster will be supplied separately. No Jeremiah Tasi data was used. Roster test cases passed, but final import clearance is withheld until release synchronization and remaining launch checks are completed.

Production URL: https://crm-taupe-sigma.vercel.app
