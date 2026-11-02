"use client";
import { FormEvent, useRef, useState } from "react";
import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { RichEditorToolbar } from "@/components/rich-editor-toolbar";

export function CommunityComposer({userId,teams,activeRole}:{userId:string;teams:{id:string;name:string}[];activeRole:string}) {
  const editorRef=useRef<HTMLTextAreaElement>(null);
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");

  async function submit(e:FormEvent<HTMLFormElement>) {
    e.preventDefault();const form=e.currentTarget;
    setBusy(true);setMessage("");
    const f=new FormData(form);
    const channel=activeRole==="creator"?"network":String(f.get("channel")||"network");
    const teamId=channel==="team"?String(f.get("team_id")||""):null;
    const {error}=await createClient().from("community_posts").insert({
      channel_type:channel,
      team_id:teamId||null,
      author_user_id:userId,
      body:String(f.get("body")||"")
    });
    setBusy(false);
    if(error){setMessage("Post could not be published. Check your channel and try again.");return;}
    form.reset();router.refresh();
  }

  return <form className="composer" onSubmit={submit}>
    <div className="composer-avatar">LHS</div>
    <div className="composer-main">
      {message&&<div role="alert" className="error">{message}</div>}
      <textarea ref={editorRef} aria-label="Post message" name="body" rows={3} placeholder="Share an update with your LHS community…" required/>
      <RichEditorToolbar editorRef={editorRef}/>
      <div className="composer-actions">
        <div className="composer-scope">
          {activeRole==="creator"?<div className="creator-post-audience"><strong>LHS</strong><span>Everyone in the network</span></div>:<>
          <select aria-label="Post channel" name="channel" defaultValue="network">
            <option value="network">LHS</option>
            {teams.length>0&&<option value="team">Team</option>}
            {["manager","admin"].includes(activeRole)&&<option value="leadership">Leadership</option>}
          </select>
          {teams.length>0&&<select aria-label="Post team" name="team_id" defaultValue={teams[0].id}>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select>}</>}
        </div>
        <button className="btn primary" disabled={busy}><Send size={15}/>{busy?"Posting…":"Post"}</button>
      </div>
    </div>
  </form>;
}
