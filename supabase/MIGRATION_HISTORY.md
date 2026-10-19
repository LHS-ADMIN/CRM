# Supabase Migration History

The production project is `uapqewolovgbbhemmphb`.

The initial backend stabilization was performed directly against the connected Supabase project while the GitHub repository was being initialized. The first two migrations contain full SQL. Historical marker files align the repository with the exact production migration versions that Supabase recorded during that bootstrap session.

From this checkpoint forward, every schema change must be committed as a full SQL migration **before** it is applied to production. Do not rewrite or renumber an applied migration.

Production schema verification is performed with generated TypeScript types, Supabase advisors, RLS inspection, and the backend status documents in `docs/`.

## Recorded migrations

- `20261019232712_core_backend`
- `20261019232748_authorization_helpers`
- `20261019232803_settings_read_policy`
- `20261019232815_profiles_self_read`
- `20261019232816_roles_self_read`
- `20261019232818_creators_self_read`
- `20261019232819_contacts_self_read`
- `20261019233056_profiles_admin_and_update`
- `20261019233057_roles_admin_read`
- `20261019233058_teams_scoped_read`
- `20261019233100_creators_manager_admin_read`
- `20261019233101_contacts_self_admin`
- `20261019233108_creator_notes_policies`
- `20261019233109_metrics_read_policies`
- `20261019233110_audit_import_settings_admin_read`
- `20261019233112_core_fk_indexes`
- `20261019233123_battle_campaign_modules`
- `20261019233133_community_announcement_modules`
- `20261019233145_content_support_modules`
- `20261019233155_access_helpers`
- `20261019233205_campaign_access_helpers`
- `20261019233212_battle_read_policy`
- `20261019233213_campaign_header_policies`
- `20261019233214_campaign_child_read_policies`
- `20261019233215_campaign_child_write_policies`
- `20261019233224_community_access_helpers`
- `20261019233230_community_post_policies`
- `20261019233231_community_reply_policies`
- `20261019233232_community_like_policies`
- `20261019233241_announcement_helpers_and_trigger`
- `20261019233245_announcement_policies`
- `20261019233246_notification_policies`
- `20261019233301_support_access_helpers`
- `20261019233306_support_ticket_policies`
- `20261019233307_support_message_policies`
- `20261019233308_settlement_policies`
- `20261019233316_academy_policies`
- `20261019233318_help_policies`
- `20261019233319_attachment_policies`
- `20261019233330_storage_uploads`
- `20261019233341_module_fk_indexes`
- `20261019233403_optimize_core_read_policies`
- `20261019233405_optimize_uid_policies_one`
- `20261019233406_optimize_uid_policies_two`
- `20261019233414_optimize_uid_policies_three`
- `20261019233418_optimize_uid_policies_four`
- `20261019233419_optimize_uid_policies_five`
- `20261019233431_consolidate_campaign_policies`
- `20261019233433_consolidate_campaign_child_policies`
- `20261019233434_consolidate_campaign_target_policies`
- `20261019233441_consolidate_announcement_policies`
- `20261019233442_consolidate_content_admin_policies`
- `20261019233444_consolidate_settings_read_policy`
- `20261019233552_auth_profile_and_audit_helpers`
- `20261019233602_audit_triggers`
- `20261019233909_login_password_audit_rpcs`
- `20261019233946_active_role_enforcement`
- `20261019234323_battle_creator_reconciliation`
- `20261019234353_creator_profile_edit_permissions`
- `20261019234409_profile_directory`
- `20261019234639_enable_http_extension`
- `20261019235309_secure_rpc_wrappers`
