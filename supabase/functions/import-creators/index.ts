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

const str = (v: unknown) => {
  const x = String(v ?? "").trim();
  return x || null;
};

function pick(row: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) if (row[key] !== undefined && row[key] !== null) return row[key];
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let markFailed: (() => Promise<void>) | null = null;
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
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

    const { data: adminRole } = await userClient
      .from("user_roles").select("role")
      .eq("user_id", actorId).eq("role", "admin").maybeSingle();
    const { data: actorProfile } = await userClient.from("profiles").select("active,active_role").eq("id", actorId).maybeSingle();
    if (!adminRole || actorProfile?.active !== true || actorProfile?.active_role !== "admin") return json({ error: "Admin role must be active" }, 403);

    const body = await req.json();
    const rows = Array.isArray(body?.rows) ? body.rows : [];
    const sourceFileName = str(body?.sourceFileName);
    if (!rows.length) return json({ error: "No creator rows supplied" }, 400);
    if (rows.length > 10000) return json({ error: "Too many rows in one import" }, 400);

    const { data: log, error: logError } = await admin.from("import_log").insert({
      import_type: "manage_creators",
      source_file_name: sourceFileName,
      received_count: rows.length,
      status: "processing",
      created_by: actorId,
    }).select("id").single();
    if (logError) throw logError;
    markFailed = async () => { await admin.from("import_log").update({status:"failed",completed_at:new Date().toISOString(),metadata:{error:"Import failed; no replacement committed."}}).eq("id",log.id).eq("status","processing"); };

    const { data: existing, error: existingError } = await admin
      .from("creators")
      .select("id,agency_creator_id,status,active");
    if (existingError) throw existingError;

    const existingMap = new Map((existing ?? []).map((x) => [String(x.agency_creator_id), x]));
    const now = new Date().toISOString();
    const prepared: Record<string, unknown>[] = [];
    let invalid = 0;
    let created = 0;
    let updated = 0;

    for (const raw of rows) {
      const row = raw as Record<string, unknown>;
      const agencyId = str(pick(row, "Creator ID:", "Creator ID", "creator_id", "agency_creator_id"));
      const usernameRaw = str(pick(row, "Creator's username", "Creator username", "username", "tiktok_handle"));
      if (!agencyId || !usernameRaw) {
        invalid++;
        continue;
      }

      const handle = usernameRaw.startsWith("@") ? usernameRaw : `@${usernameRaw}`;
      const current = existingMap.get(agencyId);
      if (current) updated++; else created++;

      prepared.push({
        agency_creator_id: agencyId,
        creator_name: handle,
        tiktok_handle: handle,
        group_name: str(pick(row, "Group", "group_name")),
        creator_network_manager: str(pick(row, "Creator Network manager", "Creator Network Manager", "creator_network_manager")),
        graduation_status: str(pick(row, "Graduation status", "Graduation Status", "graduation_status")),
        relationship_status: str(pick(row, "Relationship status", "Relationship Status", "relationship_status")),
        invitation_type: str(pick(row, "Invitation type", "Invitation Type", "invitation_type")),
        invited_by: str(pick(row, "Invited by", "Invited By", "invited_by")),
        promote_permission: str(pick(row, "Promote permission", "Promote Permission", "promote_permission")),
        backstage_notes: str(pick(row, "Notes", "notes", "backstage_notes")),
        management_relationship_dates: str(pick(row, "Management relationship dates", "management_relationship_dates")),
        renewed_management_relationship_dates: str(pick(row, "Renewed management relationship dates", "renewed_management_relationship_dates")),
        source_imported_at: now,
        source_import_file_name: sourceFileName,
        status: current?.status ?? "active",
        active: current?.active ?? true,
      });
    }

    if (!prepared.length) {
      await admin.from("import_log").update({
        status: "failed",
        unmatched_count: invalid,
        completed_at: now,
        metadata: { error: "No valid rows" },
      }).eq("id", log.id);
      return json({ error: "No valid creator rows found" }, 400);
    }

    const { error: commitError } = await admin.rpc("commit_creators_import", {
      p_rows: prepared, p_import_id: log.id, p_actor_id: actorId, p_invalid: invalid,
    });
    if (commitError) {
      await admin.from("import_log").update({status:"failed",completed_at:new Date().toISOString(),metadata:{error:"Import rolled back; roster unchanged."}}).eq("id",log.id);
      return json({error:"Import failed. No roster changes were saved. Check for duplicate IDs or malformed rows."},400);
    }

    return json({ ok: true, importId: log.id, received: rows.length, valid: prepared.length, invalid, created, updated });
  } catch (error) {
    if(markFailed) await markFailed();
    console.error("Import failed");
    return json({ error: error instanceof Error ? error.message : "Unexpected server error" }, 500);
  }
});
