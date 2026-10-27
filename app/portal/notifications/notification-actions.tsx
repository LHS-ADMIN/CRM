"use client";

import { Check, CheckCheck, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function NotificationActions({id,actionUrl,read}:{id:string;actionUrl:string;read:boolean}){
  const router=useRouter();
  const[busy,setBusy]=useState(false);

  async function markRead(){
    if(read)return true;
    setBusy(true);
    const db=createClient();
    const result=await db.from("notifications").update({read_at:new Date().toISOString()}).eq("id",id);
    setBusy(false);
    if(result.error)return false;
    router.refresh();
    return true;
  }

  async function openNotice(){
    setBusy(true);
    const db=createClient();
    if(!read){
      const result=await db.from("notifications").update({read_at:new Date().toISOString()}).eq("id",id);
      if(result.error){setBusy(false);return;}
    }
    if(actionUrl.startsWith("/"))router.push(actionUrl);
    else window.location.assign(actionUrl);
  }

  return <div className="notification-actions">
    {!read&&<button className="btn notification-read-button" type="button" onClick={markRead} disabled={busy}><Check size={15}/> Mark read</button>}
    <button className="btn primary notification-open-button" type="button" onClick={openNotice} disabled={busy}><ExternalLink size={15}/> Open</button>
  </div>;
}

export function MarkAllNotificationsRead({disabled}:{disabled:boolean}){
  const router=useRouter();
  const[busy,setBusy]=useState(false);

  async function markAll(){
    setBusy(true);
    const db=createClient();
    const result=await db.from("notifications").update({read_at:new Date().toISOString()}).is("read_at",null);
    setBusy(false);
    if(!result.error)router.refresh();
  }

  return <button className="btn" type="button" onClick={markAll} disabled={disabled||busy}><CheckCheck size={16}/>{busy?"Updating…":"Mark all read"}</button>;
}