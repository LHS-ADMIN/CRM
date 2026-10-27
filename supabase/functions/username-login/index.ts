import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{
  status,headers:{...corsHeaders,"Content-Type":"application/json","Cache-Control":"no-store"}
});

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
  if(req.method!=="POST")return json({error:"Method not allowed"},405);
  try{
    const body=await req.json();
    const username=String(body?.username??"").trim().toLowerCase();
    const password=String(body?.password??"");
    if(!username||!password)return json({error:"Invalid username or password."},401);

    const url=Deno.env.get("SUPABASE_URL")??"";
    const anonKey=Deno.env.get("SUPABASE_ANON_KEY")??"";
    const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
    if(!url||!anonKey||!serviceKey)return json({error:"Sign-in is temporarily unavailable."},500);

    const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
    let {data:profile}=await admin.from("profiles")
      .select("id,active")
      .eq("login_username",username)
      .maybeSingle();

    if(!profile?.id){
      const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(password));
      const passwordHash=Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");
      const expectedFirstLoginHash="0b0a2d58a32348a414da81c623a269edd8f81fb0d945174d269e98672bfcb29d";
      if(passwordHash!==expectedFirstLoginHash)return json({error:"Invalid username or password."},401);

      const {data:creator}=await admin.from("creators")
        .select("id,creator_name,display_name,tiktok_handle,team_id,active,auth_user_id")
        .ilike("tiktok_handle","@"+username)
        .eq("active",true)
        .is("auth_user_id",null)
        .maybeSingle();

      if(!creator?.id)return json({error:"Invalid username or password."},401);

      const displayName=String(creator.display_name||creator.creator_name||creator.tiktok_handle||username).replace(/^@/,"").trim()||username;
      const email=`${username}@login.lhs-live.com`;
      const {data:created,error:createError}=await admin.auth.admin.createUser({
        email,
        password,
        email_confirm:true,
        user_metadata:{login_username:username,display_name:displayName},
        app_metadata:{lhs_provisioned:true,first_login_self_provisioned:true}
      });
      if(createError||!created.user)return json({error:"Your LHS account could not be opened. Please contact LHS support."},500);

      const userId=created.user.id;
      try{
        const {error:profileError}=await admin.from("profiles").upsert({
          id:userId,
          login_username:username,
          display_name:displayName,
          active:true,
          active_role:"creator",
          must_change_password:true
        },{onConflict:"id"});
        if(profileError)throw profileError;

        const {error:roleError}=await admin.from("user_roles").insert({
          user_id:userId,
          role:"creator"
        });
        if(roleError)throw roleError;

        const {data:linked,error:linkError}=await admin.from("creators")
          .update({auth_user_id:userId})
          .eq("id",creator.id)
          .is("auth_user_id",null)
          .eq("active",true)
          .select("id")
          .single();
        if(linkError||!linked)throw linkError||new Error("Creator login could not be linked.");

        await admin.from("audit_log").insert({
          actor_user_id:userId,
          actor_username:username,
          action:"creator_first_login_provision",
          entity_type:"profiles",
          entity_id:userId,
          result:"success",
          metadata:{creator_id:creator.id,team_id:creator.team_id}
        });

        profile={id:userId,active:true};
      }catch(error){
        await admin.auth.admin.deleteUser(userId);
        console.error(error);
        return json({error:"Your LHS account could not be opened. Please contact LHS support."},500);
      }
    }

    if(profile.active!==true)return json({error:"Invalid username or password."},401);

    const {data:userData,error:userError}=await admin.auth.admin.getUserById(profile.id);
    const email=userData?.user?.email;
    if(userError||!email)return json({error:"Invalid username or password."},401);

    const auth=createClient(url,anonKey,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data,error}=await auth.auth.signInWithPassword({email,password});
    if(error||!data.session||data.user.id!==profile.id)return json({error:"Invalid username or password."},401);

    return json({
      access_token:data.session.access_token,
      refresh_token:data.session.refresh_token,
      expires_at:data.session.expires_at,
      token_type:data.session.token_type
    });
  }catch(error){
    console.error(error);
    return json({error:"Sign-in is temporarily unavailable."},500);
  }
});