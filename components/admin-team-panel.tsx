"use client";
import { FormEvent, useState } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AdminTeamPanel({teams}:{teams:{id:string;name:string;slug:string;active:boolean}[]}) {
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");

  async function createTeam(e:FormEvent<HTMLFormElement>){
    e.preventDefault();const form=e.currentTarget;setBusy(true);setMessage("");
    const f=new FormData(form);
    const {data,error}=await createClient().functions.invoke("admin-data",{body:{action:"create_team",name:String(f.get("name")||""),slug:String(f.get("slug")||"")}});
    setBusy(false);
    if(error||data?.error){setMessage(error?.message||data?.error||"Team creation failed.");return}
    setMessage("Team created.");form.reset();router.refresh();
  }

  return <section className="panel card-pad">
    <div className="panel-head inner"><div><span className="section-kicker">Organization</span><h2>Teams & manager scope</h2></div></div>
    {message&&<div className={message==="Team created."?"success":"error"}>{message}</div>}
    <form onSubmit={createTeam} className="form-grid">
      <div className="field"><label htmlFor="admin-team-panel-name">Team name</label><input id="admin-team-panel-name" className="input" name="name" required/></div>
      <div className="field"><label htmlFor="admin-team-panel-slug">Team slug</label><input id="admin-team-panel-slug" className="input" name="slug" placeholder="team-name"/></div>
      <div><button className="btn primary" disabled={busy}><Plus size={15}/>{busy?"Creating…":"Create team"}</button></div>
    </form>
    <div className="team-chip-list">{teams.map(t=><div className="team-chip" key={t.id}><strong>{t.name}</strong><button type="button" className="btn" disabled={busy} onClick={async()=>{const name=window.prompt("Team name",t.name);if(!name?.trim())return;setBusy(true);const{error,data}=await createClient().functions.invoke("admin-data",{body:{action:"update_team",teamId:t.id,name:name.trim()}});setBusy(false);setMessage(error||data?.error?"Team could not be updated.":"Team updated.");router.refresh();}}>Rename</button><button type="button" className="btn" disabled={busy} onClick={async()=>{setBusy(true);const{error,data}=await createClient().functions.invoke("admin-data",{body:{action:"update_team",teamId:t.id,active:!t.active}});setBusy(false);setMessage(error||data?.error?"Team could not be updated.":"Team updated.");router.refresh();}}>{t.active?"Deactivate":"Activate"}</button></div>)}</div>
  </section>;
}
