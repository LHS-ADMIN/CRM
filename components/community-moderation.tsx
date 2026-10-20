"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function CommunityModeration({kind,id,hidden}:{kind:"post"|"reply";id:string;hidden:boolean}) {
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  async function moderate(){
    if(!window.confirm(hidden?"Restore this content to its channel?":"Hide this content from its channel? Admin can restore it later."))return;
    setBusy(true);setError("");
    try{
      const {error}=await createClient().rpc("moderate_community",{p_kind:kind,p_id:id,p_hidden:!hidden});
      if(error)throw error;
      router.refresh();
    }catch{setError("Content could not be updated. Check your permissions and try again.");}
    finally{setBusy(false);}
  }
  return <span><button type="button" className="btn" disabled={busy} onClick={moderate}>{busy?"Saving…":hidden?`Restore ${kind}`:`Hide ${kind}`}</button>{error&&<span role="alert" className="error">{error}</span>}</span>;
}
