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

    const body = await req.json();
    const attachmentId = String(body?.attachmentId ?? "");
    if (!attachmentId) return json({ error: "attachmentId is required" }, 400);

    const { data: attachment, error } = await userClient
      .from("attachments")
      .select("id,bucket_id,object_path,file_name,mime_type")
      .eq("id", attachmentId)
      .maybeSingle();

    if (error) throw error;
    if (!attachment) return json({ error: "Attachment not found or access denied" }, 404);

    const { data: signed, error: signedError } = await admin.storage
      .from(attachment.bucket_id)
      .createSignedUrl(attachment.object_path, 60);

    if (signedError || !signed?.signedUrl) throw signedError ?? new Error("Could not create signed URL");

    return json({
      ok: true,
      fileName: attachment.file_name,
      mimeType: attachment.mime_type,
      signedUrl: signed.signedUrl,
      expiresIn: 60,
    });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "Unexpected server error" }, 500);
  }
});
