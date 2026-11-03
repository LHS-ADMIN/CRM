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
      const {data:unlinkedCreator}=await admin.from("creators")
        .select("id")
        .ilike("tiktok_handle","@"+username)
        .eq("active",true)
        .is("auth_user_id",null)
        .maybeSingle();
      if(unlinkedCreator?.id)return json({error:"Your LHS login has not been activated. Contact your LHS manager for your personal temporary password."},403);
      return json({error:"Invalid username or password."},401);
    }

    if(profile.active!==true)return json({error:"Invalid username or password."},401);
    const {data:state}=await admin.from("account_recovery").select("login_failures,login_locked").eq("user_id",profile.id).maybeSingle();
    if(state?.login_locked)return json({error:"Account locked. Contact your LHS manager for a temporary password.",locked:true,requiresReset:true},423);

    const {data:userData,error:userError}=await admin.auth.admin.getUserById(profile.id);
    const email=userData?.user?.email;
    if(userError||!email)return json({error:"Invalid username or password."},401);

    const auth=createClient(url,anonKey,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data,error}=await auth.auth.signInWithPassword({email,password});
    // Only confirmed incorrect credentials count toward the three-attempt lock.
    // Network errors, Auth service failures, or rate limits must not lock a valid account.
    if(error&&error.code!=="invalid_credentials"){
      console.error("Sign-in provider error",error.code||"unknown");
      return json({error:"Sign-in is temporarily unavailable. Please try again."},503);
    }
    if(!error&&(!data.session||data.user?.id!==profile.id)){
      return json({error:"Sign-in is temporarily unavailable. Please try again."},503);
    }
    if(error){
      const failed=(state?.login_failures||0)+1;
      const {error:writeError}=await admin.from("account_recovery").upsert({
        user_id:profile.id,login_failures:failed,login_locked:failed>=3,updated_at:new Date().toISOString()
      },{onConflict:"user_id"});
      if(writeError){
        console.error("Unable to persist login attempt state");
        return json({error:"Sign-in is temporarily unavailable. Please try again."},503);
      }
      return json({
        error:failed>=3?"Account locked after 3 incorrect passwords. Contact your manager.":"Invalid username or password.",
        locked:failed>=3,requiresReset:failed>=3,remainingAttempts:Math.max(0,3-failed)
      },failed>=3?423:401);
    }
    if(state?.login_failures)await admin.from("account_recovery").update({login_failures:0,login_locked:false,updated_at:new Date().toISOString()}).eq("user_id",profile.id);

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