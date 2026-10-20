import { createClient } from "npm:@supabase/supabase-js@2";
const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json","Cache-Control":"no-store"}});
const DEFAULT_TEMPORARY_PASSWORD="LHS2026!";
function normalizeRoles(value:unknown):string[]{const allowed=new Set(["creator","manager","admin"]);if(!Array.isArray(value))return[];return[...new Set(value.map(String).map(x=>x.toLowerCase()).filter(x=>allowed.has(x)))]}
function normalizeHandle(value:unknown){const raw=String(value??"").trim();if(!raw)return null;return raw.startsWith("@")?raw:`@${raw}`}
function creatorAgencyId(){return `LHS-${crypto.randomUUID().replaceAll("-","").slice(0,10).toUpperCase()}`}
Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
  if(req.method!=="POST")return json({error:"Method not allowed"},405);
  try{
    const authHeader=req.headers.get("Authorization");
    if(!authHeader?.startsWith("Bearer "))return json({error:"Unauthorized"},401);
    const url=Deno.env.get("SUPABASE_URL")??"",anonKey=Deno.env.get("SUPABASE_ANON_KEY")??"",serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
    if(!url||!anonKey||!serviceKey)return json({error:"Server configuration error"},500);
    const token=authHeader.slice(7);
    const userClient=createClient(url,anonKey,{global:{headers:{Authorization:authHeader}},auth:{persistSession:false,autoRefreshToken:false}});
    const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:authData,error:authError}=await userClient.auth.getUser(token);
    if(authError||!authData.user)return json({error:"Unauthorized"},401);
    const actorId=authData.user.id;
    const [{data:roleRow},{data:actorProfile}]=await Promise.all([
      userClient.from("user_roles").select("role").eq("user_id",actorId).eq("role","admin").maybeSingle(),
      userClient.from("profiles").select("login_username,active,active_role,must_change_password").eq("id",actorId).maybeSingle()
    ]);
    if(!roleRow||actorProfile?.active!==true||actorProfile?.active_role!=="admin"||actorProfile?.must_change_password!==false)return json({error:"Admin role must be active"},403);
    const body=await req.json();const action=String(body?.action??"");
    if(action==="create"){
      const username=String(body?.username??"").trim().toLowerCase(),displayName=String(body?.displayName??"").trim();
      const roles=normalizeRoles(body?.roles),teamIds=Array.isArray(body?.teamIds)?[...new Set(body.teamIds.map(String))]:[];
      const existingCreatorId=body?.creatorId?String(body.creatorId):null,createCreator=Boolean(body?.createCreator),creatorTeamId=body?.teamId?String(body.teamId):null;
      const tiktokHandle=normalizeHandle(body?.tiktokHandle),niche=body?.niche?String(body.niche).trim():null;
      if(!/^[a-z0-9][a-z0-9._-]{2,49}$/.test(username))return json({error:"Username must be 3-50 characters using letters, numbers, dot, underscore, or hyphen."},400);
      if(!displayName)return json({error:"Display name is required."},400);
      if(!roles.length)return json({error:"At least one role is required."},400);
      if(createCreator&&!roles.includes("creator"))return json({error:"Creator access requires the creator role."},400);
      const {data:existing}=await admin.from("profiles").select("id").eq("login_username",username).maybeSingle();
      if(existing)return json({error:"Username already exists."},409);
      const temp=String(body?.temporaryPassword??"")||DEFAULT_TEMPORARY_PASSWORD;
      if(temp.length<8)return json({error:"Temporary password must be at least 8 characters."},400);
      const email=`${username}@login.lhs-live.com`;
      const {data:created,error:createError}=await admin.auth.admin.createUser({email,password:temp,email_confirm:true,user_metadata:{login_username:username,display_name:displayName},app_metadata:{lhs_provisioned:true}});
      if(createError||!created.user)throw createError??new Error("User creation failed.");
      const userId=created.user.id;let createdCreator:{id:string;agency_creator_id:string}|null=null;
      try{
        const {error:roleError}=await admin.from("user_roles").insert(roles.map(role=>({user_id:userId,role,assigned_by:actorId})));if(roleError)throw roleError;
        const initialRole=roles.includes("admin")?"admin":roles.includes("manager")?"manager":"creator";
        const {error:activeRoleError}=await admin.from("profiles").update({active:true,active_role:initialRole,must_change_password:true,display_name:displayName,login_username:username}).eq("id",userId);if(activeRoleError)throw activeRoleError;
        if(teamIds.length){const {error:teamError}=await admin.from("team_memberships").insert(teamIds.map(team_id=>({team_id,user_id:userId,membership_role:"manager",active:true})));if(teamError)throw teamError}
        if(existingCreatorId){const {data:linked,error:creatorError}=await admin.from("creators").update({auth_user_id:userId}).eq("id",existingCreatorId).is("auth_user_id",null).eq("active",true).select("id").single();if(creatorError||!linked)throw new Error("Creator is inactive, missing, or already has login access.")}
        else if(createCreator){
          const agencyCreatorId=creatorAgencyId();
          const {data:creatorRow,error:creatorError}=await admin.from("creators").insert({agency_creator_id:agencyCreatorId,auth_user_id:userId,creator_name:displayName,display_name:displayName,tiktok_handle:tiktokHandle,team_id:creatorTeamId,niche,status:"active",active:true,join_date:new Date().toISOString().slice(0,10)}).select("id,agency_creator_id").single();
          if(creatorError)throw creatorError;createdCreator=creatorRow;
        }
        await admin.from("audit_log").insert({actor_user_id:actorId,actor_username:actorProfile?.login_username??null,action:createCreator?"creator_account_create":"user_create",entity_type:createCreator?"creators":"profiles",entity_id:createdCreator?.id??userId,result:"success",metadata:{username,roles,teamIds,creatorId:createdCreator?.id??existingCreatorId,agencyCreatorId:createdCreator?.agency_creator_id??null,email_strategy:"internal_username_alias"}});
      }catch(error){await admin.auth.admin.deleteUser(userId);throw error}
      return json({ok:true,userId,username,temporaryPassword:temp,mustChangePassword:true,creatorId:createdCreator?.id??existingCreatorId,agencyCreatorId:createdCreator?.agency_creator_id??null});
    }
    const userId=String(body?.userId??"");if(!userId)return json({error:"userId is required."},400);
    if(userId===actorId&&["set_active","set_roles"].includes(action))return json({error:"Your own access cannot be changed here."},400);
    if(action==="reset_password"){const temp=String(body?.temporaryPassword??"")||DEFAULT_TEMPORARY_PASSWORD;if(temp.length<8)return json({error:"Temporary password must be at least 8 characters."},400);const {error}=await admin.auth.admin.updateUserById(userId,{password:temp});if(error)throw error;const {error:flagError}=await admin.from("profiles").update({must_change_password:true}).eq("id",userId);if(flagError)throw flagError;await admin.from("audit_log").insert({actor_user_id:actorId,actor_username:actorProfile?.login_username??null,action:"password_reset",entity_type:"profiles",entity_id:userId,result:"success",metadata:{temporary_password_policy:"LHS standard; change required at next login"}});return json({ok:true,temporaryPassword:temp,mustChangePassword:true})}
    if(action==="set_active"){const active=Boolean(body?.active);const {error}=await admin.from("profiles").update({active}).eq("id",userId);if(error)throw error;return json({ok:true,active})}
    if(action==="set_roles"){
      const roles=normalizeRoles(body?.roles);
      if(!roles.length)return json({error:"At least one role is required."},400);
      const {error}=await admin.rpc("admin_update_access",{p_actor_id:actorId,p_user_id:userId,p_roles:roles});
      if(error)throw error;return json({ok:true,roles});
    }
    if(action==="set_teams"){
      const teamIds=Array.isArray(body?.teamIds)?[...new Set(body.teamIds.map(String))]:[];
      const {error}=await admin.rpc("admin_update_access",{p_actor_id:actorId,p_user_id:userId,p_team_ids:teamIds});
      if(error)throw error;return json({ok:true,teamIds});
    }
    return json({error:"Unsupported action."},400);
  }catch(error){console.error(error);return json({error:error instanceof Error?error.message:"Unexpected server error"},500)}
});