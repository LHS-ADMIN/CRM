# Deployment

Vercel should deploy this repository's `main` branch.

Required environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Do not place a Supabase service-role/secret key in a browser-exposed environment variable. Supabase Edge Functions receive server-side project secrets from Supabase.

The first LHS Admin must be provisioned through Supabase Auth before normal in-app account provisioning can begin. After the first Admin exists, all additional users should be created using the secured `admin-users` Edge Function.

The A/B League automatic synchronization endpoint is `sync-battles`; the production scheduler/Google credential bridge can call it with a valid active-Admin JWT or use a trusted server integration.
