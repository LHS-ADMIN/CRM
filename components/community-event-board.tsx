"use client";
import { FormEvent,useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays,FileUp,Plus,CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
export type CommunityEvent={id:string;title:string;details:string;event_type:string;starts_at:string;ends_at:string|null;team_id:string|null;file_path:string|null;file_name:string|null;require_ack:boolean};
export function CommunityEventBoard({events,userId,activeRole,teams,initialGoing}:{events:CommunityEvent[];userId:string;activeRole:string;teams:string[];initialGoing:string[]}){
 const router=useRouter();const[showForm,setShowForm]=useState(false);
 const[busy,setBusy]=useState(false);const[message,setMessage]=useState("");
 const[attending,setAttending]=useState<Record<string,boolean>>(()=>Object.fromEntries(initialGoing.map(id=>[id,true])));
 const canCreate=activeRole==="admin"||activeRole==="manager";
 async function createEvent(e:FormEvent<HTMLFormElement>){
  e.preventDefault();const form=e.currentTarget;const f=new FormData(form);
  setBusy(true);setMessage("");
  const db=createClient() as any;
  const startsAt=String(f.get("starts_at")||"");if(!startsAt){setMessage("Choose a date and time.");setBusy(false);return;}
  const {data,error}=await db.from("community_events").insert({
   title:String(f.get("title")||"").trim(),details:String(f.get("details")||"").trim(),
   event_type:String(f.get("event_type")||"meeting"),starts_at:new Date(startsAt).toISOString(),
   ends_at:null,team_id:String(f.get("team_id")||"")||null,created_by:userId,
   require_ack:activeRole==="admin"&&f.get("require_ack")==="on"
  }).select("id").single();
  if(error||!data){setMessage("Event could not be created. Check your role and team.");setBusy(false);return;}
  const file=f.get("file");
  if(file instanceof File&&file.size>0){
   if(!["application/pdf","image/jpeg","image/png","image/webp"].includes(file.type)||file.size>15*1024*1024){
    setMessage("Event saved, but upload must be a PDF or image under 15 MB.");
   }else{
    const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,"-");
    const path=userId+"/events/"+data.id+"/"+Date.now()+"-"+safe;
    const upload=await db.storage.from("crm-uploads").upload(path,file,{contentType:file.type});
    if(upload.error)setMessage("Event saved, but file upload failed.");
    else await db.from("community_events").update({file_path:path,file_name:file.name,file_type:file.type}).eq("id",data.id);
   }
  }
  setBusy(false);setShowForm(false);router.refresh();
 }
 async function rsvp(id:string){
  const {error}=await (createClient() as any).from("event_rsvps").upsert({event_id:id,user_id:userId,status:"going",responded_at:new Date().toISOString()},{onConflict:"event_id,user_id"});
  if(error){setMessage("Could not confirm attendance.");return;}
  setAttending(prev=>({...prev,[id]:true}));
 }
 async function openFile(path:string){
  const {data,error}=await createClient().storage.from("crm-uploads").createSignedUrl(path,90);
  if(error||!data?.signedUrl){setMessage("File could not be opened.");return;}
  window.location.assign(data.signedUrl);
 }
 return <section className="event-board" aria-label="Upcoming events">
  <div className="event-board-header"><div><span className="section-kicker">LHS Calendar</span><h2>Upcoming events</h2><p>Trainings, meetings and campaigns. Past events are automatically hidden.</p></div>{canCreate&&<button type="button" className="btn primary" onClick={()=>setShowForm(v=>!v)}><Plus size={16}/> {showForm?"Close":"Add upcoming event"}</button>}</div>
  {message&&<p role="status" className="error">{message}</p>}
  {showForm&&canCreate&&<form className="panel card-pad event-create-form" onSubmit={createEvent}>
   <div className="form-grid">
    <div className="field"><label>Event title<input className="input" name="title" minLength={3} maxLength={160} required/></label></div>
    <div className="field"><label>Type<select className="select" name="event_type"><option value="training">Training</option><option value="meeting">Meeting</option><option value="campaign">Campaign</option><option value="other">Other</option></select></label></div>
    <div className="field"><label>Date and time<input className="input" type="datetime-local" name="starts_at" required/></label></div>
    <div className="field"><label>Audience<select name="team_id" className="select">{activeRole==="admin"&&<option value="">Entire network</option>}{teams.map(id=><option value={id} key={id}>My team</option>)}</select></label></div>
   </div>
   <label className="field">Details<textarea className="textarea" name="details" rows={4} required/></label>
   <label className="field"><FileUp size={16}/> Optional PDF or image<input type="file" name="file" accept=".pdf,image/jpeg,image/png,image/webp"/></label>
   {activeRole==="admin"&&<label><input type="checkbox" name="require_ack" defaultChecked/> Require a one-time acknowledgment on next login</label>}
   <button className="btn primary" disabled={busy}>{busy?"Saving…":"Publish event"}</button>
  </form>}
  <div className="event-grid">{events.length?events.map(event=><article className="event-card" key={event.id}>
   <span className="chip accent"><CalendarDays size={15}/> {event.event_type}</span>
   <h3>{event.title}</h3>
   <time dateTime={event.starts_at}>{new Date(event.starts_at).toLocaleString("en-US",{timeZone:"America/New_York",dateStyle:"full",timeStyle:"short"})} ET</time>
   <p>{event.details}</p>
   <div className="event-actions">
    <button type="button" className={attending[event.id]?"btn gold":"btn primary"} onClick={()=>rsvp(event.id)} disabled={Boolean(attending[event.id])}>{attending[event.id]?<><CheckCircle2 size={16}/> Attendance confirmed</>:"Confirm attendance"}</button>
    {event.file_path&&<button type="button" className="btn" onClick={()=>openFile(event.file_path!)}>View {event.file_name||"attachment"}</button>}
   </div>
  </article>):<div className="panel card-pad"><p>No upcoming events have been published.</p></div>}</div>
 </section>;
}
