# Backend QA Gate

## Automated checks completed
- All CRM public tables have RLS enabled.
- Supabase security advisor: no findings.
- Foreign-key index advisor issues remediated.
- Active-role authorization implemented.
- Private contact isolation implemented.
- Battle calendar is read-only to portal users.
- Storage bucket is private and protected by RLS.
- Edge Functions require valid JWTs and leadership checks where appropriate.
- Existing 666 battle rows migrated.

## End-to-end tests to run after the first Auth accounts exist
- Creator cannot read another creator or private contact.
- Manager sees only assigned-team creators and no private contact table.
- Admin sees authorized network data.
- Switching roles changes the visible scope.
- Temporary password -> mandatory change flow.
- Account deactivation blocks CRM access.
- Manager team campaign cannot target another manager's team.
- Team community moderation is team-scoped.
- Creator file access requires attachment metadata authorization + signed URL.
- Creator, campaign, metric, and battle import jobs create Import Log records.
