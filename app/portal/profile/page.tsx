import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect("/login");

  const [{data:profile},{data:creator},{data:details}]=await Promise.all([
    supabase.from("profiles").select("display_name,avatar_url,active_role,login_username").eq("id",user.id).single(),
    supabase.from("creators").select("id,display_name,niche,bio,profile_photo_url").eq("auth_user_id",user.id).maybeSingle(),
    supabase.from("profile_details").select("email,phone,address,birthday,bio,niche").eq("user_id",user.id).maybeSingle()
  ]);

  let legacyContact:null|{email:string|null;phone:string|null;address:string|null}=null;
  if(creator){
    const result=await supabase.from("creator_private_contacts").select("email,phone,address").eq("creator_id",creator.id).maybeSingle();
    legacyContact=result.data;
  }

  const merged={
    email:details?.email??legacyContact?.email??"",
    phone:details?.phone??legacyContact?.phone??"",
    address:details?.address??legacyContact?.address??"",
    birthday:details?.birthday??"",
    bio:details?.bio??creator?.bio??"",
    niche:details?.niche??creator?.niche??""
  };

  return <>
    <div className="page-head elevated-head">
      <div><span className="section-kicker">Account & identity</span><h1>My profile</h1><p>Build a complete LHS profile with your contact information, birthday, bio, niche, and profile photo. Private details are limited to you and active Admin users.</p></div>
    </div>
    <ProfileForm userId={user.id} profile={profile} creator={creator} details={merged}/>
  </>;
}
