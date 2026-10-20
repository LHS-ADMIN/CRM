"use client";
import { useDialog } from "@/components/use-dialog";
import { FormEvent, useState } from "react";
import { ImagePlus, Link2, Paperclip, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function safeName(name:string){return name.replace(/[^a-zA-Z0-9._-]/g,"-").slice(-120)}

export function SupportCreateForm({userId,creatorId,teamId}:{userId:string;creatorId:string|null;teamId:string|null}){
  const router=useRouter();const[open,setOpen]=useState(false);const[busy,setBusy]=useState(false);const[msg,setMsg]=useState("");

  const dialogRef=useDialog(open,()=>setOpen(false));
  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setMsg("");
    const form=e.currentTarget;
    const f=new FormData(form);
    const supabase=createClient();
    const {data:ticket,error}=await supabase.from("support_tickets").insert({
      creator_id:creatorId,
      opened_by_user_id:userId,
      team_id:teamId,
      subject:String(f.get("subject")||""),
      description:String(f.get("description")||"")||null,
      external_url:String(f.get("external_url")||"").trim()||null,
      category:String(f.get("category")||"General"),
      priority:String(f.get("priority")||"normal"),
      status:"open"
    }).select("id").single();

    if(error||!ticket){setMsg(error?.message||"Could not create ticket.");setBusy(false);return}

    const file=f.get("attachment");
    if(file instanceof File&&file.size>0){
      if(file.size>20*1024*1024){setMsg("Ticket created, but the attachment is larger than 20 MB.");setBusy(false);router.refresh();return}
      const objectPath=`${userId}/support/${ticket.id}/${Date.now()}-${safeName(file.name)}`;
      const upload=await supabase.storage.from("crm-uploads").upload(objectPath,file,{contentType:file.type||undefined});
      if(upload.error){setMsg(`Ticket created, but file upload failed: ${upload.error.message}`);setBusy(false);router.refresh();return}
      const attachment=await supabase.from("attachments").insert({
        parent_type:"support_ticket",
        parent_id:ticket.id,
        bucket_id:"crm-uploads",
        object_path:objectPath,
        file_name:file.name,
        mime_type:file.type||null,
        file_size:file.size,
        visibility:"owner",
        team_id:teamId,
        creator_id:creatorId,
        uploaded_by:userId
      });
      if(attachment.error){await supabase.storage.from("crm-uploads").remove([objectPath]);setMsg(`Ticket created, but attachment metadata failed: ${attachment.error.message}`);setBusy(false);router.refresh();return}
    }

    setMsg("Ticket created.");setBusy(false);form.reset();router.refresh();
  }

  return <><button className="btn primary" onClick={()=>setOpen(true)}><Plus size={17}/> New ticket</button>{open&&
    <div className="modal-backdrop" onMouseDown={()=>setOpen(false)}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Create support ticket" tabIndex={-1} className="modal-card" onMouseDown={e=>e.stopPropagation()}>
        <div className="modal-head"><div><span className="section-kicker">Support Center</span><h2>Open a support ticket</h2><p>Give leadership enough detail to help quickly. You can include a screenshot, document, or link.</p></div><button className="icon-button" aria-label="Close dialog" onClick={()=>setOpen(false)}><X size={20}/></button></div>
        {msg&&<div className={msg==="Ticket created."?"success":"error"}>{msg}</div>}
        <form onSubmit={submit}>
          <div className="field"><label htmlFor="support-create-form-subject">Subject</label><input id="support-create-form-subject" className="input" name="subject" required placeholder="What do you need help with?"/></div>
          <div className="field"><label htmlFor="support-create-form-description">Details</label><textarea id="support-create-form-description" className="textarea" name="description" rows={5} placeholder="Explain the issue, what happened, and anything leadership should know."/></div>
          <div className="form-grid">
            <div className="field"><label htmlFor="support-create-form-category">Category</label><select id="support-create-form-category" className="select" name="category"><option>General</option><option>Battle</option><option>Campaign</option><option>Account</option><option>Creator Support</option><option>Technical</option></select></div>
            <div className="field"><label htmlFor="support-create-form-priority">Priority</label><select id="support-create-form-priority" className="select" name="priority"><option value="normal">Normal</option><option value="low">Low</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>
          </div>
          <div className="field"><label htmlFor="support-create-form-external_url"><Link2 size={15}/> Optional link</label><input id="support-create-form-external_url" className="input" type="url" name="external_url" placeholder="https://…"/></div>
          <div className="upload-field">
            <div><ImagePlus size={20}/><span><strong>Add screenshot or file</strong><small>Images, PDF, Word, Excel or text · up to 20 MB</small></span></div>
            <label className="btn"><Paperclip size={16}/> Choose file<input hidden type="file" name="attachment" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"/></label>
          </div>
          <div className="modal-actions"><button type="button" className="btn" onClick={()=>setOpen(false)}>Cancel</button><button className="btn gold" disabled={busy}>{busy?"Creating…":"Create ticket"}</button></div>
        </form>
      </div>
    </div>}
  </>;
}
