"use client";
import { useState } from "react";
import { CalendarCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
type PendingEvent={id:string;title:string;details:string;starts_at:string;event_type:string};
export function EventGate({userId,events}:{userId:string;events:PendingEvent[]}){
 const[pending,setPending]=useState(events);
 const[busy,setBusy]=useState(false);
 const[error,setError]=useState("");
 const current=pending[0];
 if(!current)return null;
 async function confirm(){
   setBusy(true);setError("");
   const {error}=await (createClient() as any).from("event_acknowledgments").upsert({event_id:current.id,user_id:userId},{onConflict:"event_id,user_id"});
   setBusy(false);
   if(error){setError("Acknowledgment could not be saved. Try again.");return;}
   setPending(list=>list.slice(1));
 }
 return <div className="event-ack-backdrop" role="presentation"><section role="alertdialog" aria-modal="true" aria-labelledby="event-ack-title" aria-describedby="event-ack-details" className="event-ack-modal">
   <div className="section-kicker"><CalendarCheck size={17}/> Upcoming LHS event</div>
   <h2 id="event-ack-title">{current.title}</h2>
   <p><strong>{new Date(current.starts_at).toLocaleString("en-US",{timeZone:"America/New_York",dateStyle:"full",timeStyle:"short"})} ET</strong></p>
   <p id="event-ack-details">{current.details||"Please review this upcoming LHS event."}</p>
   <p className="muted">You will see this notice only once after acknowledging it. You can RSVP on the Community page.</p>
   {error&&<p role="alert" className="error">{error}</p>}
   <button type="button" className="btn primary" disabled={busy} onClick={confirm}>{busy?"Saving…":"I acknowledge this event"}</button>
 </section></div>;
}
