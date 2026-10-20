# LHS Connect launch certification review — October 20, 2026

## 1. LAUNCH STATUS

**NOT READY FOR LAUNCH**

This is an interim certification record. Critical browser workflows and accessibility checks remain untested. The testing browser encountered a credential-protection error during file-chooser testing and its automation runtime reset; further login repetition is not requested. A successful deployment and passing database tests do not certify those workflows.

Outstanding software verification: complete Creator and Manager browser workflows; profile/contact editing and photo upload/replacement/invalid-file checks; cross-role signed attachment delivery; campaign XLSX upload through the UI; new campaign attachment and community moderation controls; full Academy link behavior; authentication expiry/error states; desktop/laptop/tablet/mobile layouts; 100%, 125%, and 150% browser zoom; and application console/network review. These are unfinished QA work, not external data dependencies. Release cleanup remains incomplete while the role-testing account is needed.

## 2. VERIFIED WORKING

Personally exercised in the production browser earlier in this review:

- Admin sign-in, dashboard and Administration access, session persistence, logout, protected-route redirect, and returning sign-in.
- Username-only creator provisioning creates Auth/profile/Creator access, linked creator, permanent Agency Creator ID, temporary credentials, and mandatory first-login password change.
- Creator archive and restore update both roster and login activation.
- Leadership community post and reply render with author and timestamp.
- Scoped campaign create/edit persists rules and prizes.
- Announcement publishing with external link and a private text attachment.
- Support ticket creation, private text attachment, reply, and status resolution.
- October calendar has 102 October-only records; October 20 shows four selected-day rows. September archive has 83 rows. Spillover dates do not render old-month cards in the active month.
- Roster XLSX counts malformed rows; handle changes preserve permanent IDs; duplicate IDs reject without modifying the roster.
- Current-metrics XLSX uploads 12,345 diamonds, two live days and three streams. An unmatched file reports failure and preserves the successful snapshot. Disposable metric data was later removed.

A fresh production browser sign-in as Pi/Admin was personally verified during this pass. The Academy page rendered the official resource and its link has target `_blank`; the external destination could not be verified because browser session protection blocked the new-tab observation.

The user reported successful QA-account login. Database state confirms first-login completion and active Creator mode. This is not presented as an agent-observed Creator browser session.

Production-database regression tests passed, with every fixture and its audit events rolled back:

- Stable IDs, duplicate rejection, transactional metrics and campaign imports, campaign create/update counts, invalid-date import rollback, and service-only import RPC privileges.
- Atomic role/team replacement: an invalid team rolls back role removal, memberships, and active-role changes together. Valid changes persist inside the test transaction. Non-Admin callers are rejected.
- Archive/restore preserves permanent identity and changes profile activation with creator status in one transaction.
- Creator own-roster/private-contact isolation; Manager assigned-team scope without private contacts; inactive and first-login account restrictions.
- A multi-role account in Creator mode cannot create or manage targeted campaigns using its inactive Manager assignment.
- Creator/Manager/Admin visibility across network, team, and leadership community content; announcements; campaigns; support tickets; and attachment metadata.
- Cross-owner attachment metadata injection is rejected even when the supplied visibility is `all`.
- Scoped community moderation hides posts/replies without deletion. Manager network-wide moderation and restoration are denied; Admin restoration works.

Tests: `tests/launch-database.sql` and `tests/launch-content-access.sql`. These simulate authenticated database roles; they do not replace browser or Storage API tests.

## 3. FIXES COMPLETED

- Preserved form references across asynchronous requests so successful forms reset reliably.
- Added transactional roster/current-metrics import commits, duplicate and stable-ID safeguards, and failure preservation of the current metric snapshot.
- Corrected campaign/announcement/support-ticket SELECT policies so authorized INSERT RETURNING requests can see newly inserted rows.
- Corrected the metrics replacement DELETE predicate for API safe-update protection.
- Improved import error messages, counters, selector labeling, busy states, refreshed logs, and Admin-only failure diagnostics.
- Enforced account activation and mandatory password-change guards; restricted client writes to permanent IDs and account fields; cleared the first-login flag only after an Auth password update.
- Added attachment-parent visibility and insertion checks while retaining the private document bucket.
- Completed support replies/status controls, community replies, Academy resource creation, creator editing, team management, and creator restore controls.
- Improved temporary-password readability, copying, retained display, duplicate-reset prevention, and stale-session messages. A new reset still invalidates the preceding temporary password.
- Required the active Manager role for targeted campaign creation and management, including child records controlled by the campaign helper.
- Made role/team changes and creator archive/restore transactional through service-only Admin RPCs. Admin Edge Functions also require completed first-login password change.
- Added scoped, reversible community Hide/Restore controls. Database authorization tests passed; new controls still require browser exercise.
- Made campaign imports transactional, rejected duplicate keys, counted create/update results, preserved existing data on failure, and logged failed imports. Browser XLSX exercise remains pending.
- Added optional campaign image/PDF upload/display using the existing private attachment system, with a 20 MB limit and cleanup after metadata failure. Admin edits preserve the original campaign owner, and existing targeted audiences are retained. Browser upload exercise remains pending.
- Displayed role-switch failures instead of silently ignoring them.

