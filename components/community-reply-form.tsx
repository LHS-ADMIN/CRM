"use client";
import { FormEvent, useState } from "react";
import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function CommunityReplyForm({postId,userId}:{postId:string;userId:string}) {
  const router=useRouter();
  const [open,setOpen]=useState(false);
  const [busy,setBusy]=useState(false);

  async function submit(e:FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f=new FormData(e.currentTarget);
    const body=String(f.get("reply")||"").trim();
    if(!body)return;
    setBusy(true);
    const {error}=await createClient().from("community_replies").insert({
      post_id:postId,
      author_user_id:userId,
      body
    });
    setBusy(false);
    if(!error){setOpen(false);router.refresh()}
  }

  return <div className="reply-control">
    {!open?<button className="post-action" onClick={()=>setOpen(true)}>Reply</button>:
    <form className="reply-form" onSubmit={submit}>
      <input className="input" name="reply" placeholder="Write a reply…" autoFocus/>
      <button className="icon-button bordered" disabled={busy}><Send size={16}/></button>
    </form>}
  </div>;
}
