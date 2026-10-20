"use client";

import { useDialog } from "@/components/use-dialog";
import { FormEvent, useState } from "react";
import { Copy, Plus, Power, RotateCcw, UserPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Team={id:string;name:string};

export function AddCreatorControl({teams}:{teams:Team[]}){
  const router=useRouter();
  const[open,setOpen]=useState(false);
  const[busy,setBusy]=useState(false);
  const[msg,setMsg]=useState("");
  const[credentials,setCredentials]=useState<{username:string;password:string;agencyId:string|null}|null>(null);
  const dialogRef=useDialog(open,()=>setOpen(false));

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setMsg("");setCredentials(null);
    const form=e.currentTarget;
    const f=new FormData(form);
    const username=String(f.get("username")||"").trim().toLowerCase();
    const displayName=String(f.get("display_name")||"").trim();
    const teamId=String(f.get("team_id")||"").trim()||null;
    const {data,error}=await createClient().functions.invoke("admin-users",{body:{
      action:"create",
      username,
      displayName,
      roles:["creator"],
      createCreator:true,
      tiktokHandle:String(f.get("tiktok_handle")||"").trim()||null,
      niche:String(f.get("niche")||"").trim()||null,
      teamId
    }});
    if(error||data?.error){setMsg(data?.error||error?.message||"Creator could not be added.");setBusy(false);return;}
    setCredentials({username:data.username,password:data.temporaryPassword,agencyId:data.agencyCreatorId||null});
    setMsg("Creator added successfully.");
    setBusy(false);form.reset();router.refresh();
  }

  async function copyCredentials(){
    if(!credentials)return;
    await navigator.clipboard.writeText(`LHS username: ${credentials.username}\nTemporary password: ${credentials.password}\nLogin: https://crm-taupe-sigma.vercel.app`);
    setMsg("Login details copied.");
  }

  return <>
    <button className="btn primary creator-add-button" onClick={()=>{setOpen(true);setMsg("");setCredentials(null)}}><UserPlus size={18}/> Add creator</button>
    {open&&<div className="modal-backdrop" onMouseDown={()=>setOpen(false)}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Add creator" tabIndex={-1} className="modal-card creator-onboard-modal" onMouseDown={e=>e.stopPropagation()}>
        <div className="modal-head">
          <div><span className="section-kicker">Creator access</span><h2>Add a creator by username</h2><p>No email address is required from the Admin. LHS creates the secure sign-in identity automatically.</p></div>
          <button className="icon-button" aria-label="Close dialog" onClick={()=>setOpen(false)}><X size={20}/></button>
        </div>
        {msg&&<div className={msg.includes("successfully")||msg.includes("copied")?"success":"error"}>{msg}</div>}
        {credentials?<div className="credential-card">
          <div className="credential-badge"><UserPlus size={22}/></div>
          <div><span>Creator login created</span><h3>{credentials.username}</h3><p>The creator must change this temporary password after their first login.</p></div>
          <div className="credential-values"><label>Temporary password</label><code>{credentials.password}</code>{credentials.agencyId&&<small>Creator ID: {credentials.agencyId}</small>}</div>
          <button className="btn gold" type="button" onClick={copyCredentials}><Copy size={16}/> Copy login details</button>
          <button className="btn" type="button" onClick={()=>{setCredentials(null);setMsg("")}}><Plus size={16}/> Add another creator</button>
        </div>:
        <form onSubmit={submit}>
          <div className="creator-username-callout"><strong>USERNAME-FIRST ONBOARDING</strong><span>Creators sign in with the username you choose here. A secure sign-in identity is created automatically. The creator receives a temporary password.</span></div>
          <div className="form-grid">
            <div className="field"><label htmlFor="creator-admin-controls-username">Login username</label><input id="creator-admin-controls-username" className="input" name="username" required pattern="[A-Za-z0-9._-]{3,50}" placeholder="creatorname"/></div>
            <div className="field"><label htmlFor="creator-admin-controls-display_name">Display name</label><input id="creator-admin-controls-display_name" className="input" name="display_name" required placeholder="Creator display name"/></div>
            <div className="field"><label htmlFor="creator-admin-controls-tiktok_handle">TikTok handle <span className="muted">(optional)</span></label><input id="creator-admin-controls-tiktok_handle" className="input" name="tiktok_handle" placeholder="@creator"/></div>
            <div className="field"><label htmlFor="creator-admin-controls-niche">Niche <span className="muted">(optional)</span></label><input id="creator-admin-controls-niche" className="input" name="niche" placeholder="Beauty, gaming, lifestyle…"/></div>
          </div>
          {teams.length>0&&<div className="field"><label htmlFor="creator-admin-controls-team_id">Manager team</label><select id="creator-admin-controls-team_id" className="select" name="team_id" defaultValue=""><option value="">Unassigned</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></div>}
          <div className="modal-actions"><button type="button" className="btn" onClick={()=>setOpen(false)}>Cancel</button><button className="btn gold" disabled={busy}><UserPlus size={17}/>{busy?"Creating…":"Create creator access"}</button></div>
        </form>}
      </div>
    </div>}
  </>;
}

export function ArchiveCreatorButton({creatorId,name}:{creatorId:string;name:string}){
  const router=useRouter();
  const[busy,setBusy]=useState(false);
  async function archive(){
    if(!window.confirm(`Deactivate ${name}? They will be removed from the active roster and any linked login will be disabled. Their history and Creator ID will be preserved.`))return;
    setBusy(true);
    const {data,error}=await createClient().functions.invoke("admin-data",{body:{action:"archive_creator",creatorId}});
    if(error||data?.error){window.alert(data?.error||error?.message||"Creator could not be deactivated.");setBusy(false);return;}
    router.refresh();
  }
  return <button className="btn danger-action creator-status-action" type="button" onClick={archive} disabled={busy}><Power size={16}/>{busy?"Deactivating…":"Deactivate"}</button>;
}

export function RestoreCreatorButton({creatorId}:{creatorId:string}){
  const router=useRouter();const[busy,setBusy]=useState(false);const[msg,setMsg]=useState("");
  return <><button className="btn creator-status-action" disabled={busy} onClick={async()=>{setBusy(true);const{error,data}=await createClient().functions.invoke("admin-data",{body:{action:"restore_creator",creatorId}});setBusy(false);if(error||data?.error){setMsg("Creator could not be reactivated.");return;}router.refresh();}}><RotateCcw size={16}/>{busy?"Reactivating…":"Reactivate"}</button>{msg&&<p role="alert">{msg}</p>}</>;
}
