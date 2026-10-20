import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});
const slugify = (value: string) => value.trim().toLowerCase()
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

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

    const [{ data: role }, { data: actorProfile }] = await Promise.all([
      userClient.from("user_roles").select("role").eq("user_id", actorId).eq("role", "admin").maybeSingle(),
      userClient.from("profiles").select("login_username,active,active_role,must_change_password").eq("id", actorId).maybeSingle(),
    ]);
    if (!role || actorProfile?.active !== true || actorProfile?.active_role !== "admin" || actorProfile?.must_change_password !== false) {
      return json({ error: "Admin role must be active" }, 403);
    }

    const body = await req.json();
    const action = String(body?.action ?? "");

    if (action === "create_team") {
      const name = String(body?.name ?? "").trim();
      if (!name) return json({ error: "Team name is required" }, 400);
      const slug = slugify(String(body?.slug ?? name));
      if (!slug) return json({ error: "Valid team slug is required" }, 400);
      const { data, error } = await admin.from("teams").insert({
        name, slug, active: true, created_by: actorId,
      }).select().single();
      if (error) throw error;
      return json({ ok: true, team: data });
    }

    if (action === "update_team") {
      const teamId = String(body?.teamId ?? "");
      if (!teamId) return json({ error: "teamId is required" }, 400);
      const patch: Record<string, unknown> = {};
      if (body?.name !== undefined) patch.name = String(body.name).trim();
      if (body?.slug !== undefined) patch.slug = slugify(String(body.slug));
      if (body?.active !== undefined) patch.active = Boolean(body.active);
      const { data, error } = await admin.from("teams").update(patch).eq("id", teamId).select().single();
      if (error) throw error;
      return json({ ok: true, team: data });
    }

    if (action === "assign_creator_team") {
      const creatorId = String(body?.creatorId ?? "");
      const teamId = body?.teamId ? String(body.teamId) : null;
      if (!creatorId) return json({ error: "creatorId is required" }, 400);
      const { data, error } = await admin.from("creators").update({ team_id: teamId }).eq("id", creatorId).select().single();
      if (error) throw error;
      return json({ ok: true, creator: data });
    }

    if (action === "update_creator") {
      const creatorId=String(body?.creatorId??"");const display=String(body?.displayName??"").trim();
      if(!creatorId||!display)return json({error:"Creator and display name are required."},400);
      const raw=String(body?.handle??"").trim().replace(/^@/,"");
      if(raw){const{data:conflict}=await admin.from("creators").select("id").ilike("tiktok_handle",`@${raw}`).neq("id",creatorId).limit(1);if(conflict?.length)return json({error:"Handle already belongs to another creator."},409);}
      const{error}=await admin.from("creators").update({display_name:display,tiktok_handle:raw?`@${raw}`:null,niche:String(body?.niche??"").trim()||null,team_id:body?.teamId||null}).eq("id",creatorId);
      if(error)throw error;return json({ok:true});
    }
    if (action === "archive_creator" || action === "restore_creator") {
      const creatorId = String(body?.creatorId ?? "");
      if (!creatorId) return json({ error: "creatorId is required" }, 400);
      const {error} = await admin.rpc("admin_set_creator_active", {
        p_actor_id: actorId, p_creator_id: creatorId, p_active: action === "restore_creator",
      });
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "update_setting") {
      const key = String(body?.key ?? "").trim();
      if (!key) return json({ error: "Setting key is required" }, 400);
      const { data, error } = await admin.from("app_settings").upsert({
        key,
        value: body?.value ?? null,
        description: body?.description ? String(body.description) : null,
        public_readable: Boolean(body?.publicReadable),
        updated_by: actorId,
        updated_at: new Date().toISOString(),
      }, { onConflict: "key" }).select().single();
      if (error) throw error;
      return json({ ok: true, setting: data });
    }

    return json({ error: "Unsupported action" }, 400);
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "Unexpected server error" }, 500);
  }
});
