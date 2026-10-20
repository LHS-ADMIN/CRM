-- Allow authenticated CRM users to resolve vetted private helper functions.
-- Function EXECUTE grants remain restricted separately.
grant usage on schema private to authenticated, service_role;
