import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function temporaryPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

function normalizeRoles(value: unknown): string[] {
  const allowed = new Set(["creator", "manager", "admin"]);
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(String).map((x) => x.toLowerCase()).filter((x) => allowed.has(x)))];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!url || !anonKey || !serviceKey) return json({ error: "Server configuration error" }, 500);

    const token = authHeader.slice(7);
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error: authError } = await userClient.auth.getUser(token);
    if (authError || !authData.user) return json({ error: "Unauthorized" }, 401);
    const actorId = authData.user.id;

    const [{ data: roleRow }, { data: actorProfile }] = await Promise.all([
      userClient.from("user_roles").select("role").eq("user_id", actorId).eq("role", "admin").maybeSingle(),
      userClient.from("profiles").select("login_username,active,active_role").eq("id", actorId).maybeSingle(),
    ]);
    if (!roleRow || actorProfile?.active !== true || actorProfile?.active_role !== "admin") return json({ error: "Admin role must be active" }, 403);

    const body = await req.json();
    const action = String(body?.action ?? "");

    if (action === "create") {
      const username = String(body?.username ?? "").trim().toLowerCase();
      const displayName = String(body?.displayName ?? "").trim();
      const roles = normalizeRoles(body?.roles);
      const teamIds = Array.isArray(body?.teamIds) ? [...new Set(body.teamIds.map(String))] : [];
      const creatorId = body?.creatorId ? String(body.creatorId) : null;

      if (!/^[a-z0-9][a-z0-9._-]{2,49}$/.test(username)) {
        return json({ error: "Username must be 3-50 characters using letters, numbers, dot, underscore, or hyphen." }, 400);
      }
      if (!displayName) return json({ error: "Display name is required." }, 400);
      if (!roles.length) return json({ error: "At least one role is required." }, 400);

      const { data: existing } = await admin.from("profiles").select("id").eq("login_username", username).maybeSingle();
      if (existing) return json({ error: "Username already exists." }, 409);

      const temp = String(body?.temporaryPassword ?? "") || temporaryPassword();
      if (temp.length < 10) return json({ error: "Temporary password must be at least 10 characters." }, 400);

      const email = `${username}@login.lhs-live.com`;
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password: temp,
        email_confirm: true,
        user_metadata: { login_username: username, display_name: displayName },
        app_metadata: { lhs_provisioned: true },
      });
      if (createError || !created.user) throw createError ?? new Error("User creation failed.");

      const userId = created.user.id;
      const roleRows = roles.map((role) => ({ user_id: userId, role, assigned_by: actorId }));
      const { error: roleError } = await admin.from("user_roles").insert(roleRows);
      if (roleError) throw roleError;

      const initialRole = roles.includes("admin") ? "admin" : roles.includes("manager") ? "manager" : "creator";
      const { error: activeRoleError } = await admin.from("profiles").update({ active_role: initialRole }).eq("id", userId);
      if (activeRoleError) throw activeRoleError;

      if (teamIds.length) {
        const { error: teamError } = await admin.from("team_memberships").insert(
          teamIds.map((team_id) => ({ team_id, user_id: userId, membership_role: "manager", active: true }))
        );
        if (teamError) throw teamError;
      }

      if (creatorId) {
        const { error: creatorError } = await admin.from("creators").update({ auth_user_id: userId }).eq("id", creatorId);
        if (creatorError) throw creatorError;
      }

      await admin.from("audit_log").insert({
        actor_user_id: actorId,
        actor_username: actorProfile?.login_username ?? null,
        action: "user_create",
        entity_type: "profiles",
        entity_id: userId,
        result: "success",
        metadata: { username, roles, teamIds, creatorId },
      });

      return json({ ok: true, userId, username, temporaryPassword: temp, mustChangePassword: true });
    }

    const userId = String(body?.userId ?? "");
    if (!userId) return json({ error: "userId is required." }, 400);

    if (action === "reset_password") {
      const temp = String(body?.temporaryPassword ?? "") || temporaryPassword();
      if (temp.length < 10) return json({ error: "Temporary password must be at least 10 characters." }, 400);
      const { error } = await admin.auth.admin.updateUserById(userId, { password: temp });
      if (error) throw error;
      await admin.from("profiles").update({ must_change_password: true }).eq("id", userId);
      await admin.from("audit_log").insert({
        actor_user_id: actorId, actor_username: actorProfile?.login_username ?? null,
        action: "password_reset", entity_type: "profiles", entity_id: userId, result: "success",
      });
      return json({ ok: true, temporaryPassword: temp, mustChangePassword: true });
    }

    if (action === "set_active") {
      const active = Boolean(body?.active);
      const { error } = await admin.from("profiles").update({ active }).eq("id", userId);
      if (error) throw error;
      await admin.from("audit_log").insert({
        actor_user_id: actorId, actor_username: actorProfile?.login_username ?? null,
        action: active ? "user_activate" : "user_deactivate",
        entity_type: "profiles", entity_id: userId, result: "success",
      });
      return json({ ok: true, active });
    }

    if (action === "set_roles") {
      const roles = normalizeRoles(body?.roles);
      if (!roles.length) return json({ error: "At least one role is required." }, 400);
      const { error: deleteError } = await admin.from("user_roles").delete().eq("user_id", userId);
      if (deleteError) throw deleteError;
      const { error: insertError } = await admin.from("user_roles").insert(
        roles.map((role) => ({ user_id: userId, role, assigned_by: actorId }))
      );
      if (insertError) throw insertError;
      const preferredRole = roles.includes("admin") ? "admin" : roles.includes("manager") ? "manager" : "creator";
      const { error: profileRoleError } = await admin.from("profiles").update({ active_role: preferredRole }).eq("id", userId);
      if (profileRoleError) throw profileRoleError;
      await admin.from("audit_log").insert({
        actor_user_id: actorId, actor_username: actorProfile?.login_username ?? null,
        action: "roles_change", entity_type: "user_roles", entity_id: userId, result: "success",
        metadata: { roles },
      });
      return json({ ok: true, roles });
    }

    if (action === "set_teams") {
      const teamIds = Array.isArray(body?.teamIds) ? [...new Set(body.teamIds.map(String))] : [];
      const { error: deleteError } = await admin.from("team_memberships").delete().eq("user_id", userId);
      if (deleteError) throw deleteError;
      if (teamIds.length) {
        const { error: insertError } = await admin.from("team_memberships").insert(
          teamIds.map((team_id) => ({ team_id, user_id: userId, membership_role: "manager", active: true }))
        );
        if (insertError) throw insertError;
      }
      await admin.from("audit_log").insert({
        actor_user_id: actorId, actor_username: actorProfile?.login_username ?? null,
        action: "team_memberships_change", entity_type: "team_memberships", entity_id: userId, result: "success",
        metadata: { teamIds },
      });
      return json({ ok: true, teamIds });
    }

    return json({ error: "Unsupported action." }, 400);
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "Unexpected server error" }, 500);
  }
});
