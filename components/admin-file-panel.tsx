"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type FileRow={id:string;file_name:string;bucket_id:string;object_path:string;parent_type:string};
export function AdminFilePanel({files}:{files:FileRow[]}){
  const router=useRouter();
  const [busy,setBusy]=useState<string|null>(null);
  const [message,setMessage]=useState("");
  async function remove(file:FileRow){
    if(!window.confirm(`Permanently delete ${file.file_name}? This removes the file and its attachment record. It cannot be undone.`))return;
    setBusy(file.id);setMessage("");
    try{
      const db=createClient();
      const {error:storageError}=await db.storage.from(file.bucket_id).remove([file.object_path]);
      if(storageError)throw new Error("File could not be deleted. The attachment record was retained.");
      const {data,error}=await db.from("attachments").delete().eq("id",file.id).select("id");
      if(error||!data?.length)throw new Error("File removed, but its attachment record still needs cleanup. Retry this action.");
      setMessage("File and attachment record deleted.");router.refresh();
    }catch(error){setMessage(error instanceof Error?error.message:"File could not be deleted.");}
    finally{setBusy(null);}
  }
  return <details className="panel card-pad"><summary>Manage uploaded files</summary><p>Review announcement, campaign, and support attachments. Deleting a file permanently removes it from its original content.</p><div role="status" aria-live="polite">{message}</div>{files.length?<ul className="admin-file-list">{files.map(file=><li key={file.id}><span><strong>{file.file_name}</strong><small>{file.parent_type.replaceAll("_"," ")}</small></span><button type="button" className="btn danger-action" disabled={busy!==null} onClick={()=>remove(file)}>{busy===file.id?"Deleting…":`Delete ${file.file_name}`}</button></li>)}</ul>:<p>No uploaded attachments.</p>}</details>;
}
