"use client";
import { ChangeEvent, FormEvent, useState } from "react";
import { AtSign, CalendarDays, Camera, LockKeyhole, MapPin, Phone, Save, Sparkles, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function ProfileForm({userId,profile,creator,details}:{userId:string;profile:any;creator:any;details:any}){
  const[msg,setMsg]=useState("");
  const[busy,setBusy]=useState(false);
  const[photo,setPhoto]=useState(profile?.avatar_url||creator?.profile_photo_url||"");

  async function imageChange(e:ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0];if(!file)return;
    setBusy(true);setMsg("");
    const supabase=createClient();
    const ext=file.name.split(".").pop()?.toLowerCase()||"jpg";
    const path=`${userId}/avatar-${Date.now()}.${ext}`;
    const {error}=await supabase.storage.from("profile-images").upload(path,file,{upsert:true});
    if(error){setMsg(error.message);setBusy(false);return}
    const {data}=supabase.storage.from("profile-images").getPublicUrl(path);
    setPhoto(data.publicUrl);
    const p=await supabase.from("profiles").update({avatar_url:data.publicUrl}).eq("id",userId);
    if(p.error){setMsg(p.error.message);setBusy(false);return}
    if(creator)await supabase.from("creators").update({profile_photo_url:data.publicUrl}).eq("id",creator.id);
    setMsg("Profile photo updated.");setBusy(false);
  }

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setMsg("");
    const f=new FormData(e.currentTarget);
    const supabase=createClient();
    const displayName=String(f.get("display_name")||"").trim();
    const bio=String(f.get("bio")||"").trim();
    const niche=String(f.get("niche")||"").trim();
    if(!displayName){setMsg("Display name is required.");setBusy(false);return}
    if(bio.length>200){setMsg("Bio must be 200 characters or fewer.");setBusy(false);return}

    const p=await supabase.from("profiles").update({display_name:displayName}).eq("id",userId);
    if(p.error){setMsg(p.error.message);setBusy(false);return}

    const d=await supabase.from("profile_details").upsert({
      user_id:userId,
      email:String(f.get("email")||"").trim()||null,
      phone:String(f.get("phone")||"").trim()||null,
      address:String(f.get("address")||"").trim()||null,
      birthday:String(f.get("birthday")||"").trim()||null,
      bio:bio||null,
      niche:niche||null
    },{onConflict:"user_id"});
    if(d.error){setMsg(d.error.message);setBusy(false);return}

    if(creator){
      const c=await supabase.from("creators").update({display_name:displayName,niche:niche||null,bio:bio||null}).eq("id",creator.id);
      if(c.error){setMsg(c.error.message);setBusy(false);return}
    }

    setMsg("Profile saved.");setBusy(false);
  }

  return <div className="profile-layout enhanced-profile">
    <aside className="panel profile-photo-card profile-identity-card">
      <div className="profile-cover-glow"/>
      <div className="profile-photo">{photo?<img src={photo} alt="Profile"/>:<span>{(profile?.display_name||"L")[0].toUpperCase()}</span>}</div>
      <h2>{profile?.display_name}</h2>
      <span className="profile-username">@{profile?.login_username}</span>
      <span className="role-badge">{profile?.active_role||"member"}</span>
      <label className={busy?"btn disabled":"btn"}><Camera size={16}/> Change photo<input hidden type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={imageChange} disabled={busy}/></label>
      <p>JPG, PNG, WEBP or GIF. Maximum 5 MB.</p>
      <div className="privacy-note"><LockKeyhole size={16}/><span>Phone, email, address and birthday are private.</span></div>
    </aside>

    <form className="panel card-pad profile-form profile-details-card" onSubmit={submit}>
      {msg&&<div className={msg.includes("saved")||msg.includes("updated")?"success":"error"}>{msg}</div>}
      <div className="panel-head inner"><div><span className="section-kicker">Profile details</span><h2>Tell LHS who you are</h2><p>Keep your profile current so leadership has the right contact and creator information.</p></div><UserRound size={24}/></div>

      <div className="form-grid">
        <div className="field"><label>Display name</label><input className="input" name="display_name" defaultValue={creator?.display_name||profile?.display_name||""}/></div>
        <div className="field"><label><Sparkles size={15}/> Niche</label><input className="input" name="niche" defaultValue={details?.niche||""} placeholder="Beauty, comedy, gaming, lifestyle…"/></div>
      </div>

      <div className="field"><label>Bio <span className="muted">(200 characters maximum)</span></label><textarea className="textarea" name="bio" maxLength={200} rows={4} defaultValue={details?.bio||""} placeholder="A short description creators and leadership can use to understand your brand."/></div>

      <div className="private-section enhanced-private">
        <div className="private-head"><div><strong>Private contact information</strong><span>Visible only to you and active Admin users</span></div><LockKeyhole size={19}/></div>
        <div className="form-grid">
          <div className="field"><label><AtSign size={15}/> Email</label><input className="input" name="email" type="email" defaultValue={details?.email||""} placeholder="name@example.com"/></div>
          <div className="field"><label><Phone size={15}/> Phone number</label><input className="input" name="phone" type="tel" defaultValue={details?.phone||""} placeholder="(555) 555-5555"/></div>
          <div className="field"><label><CalendarDays size={15}/> Birthday</label><input className="input" name="birthday" type="date" defaultValue={details?.birthday||""}/></div>
          <div className="field"><label><MapPin size={15}/> Address</label><input className="input" name="address" defaultValue={details?.address||""} placeholder="Street, city, state, ZIP"/></div>
        </div>
      </div>

      <div className="profile-save-row"><button className="btn primary" disabled={busy}><Save size={17}/>{busy?"Saving…":"Save profile"}</button><span>Your changes are protected by role-based permissions.</span></div>
    </form>
  </div>;
}
