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
const pick = (row: Record<string, unknown>, ...keys: string[]) => {
  for (const key of keys) if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== "") return row[key];
  return null;
};
function iso(value: unknown) {
  const raw = s(value);
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.valueOf()) ? null : d.toISOString();
}
function slugKey(title: string, start: string) {
  return `${title.trim().toLowerCase().replace(/\s+/g, " ")}|${start}`;
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
    const { data: actorProfile } = await userClient.from("profiles").select("active,active_role,must_change_password").eq("id", actorId).maybeSingle();
    if (!role || actorProfile?.active !== true || actorProfile?.active_role !== "admin" || actorProfile?.must_change_password !== false) return json({ error: "Admin role must be active" }, 403);

    const body = await req.json();
    const rows = Array.isArray(body?.rows) ? body.rows : [];
    const sourceFileName = s(body?.sourceFileName);
    if (!rows.length) return json({ error: "No campaign rows supplied" }, 400);
    if (rows.length > 5000) return json({ error: "Too many campaign rows" }, 400);

    const { data: log, error: logError } = await admin.from("import_log").insert({
      import_type: "campaign_import",
      source_file_name: sourceFileName,
      received_count: rows.length,
      status: "processing",
      created_by: actorId,
    }).select("id").single();
    if (logError) throw logError;

    const prepared: Record<string, unknown>[] = [];
    let invalid = 0;

    for (const raw of rows) {
      const row = raw as Record<string, unknown>;
      const title = s(pick(row, "Name", "Campaign Name", "Activity Name", "title", "name"));
      const start = iso(pick(row, "Start time", "Start Time", "Start", "start_at", "start_time"));
      const end = iso(pick(row, "End time", "End Time", "End", "end_at", "end_time")) ?? start;
      if (!title || !start || !end || new Date(end) < new Date(start)) {
        invalid++;
        continue;
      }
      prepared.push({
        title,
        description: s(pick(row, "Description", "description")),
        start_at: start,
        end_at: end,
        rules: s(pick(row, "Rules", "rules")),
        metric: s(pick(row, "Metric", "metric")),
        status: "scheduled",
        active: true,
        audience_type: "network",
        created_by: actorId,
        source_type: "backstage_import",
        import_key: slugKey(title, start),
        source_metadata: row,
      });
    }

    if (!prepared.length) {
      await admin.from("import_log").update({
        status: "failed", unmatched_count: invalid, completed_at: new Date().toISOString(),
        metadata: { error: "No valid rows" },
      }).eq("id", log.id);
      return json({ error: "No valid campaign rows found" }, 400);
    }

    const {data:counts,error:commitError}=await admin.rpc("commit_campaigns_import",{
      p_rows:prepared,p_import_id:log.id,p_actor_id:actorId,p_invalid:invalid,
    });
    if(commitError){
      await admin.from("import_log").update({status:"failed",unmatched_count:invalid,completed_at:new Date().toISOString(),metadata:{error:commitError.message,code:commitError.code}}).eq("id",log.id);
      return json({error:"Campaign import failed. No campaign rows were changed. Check the Import Log for details."},400);
    }
    return json({ok:true,importId:log.id,received:rows.length,valid:prepared.length,invalid,created:counts?.created??0,updated:counts?.updated??0});
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "Unexpected server error" }, 500);
  }
});
