"use client";
import { FormEvent, useState } from "react";
import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function CommunityComposer({userId,teams,activeRole}:{userId:string;teams:{id:string;name:string}[];activeRole:string}) {
  const router=useRouter();
  const [busy,setBusy]=useState(false);

  async function submit(e:FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const f=new FormData(e.currentTarget);
    const channel=String(f.get("channel")||"network");
    const teamId=channel==="team"?String(f.get("team_id")||""):null;
    const {error}=await createClient().from("community_posts").insert({
      channel_type:channel,
      team_id:teamId||null,
      author_user_id:userId,
      body:String(f.get("body")||"")
    });
    setBusy(false);
    if(!error){e.currentTarget.reset();router.refresh()}
  }

  return <form className="composer" onSubmit={submit}>
    <div className="composer-avatar">LHS</div>
    <div className="composer-main">
      <textarea name="body" rows={3} placeholder="Share an update with your LHS community…" required/>
      <div className="composer-actions">
        <div className="composer-scope">
          <select name="channel" defaultValue="network">
            <option value="network">Network</option>
            {teams.length>0&&<option value="team">Team</option>}
            {["manager","admin"].includes(activeRole)&&<option value="leadership">Leadership</option>}
          </select>
          {teams.length>0&&<select name="team_id" defaultValue={teams[0].id}>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select>}
        </div>
        <button className="btn primary" disabled={busy}><Send size={15}/>{busy?"Posting…":"Post"}</button>
      </div>
    </div>
  </form>;
}
