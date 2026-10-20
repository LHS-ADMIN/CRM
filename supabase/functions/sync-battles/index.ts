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

function timeTo24(value: string | null | undefined) {
  if (!value) return null;
  const clean = value.replace(/\s+EST$/i, "").trim();
  const m = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  let hour = Number(m[1]);
  const minute = Number(m[2]);
  const ap = m[3].toUpperCase();
  if (ap === "PM" && hour !== 12) hour += 12;
  if (ap === "AM" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
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

    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const token = authHeader.slice(7);
    const { data: authData, error: authError } = await userClient.auth.getUser(token);
    if (authError || !authData.user) return json({ error: "Unauthorized" }, 401);
    const actorId = authData.user.id;

    const { data: adminRole } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", actorId)
      .eq("role", "admin")
      .maybeSingle();
    const { data: actorProfile } = await userClient.from("profiles").select("active,active_role,must_change_password").eq("id", actorId).maybeSingle();
    if (!adminRole || actorProfile?.active !== true || actorProfile?.active_role !== "admin" || actorProfile?.must_change_password !== false) return json({ error: "Admin role must be active" }, 403);

    const body = await req.json();
    const sourceSpreadsheetId = String(body?.sourceSpreadsheetId ?? "").trim();
    const rows = Array.isArray(body?.rows) ? body.rows : [];
    const replaceSource = body?.replaceSource !== false;

    if (!sourceSpreadsheetId) return json({ error: "sourceSpreadsheetId is required" }, 400);
    if (!rows.length) return json({ error: "No battle rows supplied" }, 400);
    if (rows.length > 5000) return json({ error: "Too many rows in one sync" }, 400);

    const { data: creators, error: creatorError } = await admin
      .from("creators")
      .select("id,tiktok_handle,team_id,teams(name)")
      .eq("active", true);
    if (creatorError) throw creatorError;

    const creatorMap = new Map<string, any>();
    for (const c of creators ?? []) {
      const key = String(c.tiktok_handle ?? "").trim().toLowerCase().replace(/^@/, "");
      if (key) creatorMap.set(key, c);
    }

    const prepared = [];
    for (const row of rows) {
      const sourceKey = String(row?.sourceKey ?? "").trim();
      const battleDate = String(row?.battleDate ?? "").trim();
      const timeEst = String(row?.timeEst ?? "").trim();
      const league = String(row?.league ?? "").trim().toUpperCase();
      if (!sourceKey || !/^\d{4}-\d{2}-\d{2}$/.test(battleDate) || !timeEst || !["A","B"].includes(league)) continue;

      const creatorHandle = String(row?.creatorHandle ?? "").trim();
      const matchKey = creatorHandle.toLowerCase().replace(/^@/, "");
      const creator = creatorMap.get(matchKey);

      prepared.push({
        source_key: sourceKey,
        source_spreadsheet_id: sourceSpreadsheetId,
        source_sheet_name: row?.sourceSheetName ? String(row.sourceSheetName) : null,
        source_row: Number.isFinite(Number(row?.sourceRow)) ? Number(row.sourceRow) : null,
        source_confirm: row?.sourceConfirm ? String(row.sourceConfirm) : null,
        creator_id: creator?.id ?? null,
        creator_handle: creatorHandle || null,
        team_id: creator?.team_id ?? null,
        team_name: creator?.teams?.name ?? (row?.teamName ? String(row.teamName) : null),
        lhs_manager: row?.lhsManager ? String(row.lhsManager) : null,
        battle_date: battleDate,
        time_est: /EST$/i.test(timeEst) ? timeEst : `${timeEst} EST`,
        time_sort: timeTo24(timeEst),
        opponent_name: row?.opponentName ? String(row.opponentName) : null,
        opponent_agency: row?.opponentAgency ? String(row.opponentAgency) : null,
        diamond_range: row?.diamondRange ? String(row.diamondRange) : null,
        league,
        battle_sheet_url: row?.battleSheetUrl ? String(row.battleSheetUrl) : null,
        notes: row?.notes ? String(row.notes) : null,
        status: row?.status ? String(row.status).toLowerCase() : "scheduled",
        synced_at: new Date().toISOString(),
      });
    }

    if (!prepared.length) return json({ error: "No valid battle rows supplied" }, 400);

    const { error: upsertError } = await admin
      .from("battles")
      .upsert(prepared, { onConflict: "source_key" });
    if (upsertError) throw upsertError;

    let removed = 0;
    if (replaceSource) {
      const keys = prepared.map((x) => x.source_key);
      const { data: existing, error: existingError } = await admin
        .from("battles")
        .select("id,source_key")
        .eq("source_spreadsheet_id", sourceSpreadsheetId);
      if (existingError) throw existingError;

      const stale = (existing ?? []).filter((x) => !keys.includes(String(x.source_key))).map((x) => x.id);
      if (stale.length) {
        const { error: deleteError } = await admin.from("battles").delete().in("id", stale);
        if (deleteError) throw deleteError;
        removed = stale.length;
      }
    }

    await admin.from("import_log").insert({
      import_type: "battle_sync",
      source_file_id: sourceSpreadsheetId,
      received_count: rows.length,
      matched_count: prepared.filter((x) => x.creator_id).length,
      unmatched_count: prepared.filter((x) => !x.creator_id).length,
      updated_count: prepared.length,
      status: "completed",
      created_by: actorId,
      completed_at: new Date().toISOString(),
      metadata: { removed, validRows: prepared.length },
    });

    return json({
      ok: true,
      received: rows.length,
      synced: prepared.length,
      matchedCreators: prepared.filter((x) => x.creator_id).length,
      unmatchedCreators: prepared.filter((x) => !x.creator_id).length,
      removed,
    });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "Unexpected server error" }, 500);
  }
});
