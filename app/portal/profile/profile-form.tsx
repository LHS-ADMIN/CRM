"use client";
import { ChangeEvent, FormEvent, useState } from "react";
import { AtSign, CalendarDays, Camera, IdCard, LockKeyhole, MapPin, Phone, Save, Sparkles, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function ProfileForm({userId,profile,creator,details}:{userId:string;profile:any;creator:any;details:any}){
  const[msg,setMsg]=useState("");
  const[busy,setBusy]=useState(false);
  const[photo,setPhoto]=useState(profile?.avatar_url||creator?.profile_photo_url||"");

  async function imageChange(e:ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0];if(!file)return;
    if(!["image/png","image/jpeg","image/webp","image/gif"].includes(file.type)||file.size>5*1024*1024){setMsg("Choose a JPG, PNG, WEBP or GIF no larger than 5 MB.");e.currentTarget.value="";return;}
    setBusy(true);setMsg("");
    const supabase=createClient();
    const ext=file.name.split(".").pop()?.toLowerCase()||"jpg";
    const path=`${userId}/avatar-${Date.now()}.${ext}`;
    const {error}=await supabase.storage.from("profile-images").upload(path,file,{upsert:true});
    if(error){setMsg(error.message);setBusy(false);return;}
    const {data}=supabase.storage.from("profile-images").getPublicUrl(path);
    setPhoto(data.publicUrl);
    const p=await supabase.from("profiles").update({avatar_url:data.publicUrl}).eq("id",userId);
    if(p.error){setMsg(p.error.message);setBusy(false);return;}
    if(creator)await supabase.from("creators").update({profile_photo_url:data.publicUrl}).eq("id",creator.id);
    setMsg("Profile photo updated.");setBusy(false);
  }

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setMsg("");
    const f=new FormData(e.currentTarget);
    const supabase=createClient();
    const displayName=String(f.get("display_name")||"").trim();
    const realName=String(f.get("real_name")||"").trim();
    const bio=String(f.get("bio")||"").trim();
    const niche=String(f.get("niche")||"").trim();
    if(!displayName){setMsg("Display name is required.");setBusy(false);return;}
    if(realName.length>150){setMsg("Real name must be 150 characters or fewer.");setBusy(false);return;}
    if(bio.length>200){setMsg("Bio must be 200 characters or fewer.");setBusy(false);return;}

    const p=await supabase.from("profiles").update({display_name:displayName}).eq("id",userId);
    if(p.error){setMsg(p.error.message);setBusy(false);return;}

    const d=await supabase.from("profile_details").upsert({
      user_id:userId,
      real_name:realName||null,
      email:String(f.get("email")||"").trim()||null,
      phone:String(f.get("phone")||"").trim()||null,
      address:String(f.get("address")||"").trim()||null,
      birthday:String(f.get("birthday")||"").trim()||null,
      bio:bio||null,
      niche:niche||null
    },{onConflict:"user_id"});
    if(d.error){setMsg(d.error.message);setBusy(false);return;}

    if(creator){
      const c=await supabase.from("creators").update({display_name:displayName,niche:niche||null,bio:bio||null}).eq("id",creator.id);
      if(c.error){setMsg(c.error.message);setBusy(false);return;}
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
      <label className={busy?"btn disabled":"btn"}><Camera size={16}/> Change photo<input className="file-picker-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={imageChange} disabled={busy}/></label>
      <p>JPG, PNG, WEBP or GIF. Maximum 5 MB.</p>
      <div className="privacy-note"><LockKeyhole size={16}/><span>Real name, phone, email, address and birthday are private.</span></div>
    </aside>

    <form className="panel card-pad profile-form profile-details-card" onSubmit={submit}>
      {msg&&<div role="status" aria-live="polite" className={msg.includes("saved")||msg.includes("updated")?"success":"error"}>{msg}</div>}
      <div className="panel-head inner"><div><span className="section-kicker">Profile details</span><h2>Tell LHS who you are</h2><p>Your display name and creator information are public inside LHS. Your real name and contact details stay private.</p></div><UserRound size={24}/></div>

      <div className="form-grid">
        <div className="field"><label htmlFor="profile-form-display_name">Display name</label><input id="profile-form-display_name" className="input" name="display_name" defaultValue={creator?.display_name||profile?.display_name||""}/></div>
        <div className="field"><label htmlFor="profile-form-niche"><Sparkles size={15}/> Niche</label><input id="profile-form-niche" className="input" name="niche" defaultValue={details?.niche||""} placeholder="Beauty, comedy, gaming, lifestyle…"/></div>
      </div>

      <div className="field"><label htmlFor="profile-form-bio">Bio <span className="muted">(200 characters maximum)</span></label><textarea id="profile-form-bio" className="textarea" name="bio" maxLength={200} rows={4} defaultValue={details?.bio||""} placeholder="A short description creators and leadership can use to understand your brand."/></div>

      <div className="private-section enhanced-private">
        <div className="private-head"><div><strong>Private personal information</strong><span>Visible only to you and active Admin users</span></div><LockKeyhole size={19}/></div>
        <div className="form-grid">
          <div className="field"><label htmlFor="profile-form-real_name"><IdCard size={15}/> Real name</label><input id="profile-form-real_name" className="input" name="real_name" maxLength={150} defaultValue={details?.real_name||""} placeholder="First and last name"/></div>
          <div className="field"><label htmlFor="profile-form-email"><AtSign size={15}/> Email</label><input id="profile-form-email" className="input" name="email" type="email" defaultValue={details?.email||""} placeholder="name@example.com"/></div>
          <div className="field"><label htmlFor="profile-form-phone"><Phone size={15}/> Phone number</label><input id="profile-form-phone" className="input" name="phone" type="tel" defaultValue={details?.phone||""} placeholder="(555) 555-5555"/></div>
          <div className="field"><label htmlFor="profile-form-birthday"><CalendarDays size={15}/> Birthday</label><input id="profile-form-birthday" className="input" name="birthday" type="date" defaultValue={details?.birthday||""}/></div>
          <div className="field full-width"><label htmlFor="profile-form-address"><MapPin size={15}/> Address</label><input id="profile-form-address" className="input" name="address" defaultValue={details?.address||""} placeholder="Street, city, state, ZIP"/></div>
        </div>
      </div>

      <div className="profile-save-row"><button className="btn primary" disabled={busy}><Save size={17}/>{busy?"Saving…":"Save profile"}</button><span>Your private information is protected by role-based permissions.</span></div>
    </form>
  </div>;
}
