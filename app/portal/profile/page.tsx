import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect("/login");

  const [{data:profile},{data:creator}]=await Promise.all([
    supabase.from("profiles").select("display_name,avatar_url,active_role").eq("id",user.id).single(),
    supabase.from("creators").select("id,display_name,niche,bio,profile_photo_url").eq("auth_user_id",user.id).maybeSingle()
  ]);

  let contact=null;
  if(creator){
    const result=await supabase.from("creator_private_contacts").select("email,phone,address").eq("creator_id",creator.id).maybeSingle();
    contact=result.data;
  }

  return <>
    <div className="page-head"><div><span className="section-kicker">Account & identity</span><h1>My profile</h1><p>Control the profile information attached to your LHS account. Creator contact information remains private.</p></div></div>
    <ProfileForm userId={user.id} profile={profile} creator={creator} contact={contact}/>
  </>;
}
