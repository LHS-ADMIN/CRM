"use client";
import { useEffect, useState } from "react";
import { ExternalLink, FileText, Image as ImageIcon, Loader2, Paperclip } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type AttachmentRecord={
  id:string;
  file_name:string;
  mime_type:string|null;
  file_size:number|null;
};

function formatBytes(value:number|null){
  if(!value)return "";
  if(value<1024)return `${value} B`;
  if(value<1024*1024)return `${(value/1024).toFixed(1)} KB`;
  return `${(value/(1024*1024)).toFixed(1)} MB`;
}

function AttachmentItem({item}:{item:AttachmentRecord}){
  const [url,setUrl]=useState<string|null>(null);
  const [loading,setLoading]=useState(true);
  const image=Boolean(item.mime_type?.startsWith("image/"));

  async function signedUrl(){
    const {data,error}=await createClient().functions.invoke("attachment-url",{body:{attachmentId:item.id}});
    if(error||!data?.signedUrl)return null;
    setUrl(data.signedUrl);
    return data.signedUrl as string;
  }

  useEffect(()=>{let alive=true;(async()=>{const next=await signedUrl();if(!alive)return;if(next)setUrl(next);setLoading(false)})();return()=>{alive=false}},[]);

  async function open(){
    const fresh=await signedUrl();
    if(fresh)window.open(fresh,"_blank","noopener,noreferrer");
  }

  if(image&&url){
    return <button className="attachment-image" type="button" onClick={open} title={`Open ${item.file_name}`}>
      <img src={url} alt={item.file_name}/>
      <span><ImageIcon size={15}/>{item.file_name}</span>
    </button>;
  }

  return <button className="attachment-file" type="button" onClick={open} disabled={loading}>
    {loading?<Loader2 size={16} className="spin"/>:<FileText size={16}/>}
    <span><strong>{item.file_name}</strong><small>{formatBytes(item.file_size)}</small></span>
    <ExternalLink size={14}/>
  </button>;
}

export function AttachmentDisplay({items}:{items:AttachmentRecord[]}){
  if(!items.length)return null;
  return <div className="attachment-display">
    <div className="attachment-label"><Paperclip size={15}/> Attachments</div>
    <div className="attachment-items">{items.map(item=><AttachmentItem key={item.id} item={item}/>)}</div>
  </div>;
}
