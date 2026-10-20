"use client";
import {FormEvent,useState} from "react";
import {useRouter} from "next/navigation";
import {createClient} from "@/lib/supabase/client";
export function CreatorEditForm({creator,teams}:{creator:{id:string;display_name:string|null;creator_name:string;tiktok_handle:string|null;niche:string|null;team_id:string|null};teams:{id:string;name:string}[]}){
 const router=useRouter();const[busy,setBusy]=useState(false);const[msg,setMsg]=useState("");
 async function save(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);setBusy(true);const{data,error}=await createClient().functions.invoke("admin-data",{body:{action:"update_creator",creatorId:creator.id,displayName:String(f.get("display")),handle:String(f.get("handle")),niche:String(f.get("niche")),teamId:String(f.get("team"))||null}});setBusy(false);setMsg(error||data?.error?"Creator could not be updated. Check for a duplicate handle.":"Creator updated. Permanent ID preserved.");router.refresh();}
 return <details><summary>Edit creator & team</summary>{msg&&<p role="status">{msg}</p>}<form className="form-grid" onSubmit={save}><label>Display name<input className="input" name="display" defaultValue={creator.display_name||creator.creator_name} required/></label><label>TikTok handle<input className="input" name="handle" defaultValue={creator.tiktok_handle||""}/></label><label>Niche<input className="input" name="niche" defaultValue={creator.niche||""}/></label><label>Team<select className="select" name="team" defaultValue={creator.team_id||""}><option value="">Unassigned</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label><button className="btn primary" disabled={busy}>Save creator</button></form></details>;
}
