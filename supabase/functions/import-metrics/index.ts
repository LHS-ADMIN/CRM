import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});
const s = (v: unknown) => {
  const x = String(v ?? "").trim();
  return x || null;
};
const n = (v: unknown) => {
  if (v === null || v === undefined || v === "") return 0;
  const x = Number(String(v).replace(/,/g, "").trim());
  return Number.isFinite(x) ? x : 0;
};
const pick = (row: Record<string, unknown>, ...keys: string[]) => {
  for (const key of keys) if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== "") return row[key];
  return null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

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
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

    const { data: authData, error: authError } = await userClient.auth.getUser(token);
    if (authError || !authData.user) return json({ error: "Unauthorized" }, 401);
    const actorId = authData.user.id;
    const { data: role } = await userClient.from("user_roles").select("role")
      .eq("user_id", actorId).eq("role", "admin").maybeSingle();
    const { data: actorProfile } = await userClient.from("profiles").select("active,active_role").eq("id", actorId).maybeSingle();
    if (!role || actorProfile?.active !== true || actorProfile?.active_role !== "admin") return json({ error: "Admin role must be active" }, 403);

    const body = await req.json();
    const rows = Array.isArray(body?.rows) ? body.rows : [];
    const sourceFileName = s(body?.sourceFileName);
    const dataPeriod = s(body?.dataPeriod) ?? new Date().toISOString().slice(0, 7);
    if (!rows.length) return json({ error: "No metric rows supplied" }, 400);
    if (rows.length > 10000) return json({ error: "Too many metric rows" }, 400);

    const { data: creators, error: creatorsError } = await admin
      .from("creators")
      .select("id,agency_creator_id,tiktok_handle,creator_name,team_id,teams(name)")
      .eq("active", true);
    if (creatorsError) throw creatorsError;

    const byId = new Map<string, any>();
    const byHandle = new Map<string, any>();
    const byName = new Map<string, any>();
    for (const c of creators ?? []) {
      byId.set(String(c.agency_creator_id).trim().toLowerCase(), c);
      const handle = String(c.tiktok_handle ?? "").replace(/^@/, "").trim().toLowerCase();
      if (handle) byHandle.set(handle, c);
      const name = String(c.creator_name ?? "").trim().toLowerCase();
      if (name) byName.set(name, c);
    }

    const { data: log, error: logError } = await admin.from("import_log").insert({
      import_type: "metrics_current",
      source_file_name: sourceFileName,
      received_count: rows.length,
      status: "processing",
      created_by: actorId,
    }).select("id").single();
    if (logError) throw logError;

    const prepared: Record<string, unknown>[] = [];
    const unmatched: Array<{creatorId?: string|null, handle?: string|null, name?: string|null}> = [];

    for (const raw of rows) {
      const row = raw as Record<string, unknown>;
      const agencyId = s(pick(row, "Creator ID", "Creator ID:", "creator_id", "agency_creator_id"));
      const handleRaw = s(pick(row, "Creator's username", "Creator username", "username", "TikTok handle", "tiktok_handle"));
      const nameRaw = s(pick(row, "Creator Name", "creator_name", "Display name"));
      const handle = handleRaw?.replace(/^@/, "").toLowerCase() ?? null;

      const creator =
        (agencyId ? byId.get(agencyId.toLowerCase()) : null) ??
        (handle ? byHandle.get(handle) : null) ??
        (nameRaw ? byName.get(nameRaw.toLowerCase()) : null);

      if (!creator) {
        unmatched.push({ creatorId: agencyId, handle: handleRaw, name: nameRaw });
        continue;
      }

      prepared.push({
        creator_id: creator.id,
        data_period: dataPeriod,
        tiktok_handle: creator.tiktok_handle,
        team_id: creator.team_id,
        team_name: creator.teams?.name ?? null,
        diamonds: n(pick(row, "Diamond total", "Diamonds", "diamonds")),
        live_duration_seconds: n(pick(row, "LIVE duration seconds", "live_duration_seconds")),
        live_duration_display: s(pick(row, "LIVE duration", "Live duration", "live_duration_display")),
        live_days: n(pick(row, "LIVE days", "Live days", "live_days")),
        new_followers: n(pick(row, "New followers", "new_followers")),
        live_streams: n(pick(row, "LIVE streams", "Live streams", "live_streams")),
        matches: n(pick(row, "Matches", "matches")),
        diamonds_from_matches: n(pick(row, "Diamonds from matches", "diamonds_from_matches")),
        multi_guest_diamonds: n(pick(row, "Multi-guest diamonds", "multi_guest_diamonds")),
        rank: s(pick(row, "Rank", "rank")),
        graduation_status: s(pick(row, "Graduation status", "graduation_status")),
        tier_status: s(pick(row, "Tier", "Tier status", "tier_status")),
        source_file_name: sourceFileName,
        imported_at: new Date().toISOString(),
        import_id: log.id,
      });
    }

    // Current-only rule: replace the snapshot atomically enough for this single-admin workflow.
    const { error: deleteError } = await admin.from("metrics_current").delete().neq("creator_id", "00000000-0000-0000-0000-000000000000");
    if (deleteError) throw deleteError;

    for (let i = 0; i < prepared.length; i += 500) {
      const { error } = await admin.from("metrics_current").insert(prepared.slice(i, i + 500));
      if (error) throw error;
    }

    await admin.from("import_log").update({
      matched_count: prepared.length,
      unmatched_count: unmatched.length,
      created_count: prepared.length,
      status: "completed",
      completed_at: new Date().toISOString(),
      metadata: { unmatched: unmatched.slice(0, 100), currentOnly: true, dataPeriod },
    }).eq("id", log.id);

    return json({
      ok: true,
      importId: log.id,
      received: rows.length,
      matched: prepared.length,
      unmatched: unmatched.length,
      dataPeriod,
    });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "Unexpected server error" }, 500);
  }
});
