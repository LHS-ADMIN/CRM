# LHS CRM Backend Status

## Production foundation
- Supabase project: `uapqewolovgbbhemmphb`
- Authentication: Supabase Auth
- Authorization: PostgreSQL Row Level Security with active Creator / Manager / Admin roles
- Storage: private `crm-uploads` bucket
- Battle source: A/B League Google Sheets, CRM read-only
- Metrics: current snapshot only
- Creator identity: permanent Agency Creator ID; TikTok handle may change

## Completed modules
Profiles, roles, teams, creators, private contacts, creator notes, current metrics, battles, campaigns/prizes/targets/leaderboard, community, announcements/notifications, academy/help, support, attachments, settlements, imports, audit logging, account provisioning functions, password reset function, battle sync, creator/campaign/metric imports.

## Security rules
- No public CRM self-registration access.
- Managers are restricted to assigned teams.
- Creator private contacts are self + Admin only.
- Role switching changes the active authorization context; roles do not stack automatically.
- All application tables use RLS.
- The database security advisor currently reports no findings.

## Production data
The 666 existing battle rows from the legacy backend were migrated to Supabase. One legacy row had no time and is preserved as `TBD EST`.
