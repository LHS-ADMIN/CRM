import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ManagerPasswordReset } from "@/components/manager-password-reset";

export default async function PasswordHelpPage(){
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const [{data:profile},{data:memberships}]=await Promise.all([
  supabase.from("profiles").select("active_role").eq("id",user.id).single(),
  supabase.from("team_memberships").select("team_id").eq("user_id",user.id).eq("active",true)
 ]);
 const role=profile?.active_role;
 if(role!=="manager"&&role!=="admin")redirect("/portal");
 let query=supabase.from("creators").select("id,auth_user_id,creator_name,display_name,tiktok_handle,team_id").eq("active",true).not("auth_user_id","is",null).order("creator_name").limit(300);
 if(role==="manager"){
  const ids=(memberships||[]).map(x=>x.team_id);
  if(!ids.length)return <section className="panel card-pad"><p>No creator team is assigned to your account. Contact your administrator.</p></section>;
  query=query.in("team_id",ids);
 }
 const {data:creators}=await query;
 return <>
  <div className="page-head"><div><span className="section-kicker"><KeyRound size={17}/> Leadership tools</span><h1>Creator password help</h1><p>When a creator cannot recover their password, generate a unique temporary password. They must change it at their next login.</p></div></div>
  <ManagerPasswordReset creators={(creators||[]).filter(x=>x.auth_user_id).map(x=>({userId:x.auth_user_id!,displayName:x.display_name||x.creator_name,handle:x.tiktok_handle||""}))}/>
 </>;
}
