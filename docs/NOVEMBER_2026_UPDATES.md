# LHS November 2026 CRM Update

Release branch: feature/lhs-november-crm-updates.

## Scope
- Community events, RSVPs, event acknowledgment gate, event PDF/image uploads.
- Mobile navigation accordion, return to top, responsive layout, user-selectable dark mode.
- Community display name/avatar, remove redundant network tag, larger text, safe lightweight rich text.
- Battle A/B Google Sheet source links, Open / Filled / Confirmed labels, changed-opponent/time alerts and 48h unconfirmed cron alert.
- Profile hint stored as private salted service-key HMAC via save-recovery-hint Edge Function; no publicly readable hint.
- Three wrong login attempts lock the account. Manager-assisted temporary password reset scoped to creators on their teams.
- Support ticket inserts notify team managers and admins. Piadmin roles admin/manager/creator and manager memberships across four existing teams.

## Secure recovery limitation
A one-word hint alone is not a sufficient identity check for self-service password resets. No hint-only password change endpoint is enabled; locked users contact their manager for a random temporary password and are required to change it immediately.

## Operations
- Database migration applied in Supabase: lhs_events_recovery_battle_alerts_mobile_upgrade.
- Auth Edge Functions deployed: username-login (login lockout), admin-users (scoped manager reset), save-recovery-hint.
- The A League and B League source sheets remain authoritative and CRM display reflects latest successful battle imports. The links do not perform an immediate read/sync from Google Sheets. Any automated sync requires separate credentialed Google Sheets integration.
- Event notices appear on next portal navigation; acknowledgments are recorded per user/event.
- Existing imported battles and creators are preserved.

## QA
Check authenticated test accounts for Admin, Manager and Creator access, missing/invalid recovery hint scenarios, all event RSVP/file workflows, and mobile devices before broader rollout. 
