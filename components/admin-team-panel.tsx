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
    e.preventDefault();setBusy(true);setMessage("");
    const f=new FormData(e.currentTarget);
    const {data,error}=await createClient().functions.invoke("admin-data",{body:{action:"create_team",name:String(f.get("name")||""),slug:String(f.get("slug")||"")}});
    setBusy(false);
    if(error||data?.error){setMessage(error?.message||data?.error||"Team creation failed.");return}
    setMessage("Team created.");e.currentTarget.reset();router.refresh();
  }

  return <section className="panel card-pad">
    <div className="panel-head inner"><div><span className="section-kicker">Organization</span><h2>Teams & manager scope</h2></div></div>
    {message&&<div className={message==="Team created."?"success":"error"}>{message}</div>}
    <form onSubmit={createTeam} className="form-grid">
      <div className="field"><label>Team name</label><input className="input" name="name" required/></div>
      <div className="field"><label>Team slug</label><input className="input" name="slug" placeholder="team-name"/></div>
      <div><button className="btn primary" disabled={busy}><Plus size={15}/>{busy?"Creating…":"Create team"}</button></div>
    </form>
    <div className="team-chip-list">{teams.map(t=><span className={t.active?"team-chip":"team-chip inactive"} key={t.id}>{t.name}</span>)}</div>
  </section>;
}
