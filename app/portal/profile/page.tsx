import Link from "next/link";
import { redirect } from "next/navigation";
import { UsersRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";
import { CommunityStatusComposer } from "@/components/community-status-composer";

export default async function ProfilePage(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect("/login");

  const [{data:profile},{data:creator},{data:details}]=await Promise.all([
    supabase.from("profiles").select("display_name,avatar_url,active_role,login_username").eq("id",user.id).single(),
    supabase.from("creators").select("id,display_name,niche,bio,profile_photo_url").eq("auth_user_id",user.id).maybeSingle(),
    supabase.from("profile_details").select("real_name,email,phone,address,birthday,bio,niche").eq("user_id",user.id).maybeSingle()
  ]);

  let legacyContact:null|{email:string|null;phone:string|null;address:string|null}=null;
  if(creator){
    const result=await supabase.from("creator_private_contacts").select("email,phone,address").eq("creator_id",creator.id).maybeSingle();
    legacyContact=result.data;
  }

  const merged={
    real_name:details?.real_name??"",
    email:details?.email??legacyContact?.email??"",
    phone:details?.phone??legacyContact?.phone??"",
    address:details?.address??legacyContact?.address??"",
    birthday:details?.birthday??"",
    bio:details?.bio??creator?.bio??"",
    niche:details?.niche??creator?.niche??""
  };

  return <>
    <div className="page-head elevated-head">
      <div><span className="section-kicker">Account & identity</span><h1>My profile</h1><p>Build your public LHS creator identity while keeping your real name and contact information private.</p></div>
      {creator&&<div className="head-actions"><Link className="btn primary" href={"/portal/community/creators/"+creator.id}><UsersRound size={16}/> View my LHS profile</Link></div>}
    </div>
    <ProfileForm userId={user.id} profile={profile} creator={creator} details={merged}/>
    {creator&&<section className="panel card-pad my-status-panel"><CommunityStatusComposer userId={user.id} displayName={creator.display_name||profile?.display_name||"Creator"}/></section>}
  </>;
}
