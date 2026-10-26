"use client";
import { FormEvent, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function CommunityStatusComposer({userId,displayName}:{userId:string;displayName:string}){
  const router=useRouter();
  const[busy,setBusy]=useState(false);
  const[msg,setMsg]=useState("");

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    const form=e.currentTarget;
    const f=new FormData(form);
    const body=String(f.get("body")||"").trim();
    if(!body){setMsg("Write something before posting.");return;}
    setBusy(true);setMsg("");
    const{error}=await createClient().from("community_posts").insert({
      channel_type:"network",
      team_id:null,
      author_user_id:userId,
      body
    });
    setBusy(false);
    if(error){setMsg("Your status could not be posted. Please try again.");return;}
    form.reset();
    setMsg("Status posted to the LHS Network.");
    router.refresh();
  }

  return <form className="social-status-composer" onSubmit={submit}>
    <div className="status-composer-head"><Sparkles size={18}/><div><strong>Post a status</strong><span>Share an update as {displayName}. Everyone in LHS can see Network statuses.</span></div></div>
    {msg&&<p role="status" aria-live="polite" className={msg.includes("posted")?"success":"error"}>{msg}</p>}
    <textarea className="textarea" name="body" maxLength={1500} rows={4} required placeholder="What’s happening in your creator world? Share a win, an update, a goal, or something with the LHS community…"/>
    <div className="status-composer-actions"><small>Posts appear in Community and on your LHS profile.</small><button className="btn primary" disabled={busy}><Send size={16}/>{busy?"Posting…":"Post status"}</button></div>
  </form>;
}
