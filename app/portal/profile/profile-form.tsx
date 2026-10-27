"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AtSign, CalendarDays, Camera, Download, IdCard, Image as ImageIcon, LockKeyhole, MapPin, Move, Phone, RefreshCw, Save, Sparkles, UserRound, ZoomIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const CANVAS_SIZE=1080;
const PHOTO_DIAMETER=760;
const RING_ASSET="/lhs-profile-ring.svg";

function loadImage(src:string){
  return new Promise<HTMLImageElement>((resolve,reject)=>{
    const image=new Image();
    if(/^https?:/i.test(src))image.crossOrigin="anonymous";
    image.decoding="async";
    image.onload=()=>resolve(image);
    image.onerror=()=>reject(new Error("The photo could not be loaded."));
    image.src=src;
  });
}

async function drawComposite(canvas:HTMLCanvasElement,src:string,zoom:number,offsetX:number,offsetY:number){
  const ctx=canvas.getContext("2d");
  if(!ctx)throw new Error("Your browser could not open the image editor.");
  const [photo,ring]=await Promise.all([loadImage(src),loadImage(RING_ASSET)]);
  canvas.width=CANVAS_SIZE;
  canvas.height=CANVAS_SIZE;
  ctx.clearRect(0,0,CANVAS_SIZE,CANVAS_SIZE);

  const baseScale=Math.max(PHOTO_DIAMETER/photo.width,PHOTO_DIAMETER/photo.height);
  const renderWidth=photo.width*baseScale*zoom;
  const renderHeight=photo.height*baseScale*zoom;
  const maxPanX=Math.max(0,(renderWidth-PHOTO_DIAMETER)/2);
  const maxPanY=Math.max(0,(renderHeight-PHOTO_DIAMETER)/2);
  const x=(CANVAS_SIZE-renderWidth)/2+(offsetX/100)*maxPanX;
  const y=(CANVAS_SIZE-renderHeight)/2+(offsetY/100)*maxPanY;

  ctx.save();
  ctx.beginPath();
  ctx.arc(CANVAS_SIZE/2,CANVAS_SIZE/2,PHOTO_DIAMETER/2,0,Math.PI*2);
  ctx.clip();
  ctx.drawImage(photo,x,y,renderWidth,renderHeight);
  ctx.restore();
  ctx.drawImage(ring,0,0,CANVAS_SIZE,CANVAS_SIZE);
}

function canvasBlob(canvas:HTMLCanvasElement){
  return new Promise<Blob>((resolve,reject)=>{
    canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("The finished profile image could not be generated.")),"image/webp",0.94);
  });
}

function canvasPngBlob(canvas:HTMLCanvasElement){
  return new Promise<Blob>((resolve,reject)=>{
    canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("The PNG profile image could not be generated.")),"image/png");
  });
}

