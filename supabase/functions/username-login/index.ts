import { createClient } from "npm:@supabase/supabase-js@2";
const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json","Cache-Control":"no-store"}});
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
    const {data:profile}=await admin.from("profiles").select("id,active").eq("login_username",username).maybeSingle();
    if(!profile?.id||profile.active!==true)return json({error:"Invalid username or password."},401);
    const {data:userData,error:userError}=await admin.auth.admin.getUserById(profile.id);
    const email=userData?.user?.email;
    if(userError||!email)return json({error:"Invalid username or password."},401);
    const auth=createClient(url,anonKey,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data,error}=await auth.auth.signInWithPassword({email,password});
    if(error||!data.session||data.user.id!==profile.id)return json({error:"Invalid username or password."},401);
    return json({access_token:data.session.access_token,refresh_token:data.session.refresh_token,expires_at:data.session.expires_at,token_type:data.session.token_type});
  }catch(error){
    console.error(error);
    return json({error:"Sign-in is temporarily unavailable."},500);
  }
});