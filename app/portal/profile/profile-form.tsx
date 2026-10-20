"use client";
import { ChangeEvent, FormEvent, useState } from "react";
import { Camera, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function ProfileForm({userId,profile,creator,contact}:{userId:string;profile:any;creator:any;contact:any}){
  const [msg,setMsg]=useState("");
  const [busy,setBusy]=useState(false);
  const [photo,setPhoto]=useState(profile?.avatar_url||creator?.profile_photo_url||"");

  async function imageChange(e:ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0];
    if(!file)return;
    setBusy(true);setMsg("");
    const supabase=createClient();
    const ext=file.name.split(".").pop()?.toLowerCase()||"jpg";
    const path=`${userId}/avatar-${Date.now()}.${ext}`;
    const {error}=await supabase.storage.from("profile-images").upload(path,file,{upsert:true});
    if(error){setMsg(error.message);setBusy(false);return}
    const {data}=supabase.storage.from("profile-images").getPublicUrl(path);
    setPhoto(data.publicUrl);
    await supabase.from("profiles").update({avatar_url:data.publicUrl}).eq("id",userId);
    if(creator)await supabase.from("creators").update({profile_photo_url:data.publicUrl}).eq("id",creator.id);
    setMsg("Profile photo updated.");setBusy(false);
  }

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setMsg("");
    const f=new FormData(e.currentTarget);
    const supabase=createClient();
    const bio=String(f.get("bio")||"");
    if(bio.length>200){setMsg("Bio must be 200 characters or fewer.");setBusy(false);return}
    const displayName=String(f.get("display_name")||"");
    const p=await supabase.from("profiles").update({display_name:displayName}).eq("id",userId);
    if(p.error){setMsg(p.error.message);setBusy(false);return}
    if(creator){
      const a=await supabase.from("creators").update({display_name:displayName,niche:String(f.get("niche")||""),bio}).eq("id",creator.id);
      if(a.error){setMsg(a.error.message);setBusy(false);return}
      const b=await supabase.from("creator_private_contacts").upsert({creator_id:creator.id,email:String(f.get("email")||"")||null,phone:String(f.get("phone")||"")||null,address:String(f.get("address")||"")||null},{onConflict:"creator_id"});
      if(b.error){setMsg(b.error.message);setBusy(false);return}
    }
    setMsg("Profile saved.");setBusy(false);
  }

  return <div className="profile-layout">
    <aside className="panel profile-photo-card">
      <div className="profile-photo">{photo?<img src={photo} alt="Profile"/>:<span>{(profile?.display_name||"L")[0].toUpperCase()}</span>}</div>
      <h2>{profile?.display_name}</h2>
      <span className="role-badge">{profile?.active_role||"member"}</span>
      <label className={busy?"btn disabled":"btn"}><Camera size={15}/> Change photo<input hidden type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={imageChange} disabled={busy}/></label>
      <p>JPG, PNG, WEBP or GIF. Maximum 5 MB.</p>
    </aside>
    <form className="panel card-pad profile-form" onSubmit={submit}>
      {msg&&<div className={msg.includes("saved")||msg.includes("updated")?"success":"error"}>{msg}</div>}
      <div className="panel-head inner"><div><span className="section-kicker">Profile details</span><h2>Personal information</h2></div></div>
      <div className="form-grid">
        <div className="field"><label>Display name</label><input className="input" name="display_name" defaultValue={creator?.display_name||profile?.display_name||""}/></div>
        {creator&&<div className="field"><label>Niche</label><input className="input" name="niche" defaultValue={creator.niche||""}/></div>}
      </div>
      {creator&&<>
        <div className="field"><label>Bio <span className="muted">(200 characters maximum)</span></label><textarea className="textarea" name="bio" maxLength={200} rows={4} defaultValue={creator.bio||""}/></div>
        <div className="private-section">
          <div className="private-head"><div><strong>Private contact information</strong><span>Creator + Admin only</span></div></div>
          <div className="form-grid"><div className="field"><label>Email</label><input className="input" name="email" type="email" defaultValue={contact?.email||""}/></div><div className="field"><label>Phone</label><input className="input" name="phone" defaultValue={contact?.phone||""}/></div></div>
          <div className="field"><label>Address</label><input className="input" name="address" defaultValue={contact?.address||""}/></div>
        </div>
      </>}
      <button className="btn primary" disabled={busy}><Save size={15}/>{busy?"Saving…":"Save profile"}</button>
    </form>
  </div>;
}