export function ProfileForm({userId,profile,creator,details}:{userId:string;profile:any;creator:any;details:any}){
  const router=useRouter();
  const canvasRef=useRef<HTMLCanvasElement|null>(null);
  const inputRef=useRef<HTMLInputElement|null>(null);
  const legacyOriginal=profile?.avatar_original_url||creator?.profile_photo_url||profile?.avatar_url||"";
  const[msg,setMsg]=useState("");
  const[busy,setBusy]=useState(false);
  const[publicPhoto,setPublicPhoto]=useState(profile?.avatar_url||creator?.profile_photo_url||"");
  const[originalUrl,setOriginalUrl]=useState(legacyOriginal);
  const[sourceUrl,setSourceUrl]=useState(legacyOriginal);
  const[sourceFile,setSourceFile]=useState<File|null>(null);
  const[zoom,setZoom]=useState(1);
  const[offsetX,setOffsetX]=useState(0);
  const[offsetY,setOffsetY]=useState(0);
  const[previewReady,setPreviewReady]=useState(false);

  useEffect(()=>{
    let cancelled=false;
    if(!sourceUrl){setPreviewReady(false);return;}
    const canvas=canvasRef.current;
    if(!canvas)return;
    setPreviewReady(false);
    drawComposite(canvas,sourceUrl,zoom,offsetX,offsetY)
      .then(()=>{if(!cancelled)setPreviewReady(true);})
      .catch(err=>{if(!cancelled){setPreviewReady(false);setMsg(err instanceof Error?err.message:"The photo could not be previewed.");}});
    return()=>{cancelled=true;};
  },[sourceUrl,zoom,offsetX,offsetY]);

  function resetPosition(){
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
  }

  function imageChange(e:ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0];
    if(!file)return;
    if(!["image/png","image/jpeg","image/webp","image/gif"].includes(file.type)||file.size>5*1024*1024){
      setMsg("Choose a JPG, PNG, WEBP or GIF no larger than 5 MB.");
      e.currentTarget.value="";
      return;
    }
    if(sourceUrl.startsWith("blob:"))URL.revokeObjectURL(sourceUrl);
    const next=URL.createObjectURL(file);
    setSourceFile(file);
    setSourceUrl(next);
    resetPosition();
    setMsg("New photo loaded. Position it inside the ring, then save.");
  }

  function regenerate(){
    if(!originalUrl)return;
    if(sourceUrl.startsWith("blob:"))URL.revokeObjectURL(sourceUrl);
    setSourceFile(null);
    setSourceUrl(originalUrl);
    resetPosition();
    if(inputRef.current)inputRef.current.value="";
    setMsg("Saved original restored. Adjust it and regenerate the LHS image.");
  }

  async function saveRingedPhoto(){
    if(!sourceUrl||!canvasRef.current)return;
    setBusy(true);
    setMsg("");
    const supabase=createClient();
    try{
      await drawComposite(canvasRef.current,sourceUrl,zoom,offsetX,offsetY);
      let storedOriginal=originalUrl;

      if(sourceFile){
        const extByType:Record<string,string>={
          "image/png":"png",
          "image/jpeg":"jpg",
          "image/webp":"webp",
          "image/gif":"gif"
        };
        const ext=extByType[sourceFile.type]||"jpg";
        const originalPath=`${userId}/original-${Date.now()}.${ext}`;
        const originalUpload=await supabase.storage.from("profile-images").upload(originalPath,sourceFile,{
          cacheControl:"3600",
          contentType:sourceFile.type,
          upsert:false
        });
        if(originalUpload.error)throw originalUpload.error;
        storedOriginal=supabase.storage.from("profile-images").getPublicUrl(originalPath).data.publicUrl;
      }

      if(!storedOriginal)throw new Error("Choose a profile photo before generating the LHS image.");

      const finished=await canvasBlob(canvasRef.current);
      const ringPath=`${userId}/lhs-ring-${Date.now()}.webp`;
      const ringUpload=await supabase.storage.from("profile-images").upload(ringPath,finished,{
        cacheControl:"3600",
        contentType:"image/webp",
        upsert:false
      });
      if(ringUpload.error)throw ringUpload.error;
      const ringedUrl=supabase.storage.from("profile-images").getPublicUrl(ringPath).data.publicUrl;

      const updated=await supabase.from("profiles").update({
        avatar_original_url:storedOriginal,
        avatar_url:ringedUrl
      }).eq("id",userId);
      if(updated.error)throw updated.error;

      setOriginalUrl(storedOriginal);
      setPublicPhoto(ringedUrl);
      setSourceFile(null);
      setSourceUrl(storedOriginal);
      if(inputRef.current)inputRef.current.value="";
      setMsg("LHS profile image saved. Your Creator Directory and Community avatar are updated.");
      router.refresh();
    }catch(error){
      setMsg(error instanceof Error?error.message:"The LHS profile image could not be saved.");
    }finally{
      setBusy(false);
    }
  }

  async function exportRingedPhoto(){
    if(!sourceUrl||!canvasRef.current||!previewReady)return;
    setBusy(true);
    setMsg("");
    try{
      await drawComposite(canvasRef.current,sourceUrl,zoom,offsetX,offsetY);
      const blob=await canvasPngBlob(canvasRef.current);
      const safeName=String(profile?.login_username||creator?.agency_creator_id||"creator")
        .replace(/[^a-z0-9_-]+/gi,"-")
        .replace(/^-+|-+$/g,"")||"creator";
      const filename=`LHS-${safeName}-profile.png`;
      const file=new File([blob],filename,{type:"image/png"});
      const shareData={files:[file],title:"LHS Creator Network profile image"};

      if(typeof navigator!=="undefined" && typeof navigator.share==="function" && typeof navigator.canShare==="function" && navigator.canShare(shareData)){
        try{
          await navigator.share(shareData);
          setMsg("LHS profile image ready to save or share.");
        }catch(error){
          if(error instanceof DOMException && error.name==="AbortError"){
            setMsg("Export canceled.");
          }else{
            throw error;
          }
        }
      }else{
        const url=URL.createObjectURL(blob);
        const anchor=document.createElement("a");
        anchor.href=url;
        anchor.download=filename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(()=>URL.revokeObjectURL(url),1000);
        setMsg("LHS profile image exported as PNG.");
      }
    }catch(error){
      setMsg(error instanceof Error?error.message:"The LHS profile image could not be exported.");
    }finally{
      setBusy(false);
    }
  }

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    setBusy(true);
    setMsg("");
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
    setMsg("Profile saved.");
    setBusy(false);
    router.refresh();
  }

  return <div className="profile-layout enhanced-profile lhs-ring-profile-layout">
    <aside className="panel profile-photo-card profile-identity-card lhs-ring-card">
      <div className="profile-cover-glow"/>
      <div className="current-avatar-block">
        <span className="section-kicker">Current public avatar</span>
        <div className="profile-photo lhs-current-avatar">{publicPhoto?<img src={publicPhoto} alt="Current public profile"/>:<span>{(profile?.display_name||"L")[0].toUpperCase()}</span>}</div>
        <h2>{profile?.display_name}</h2>
        <span className="profile-username">@{profile?.login_username}</span>
        {creator?.agency_creator_id&&<span className="creator-id-lock">Creator ID · {creator.agency_creator_id}</span>}
      </div>

      <div className="ring-builder">
        <div className="ring-builder-head">
          <div><span className="section-kicker">LHS profile ring</span><strong>Build your official LHS avatar</strong></div>
          <ImageIcon size={22}/>
        </div>

        <div className="ring-preview-shell" aria-label="Live LHS profile-ring preview">
          {sourceUrl?<canvas ref={canvasRef} className={previewReady?"ring-preview ready":"ring-preview"}/>:<div className="ring-preview-empty"><Camera size={30}/><strong>Add a photo</strong><span>Your live LHS ring preview will appear here.</span></div>}
        </div>

        <div className="ring-actions">
          <label className={busy?"btn disabled":"btn primary"}><Camera size={16}/> {sourceUrl?"Choose new photo":"Choose photo"}<input ref={inputRef} className="file-picker-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={imageChange} disabled={busy}/></label>
          {profile?.avatar_original_url&&<button type="button" className="btn" onClick={regenerate} disabled={busy}><RefreshCw size={16}/> Regenerate</button>}
        </div>

        {sourceUrl&&<div className="ring-controls">
          <label><span><ZoomIn size={15}/> Zoom</span><output>{zoom.toFixed(2)}×</output><input type="range" min="1" max="2.5" step="0.01" value={zoom} onChange={e=>setZoom(Number(e.target.value))} disabled={busy}/></label>
          <label><span><Move size={15}/> Left / right</span><output>{offsetX}</output><input type="range" min="-100" max="100" step="1" value={offsetX} onChange={e=>setOffsetX(Number(e.target.value))} disabled={busy}/></label>
          <label><span><Move size={15}/> Up / down</span><output>{offsetY}</output><input type="range" min="-100" max="100" step="1" value={offsetY} onChange={e=>setOffsetY(Number(e.target.value))} disabled={busy}/></label>
          <button type="button" className="btn ring-reset" onClick={resetPosition} disabled={busy}>Reset position</button>
        </div>}

        <div className="ring-final-actions">
          <button type="button" className="btn gold ring-save-button" onClick={saveRingedPhoto} disabled={busy||!sourceUrl||!previewReady}><Sparkles size={17}/>{busy?"Working…":"Generate & use in LHS"}</button>
          <button type="button" className="btn ring-export-button" onClick={exportRingedPhoto} disabled={busy||!sourceUrl||!previewReady}><Download size={17}/> Export / save PNG</button>
        </div>
        <p className="ring-help">Your normal photo is preserved. Use the finished image inside LHS, then export the same ringed avatar to save or share on TikTok and other social profiles.</p>
      </div>

      <span className="role-badge">{profile?.active_role||"member"}</span>
      <div className="privacy-note"><LockKeyhole size={16}/><span>Real name, phone, email, address and birthday are private.</span></div>
    </aside>

    <form className="panel card-pad profile-form profile-details-card" onSubmit={submit}>
      {msg&&<div role="status" aria-live="polite" className={msg.includes("saved")||msg.includes("updated")||msg.includes("exported")||msg.includes("ready to save")? "success":"error"}>{msg}</div>}
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
