"use client";

import { FormEvent, useState } from "react";
import { Copy, Plus, Trash2, UserPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Team={id:string;name:string};

export function AddCreatorControl({teams}:{teams:Team[]}){
  const router=useRouter();
  const[open,setOpen]=useState(false);
  const[busy,setBusy]=useState(false);
  const[msg,setMsg]=useState("");
  const[credentials,setCredentials]=useState<{username:string;password:string;agencyId:string|null}|null>(null);

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
    if(error||data?.error){
      setMsg(data?.error||error?.message||"Creator could not be added.");
      setBusy(false);return;
    }
    setCredentials({username:data.username,password:data.temporaryPassword,agencyId:data.agencyCreatorId||null});
    setMsg("Creator added successfully.");
    setBusy(false);
    form.reset();
    router.refresh();
  }

  async function copyCredentials(){
    if(!credentials)return;
    await navigator.clipboard.writeText(`LHS username: ${credentials.username}\nTemporary password: ${credentials.password}\nLogin: https://crm-taupe-sigma.vercel.app`);
    setMsg("Login details copied.");
  }

  return <>
    <button className="btn primary creator-add-button" onClick={()=>{setOpen(true);setMsg("");setCredentials(null)}}><UserPlus size={18}/> Add creator</button>
    {open&&<div className="modal-backdrop" onMouseDown={()=>setOpen(false)}>
      <div className="modal-card creator-onboard-modal" onMouseDown={e=>e.stopPropagation()}>
        <div className="modal-head">
          <div><span className="section-kicker">Creator access</span><h2>Add a creator by username</h2><p>No email address is required from the Admin. LHS creates the secure Supabase sign-in identity behind the scenes.</p></div>
          <button className="icon-button" onClick={()=>setOpen(false)} aria-label="Close"><X size={20}/></button>
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
          <div className="creator-username-callout"><strong>USERNAME-FIRST ONBOARDING</strong><span>Creators sign in with the username you choose here. Supabase's required email field is handled internally and is never part of the creator onboarding form.</span></div>
          <div className="form-grid">
            <div className="field"><label>Login username</label><input className="input" name="username" required pattern="[A-Za-z0-9._-]{3,50}" placeholder="creatorname"/></div>
            <div className="field"><label>Display name</label><input className="input" name="display_name" required placeholder="Creator display name"/></div>
            <div className="field"><label>TikTok handle <span className="muted">(optional)</span></label><input className="input" name="tiktok_handle" placeholder="@creator"/></div>
            <div className="field"><label>Niche <span className="muted">(optional)</span></label><input className="input" name="niche" placeholder="Beauty, gaming, lifestyle…"/></div>
          </div>
          {teams.length>0&&<div className="field"><label>Manager team</label><select className="select" name="team_id" defaultValue=""><option value="">Unassigned</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></div>}
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
    if(!window.confirm(`Remove ${name} from the active LHS roster? Their history will be archived and their login will be disabled.`))return;
    setBusy(true);
    const {data,error}=await createClient().functions.invoke("admin-data",{body:{action:"archive_creator",creatorId}});
    if(error||data?.error){window.alert(data?.error||error?.message||"Creator could not be removed.");setBusy(false);return}
    router.refresh();
  }
  return <button className="mini-action danger-action" type="button" onClick={archive} disabled={busy} title="Remove creator"><Trash2 size={16}/></button>;
}
