"use client";
import { useDialog } from "@/components/use-dialog";
import { FormEvent, useState } from "react";
import { ImagePlus, Link2, Megaphone, Paperclip, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function safeName(name:string){return name.replace(/[^a-zA-Z0-9._-]/g,"-").slice(-120)}

export function AnnouncementCreatePanel({userId,activeRole,teams}:{userId:string;activeRole:string;teams:{id:string;name:string}[]}){
  const router=useRouter();
  const[open,setOpen]=useState(false);
  const[busy,setBusy]=useState(false);
  const[msg,setMsg]=useState("");
  const dialogRef=useDialog(open,()=>setOpen(false));
  if(!["manager","admin"].includes(activeRole))return null;

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setMsg("");
    const form=e.currentTarget;
    const f=new FormData(form);
    const audience=activeRole==="manager"?"team":String(f.get("audience_type")||"network");
    const teamId=audience==="team"?String(f.get("team_id")||""):null;
    if(audience==="team"&&!teamId){setMsg("Choose a team.");setBusy(false);return}

    const supabase=createClient();
    const externalUrl=String(f.get("external_url")||"").trim()||null;
    const {data:announcement,error}=await supabase.from("announcements").insert({
      title:String(f.get("title")||""),
      body:String(f.get("body")||""),
      audience_type:audience,
      team_id:teamId||null,
      external_url:externalUrl,
      starts_at:new Date().toISOString(),
      ends_at:f.get("ends_at")?new Date(String(f.get("ends_at"))).toISOString():null,
      active:true,
      created_by:userId
    }).select("id").single();

    if(error||!announcement){setMsg(error?.message||"Could not publish announcement.");setBusy(false);return}

    const file=f.get("attachment");
    if(file instanceof File&&file.size>0){
      if(file.size>20*1024*1024){setMsg("Announcement published, but the attachment is larger than 20 MB.");setBusy(false);router.refresh();return}
      const objectPath=`${userId}/announcements/${announcement.id}/${Date.now()}-${safeName(file.name)}`;
      const upload=await supabase.storage.from("crm-uploads").upload(objectPath,file,{contentType:file.type||undefined});
      if(upload.error){setMsg(`Announcement published, but file upload failed: ${upload.error.message}`);setBusy(false);router.refresh();return}
      const visibility=audience==="network"?"all":audience==="leadership"?"leadership":"team";
      const attachment=await supabase.from("attachments").insert({
        parent_type:"announcement",
        parent_id:announcement.id,
        bucket_id:"crm-uploads",
        object_path:objectPath,
        file_name:file.name,
        mime_type:file.type||null,
        file_size:file.size,
        visibility,
        team_id:teamId||null,
        uploaded_by:userId
      });
      if(attachment.error){await supabase.storage.from("crm-uploads").remove([objectPath]);setMsg(`Announcement published, but attachment metadata failed: ${attachment.error.message}`);setBusy(false);router.refresh();return}
    }

    setMsg("Announcement published.");
    setBusy(false);form.reset();router.refresh();
  }

  return <><button className="btn primary" onClick={()=>setOpen(true)}><Megaphone size={17}/> Publish announcement</button>{open&&
    <div className="modal-backdrop" onMouseDown={()=>setOpen(false)}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Create announcement" tabIndex={-1} className="modal-card" onMouseDown={e=>e.stopPropagation()}>
        <div className="modal-head"><div><span className="section-kicker">Leadership communication</span><h2>Create an announcement</h2><p>Share an update with text, a link, and an optional image or file.</p></div><button className="icon-button" aria-label="Close dialog" onClick={()=>setOpen(false)}><X size={20}/></button></div>
        {msg&&<div role="status" aria-live="polite" className={msg==="Announcement published."?"success":"error"}>{msg}</div>}
        <form onSubmit={submit}>
          <div className="field"><label htmlFor="announcement-create-panel-title">Title</label><input id="announcement-create-panel-title" className="input" name="title" required placeholder="What does the network need to know?"/></div>
          <div className="field"><label htmlFor="announcement-create-panel-body">Message</label><textarea id="announcement-create-panel-body" className="textarea" name="body" rows={6} required placeholder="Write the announcement details…"/></div>
          <div className="form-grid">
            {activeRole==="admin"&&<div className="field"><label htmlFor="announcement-create-panel-audience_type">Audience</label><select id="announcement-create-panel-audience_type" className="select" name="audience_type"><option value="network">Entire network</option><option value="team">Specific team</option><option value="leadership">Leadership only</option></select></div>}
            <div className="field"><label htmlFor="announcement-create-panel-team_id">Team <span className="muted">(when applicable)</span></label><select id="announcement-create-panel-team_id" className="select" name="team_id" defaultValue=""><option value="">Select team</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
          </div>
          <div className="form-grid">
            <div className="field"><label htmlFor="announcement-create-panel-external_url"><Link2 size={15}/> Optional link</label><input id="announcement-create-panel-external_url" className="input" type="url" name="external_url" placeholder="https://…"/></div>
            <div className="field"><label htmlFor="announcement-create-panel-ends_at">Optional expiration</label><input id="announcement-create-panel-ends_at" className="input" type="datetime-local" name="ends_at"/></div>
          </div>
          <div className="upload-field">
            <div><ImagePlus size={20}/><span><strong>Add image or file</strong><small>Images, PDF, Word, Excel or text · up to 20 MB</small></span></div>
            <label className="btn"><Paperclip size={16}/> Choose file<input className="file-picker-input" type="file" name="attachment" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"/></label>
          </div>
          <div className="modal-actions"><button type="button" className="btn" onClick={()=>setOpen(false)}>Cancel</button><button className="btn gold" disabled={busy}>{busy?"Publishing…":"Publish announcement"}</button></div>
        </form>
      </div>
    </div>}
  </>;
}
