"use client";
import { useEffect,useState } from "react";
import { FileText, Image as ImageIcon, Loader2, Paperclip, X, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type AttachmentRecord={id:string;file_name:string;mime_type:string|null;file_size:number|null};
function formatBytes(value:number|null){
 if(!value)return "";
 if(value<1024)return value+" B";
 if(value<1024*1024)return (value/1024).toFixed(1)+" KB";
 return (value/(1024*1024)).toFixed(1)+" MB";
}
export function InlineAttachmentViewer({url,name,mime,onClose}:{url:string;name:string;mime:string|null;onClose:()=>void}){
 useEffect(()=>{
   function onKey(e:KeyboardEvent){if(e.key==="Escape")onClose();}
   document.addEventListener("keydown",onKey);
   return()=>document.removeEventListener("keydown",onKey);
 },[onClose]);
 const image=Boolean(mime?.startsWith("image/"));
 const pdf=mime==="application/pdf";
 return <div className="inline-image-backdrop" role="presentation" onClick={onClose}>
   <section className="inline-image-dialog" role="dialog" aria-modal="true" aria-label={"Viewing "+name} onClick={e=>e.stopPropagation()}>
    <div className="inline-image-toolbar"><strong>{name}</strong><button type="button" className="inline-image-close" onClick={onClose} aria-label="Close image"><X size={22}/></button></div>
    {image?<img className="inline-full-image" src={url} alt={name}/>:pdf?<iframe className="inline-file-frame" src={url} title={name}/>:<div className="inline-file-download"><p>This file cannot be previewed here.</p><a className="btn primary" href={url} download={name}><Download size={17}/> Download file</a></div>}
   </section>
 </div>;
}
function AttachmentItem({item}:{item:AttachmentRecord}){
 const[url,setUrl]=useState<string|null>(null);
 const[viewing,setViewing]=useState(false);
 const[loading,setLoading]=useState(true);
 const image=Boolean(item.mime_type?.startsWith("image/"));
 useEffect(()=>{
   let mounted=true;
   (async()=>{
    const {data}=await createClient().functions.invoke("attachment-url",{body:{attachmentId:item.id}});
    if(mounted){setUrl(data?.signedUrl||null);setLoading(false)}
   })();
   return()=>{mounted=false};
 },[item.id]);
 async function open(){
   setLoading(true);
   const {data,error}=await createClient().functions.invoke("attachment-url",{body:{attachmentId:item.id}});
   setLoading(false);
   if(!error&&data?.signedUrl){setUrl(data.signedUrl);setViewing(true);}
 }
 return <>
  {image&&url?<button className="attachment-image" type="button" onClick={open} title={"View "+item.file_name}>
    <img src={url} alt={item.file_name}/><span><ImageIcon size={15}/>{item.file_name}</span>
  </button>:<button className="attachment-file" type="button" onClick={open} disabled={loading}>
    {loading?<Loader2 size={16} className="spin"/>:<FileText size={16}/>}
    <span><strong>{item.file_name}</strong><small>{formatBytes(item.file_size)}</small></span>
    <ImageIcon size={14}/>
  </button>}
  {viewing&&url&&<InlineAttachmentViewer url={url} name={item.file_name} mime={item.mime_type} onClose={()=>setViewing(false)}/>}
 </>;
}
export function AttachmentDisplay({items}:{items:AttachmentRecord[]}){
 if(!items.length)return null;
 return <div className="attachment-display">
  <div className="attachment-label"><Paperclip size={15}/> Attachments</div>
  <div className="attachment-items">{items.map(item=><AttachmentItem key={item.id} item={item}/>)}</div>
 </div>;
}