All changes use the existing repository, database, Edge Functions, and Vercel project.

## 4. REMAINING EXTERNAL DEPENDENCIES

- The approved production LHS roster will be supplied separately. No Jeremiah Tasi data was imported or used.
- Browser automation must recover from a credential-protection failure before the remaining signed-in UI tests can continue. Pi/Admin login succeeded in the testing browser, but file-chooser/new-tab and developer-log operations encountered retained-credential protection; a file-chooser error reset the automation runtime. This is a testing-browser blocker, not evidence that the application's upload itself failed. No further password reset or repeated login is requested.
- Vercel runtime error-log access returned HTTP 403. Deployment inspection works, but runtime-log certification needs appropriate access. No authenticated Vercel CLI is installed in this workspace.

## 5. ROLE MATRIX

| Role | Verified database access | Production-browser evidence |
| --- | --- | --- |
| Creator | Own creator/private details and ticket; network/own-team content; no leadership channel or campaign writes; no other-team/private attachments; own-content moderation only | User confirmed login; Creator active role and completed password change verified in DB. Full agent-observed browser workflows pending. |
| Manager | Assigned-team roster/content/tickets/attachment records plus leadership channel; no private contacts or other-team scope; scoped campaign management; team moderation without restore | Complete browser workflow pending. |
| Admin | Network-wide test content, tickets and attachment records; account-access transactions; archive/restore; moderation restore | Provisioning, archive/restore, campaigns, community, announcements, support, roster/metrics imports and authentication exercised. New controls and remaining flows pending. |

## 6. SECURITY RESULT

All 29 public tables retain RLS; none has RLS disabled. `crm-uploads` is private with a 20 MB limit and explicit allowed MIME types. Profile images intentionally use a public avatar bucket with a 5 MB limit and PNG/JPEG/WEBP/GIF allowlist. No service-role key was added to client source.

Administrative transaction and import RPCs are denied to anonymous/authenticated clients and executable only by the service role. Published Admin/import/sync Edge Functions retain JWT verification, validate Auth users, and require an active Admin role with first-login completion. Attachment signing reads attachment metadata through the caller's RLS before issuing a 60-second URL. Full cross-role Storage delivery still requires browser verification.

Current security advisor warnings:

- Leaked-password protection is disabled. This is an existing Auth configuration warning.
- `moderate_community` is intentionally executable by signed-in users as SECURITY DEFINER to perform only scoped hide/restore operations. It derives the actor from `auth.uid()`, checks active-account and content permissions, and restricts restore to Admin. Positive and negative authorization tests passed. This is a reviewed warning, not a claim that all callable definer functions are safe by default.

Sampled Supabase logs from 14:31–14:51 UTC showed 198 successful API responses, three successful username-login function responses, and one username-login 401. No 5xx responses appeared in that sample. This is limited traffic evidence, not full runtime certification.

Data safety: all **666 original battles** remain. The current roster contains only the disposable `qa_creator_launch` account needed for role testing. Earlier disposable roster/import/campaign/community fixtures were removed, with audit/import evidence retained. Two private QA text objects and their inactive announcement/resolved support-ticket parents still require supported Storage API cleanup. No claim is made that cleanup is complete. The interrupted campaign upload attempt created no campaign record; no campaign-import regression fixtures remain.

## 7. ACCESSIBILITY RESULT

**Not yet certified.** Readability and temporary-credential improvements are deployed. Required 100%, 125%, and 150% zoom, keyboard/focus, contrast, and desktop/laptop/tablet/mobile checks remain pending in an authenticated browser. Do not mark these passed based on a build or database test.

## 8. DEPLOYMENT RESULT

Latest application release: `5279f6eba56dd60d4403166173f1a101e7d7ea8a`.

- GitHub CI push run **39442910508: success**. https://github.com/LHS-ADMIN/CRM/actions/runs/39442910508
- Vercel production deployment **dpl_CXMYbh8oZxas3vnGDoGe9kX4bF4V: READY**.
- Production URL: https://crm-taupe-sigma.vercel.app
- Local TypeScript and production build passed; production dependency audit found zero vulnerabilities.
- Database migrations applied to the existing project. Updated Admin/import/sync Edge Functions are ACTIVE with JWT verification enabled.
- Source and deployed database changes are recorded in GitHub. Documentation commit `29ccaf80b72cbacd35f179aa280ecf7cae6ab3ab` also deployed READY as `dpl_HcrUXQi1yK6Huh2anuzEQDdRbw24`. This report may be followed by another documentation-only commit.
- Vercel runtime-log access remains blocked by 403. Application console/network checks for the complete signed-in workflow are pending.

## 9. REAL CREATOR IMPORT READINESS

**Final clearance withheld.** Disposable roster XLSX tests and transactional database safeguards passed. Mia should wait until the remaining authenticated Creator/Manager, private-upload, accessibility, and release-cleanup checks are complete. No approved production roster has been loaded.
