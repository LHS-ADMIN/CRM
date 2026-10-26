"use client";

import { FormEvent, useState } from "react";
import { Clock3, FilePenLine, LockKeyhole, MessageSquarePlus, NotebookPen, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Note={
  id:string;
  author_user_id:string;
  author_name:string;
  note_text:string;
  created_at:string;
  updated_at:string;
};

export function CreatorNotes({
  creatorId,
  creatorName,
  currentUserId,
  notes,
  admin
}:{
  creatorId:string;
  creatorName:string;
  currentUserId:string;
  notes:Note[];
  admin:boolean;
}){
  const router=useRouter();
  const[busy,setBusy]=useState(false);
  const[msg,setMsg]=useState("");
  const[editing,setEditing]=useState<string|null>(null);
  const[editText,setEditText]=useState("");

  async function addNote(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    const form=e.currentTarget;
    const data=new FormData(form);
    const note=String(data.get("note")||"").trim();
    if(!note){setMsg("Enter a note before saving.");return;}
    setBusy(true);setMsg("");
    const {error}=await createClient().from("creator_notes").insert({
      creator_id:creatorId,
      author_user_id:currentUserId,
      note_text:note
    });
    setBusy(false);
    if(error){setMsg("The note could not be saved. Check your access and try again.");return;}
    form.reset();
    setMsg("Note added.");
    router.refresh();
  }

  async function saveEdit(noteId:string){
    const text=editText.trim();
    if(!text){setMsg("A note cannot be blank.");return;}
    setBusy(true);setMsg("");
    const {error}=await createClient().from("creator_notes").update({
      note_text:text,
      updated_at:new Date().toISOString()
    }).eq("id",noteId);
    setBusy(false);
    if(error){setMsg("The note could not be updated.");return;}
    setEditing(null);setEditText("");
    setMsg("Note updated.");
    router.refresh();
  }

  async function removeNote(noteId:string){
    if(!window.confirm("Remove this internal note? It will be hidden from the creator record but retained in the database."))return;
    setBusy(true);setMsg("");
    const {error}=await createClient().from("creator_notes").update({
      active:false,
      deleted_at:new Date().toISOString(),
      deleted_by:currentUserId,
      updated_at:new Date().toISOString()
    }).eq("id",noteId);
    setBusy(false);
    if(error){setMsg("The note could not be removed.");return;}
    setMsg("Note removed.");
    router.refresh();
  }

  return <section className="panel card-pad creator-notes-panel">
    <div className="creator-notes-head">
      <div className="creator-notes-title">
        <div className="creator-notes-icon"><NotebookPen size={22}/></div>
        <div><span className="section-kicker">Leadership workspace</span><h2>Internal creator notes</h2><p>Private working notes for Admins and the Manager assigned to this creator.</p></div>
      </div>
      <div className="internal-only-badge"><LockKeyhole size={15}/> Internal only</div>
    </div>

    <form className="creator-note-composer" onSubmit={addNote}>
      <label htmlFor="creator-note-text">Add a note about {creatorName}</label>
      <textarea id="creator-note-text" className="textarea" name="note" maxLength={3000} rows={4} placeholder="Add coaching context, follow-up details, concerns, progress, or other internal information…" required/>
      <div className="creator-note-composer-footer">
        <span>Only authorized LHS leadership can view these notes. Creators cannot see them.</span>
        <button className="btn primary" disabled={busy}><MessageSquarePlus size={17}/>{busy?"Saving…":"Add note"}</button>
      </div>
    </form>

    {msg&&<p className={msg.includes("added")||msg.includes("updated")||msg.includes("removed")?"success":"error"} role="status" aria-live="polite">{msg}</p>}

    <div className="creator-note-history">
      <div className="creator-note-history-head"><strong>Note history</strong><span>{notes.length} {notes.length===1?"note":"notes"}</span></div>
      {notes.length?notes.map(note=><article className="creator-note-card" key={note.id}>
        <div className="creator-note-meta">
          <div><strong>{note.author_user_id===currentUserId?"You":note.author_name}</strong><span><Clock3 size={14}/>{new Date(note.created_at).toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"})}</span></div>
          {admin&&<div className="creator-note-actions">
            <button type="button" className="icon-button bordered" aria-label="Edit note" title="Edit note" onClick={()=>{setEditing(note.id);setEditText(note.note_text)}}><FilePenLine size={17}/></button>
            <button type="button" className="icon-button bordered note-delete" aria-label="Remove note" title="Remove note" onClick={()=>removeNote(note.id)} disabled={busy}><Trash2 size={17}/></button>
          </div>}
        </div>
        {editing===note.id&&admin?<div className="creator-note-editor">
          <textarea className="textarea" maxLength={3000} rows={4} value={editText} onChange={e=>setEditText(e.target.value)}/>
          <div className="head-actions"><button type="button" className="btn" onClick={()=>{setEditing(null);setEditText("")}}>Cancel</button><button type="button" className="btn primary" onClick={()=>saveEdit(note.id)} disabled={busy}>Save changes</button></div>
        </div>:<p>{note.note_text}</p>}
        {note.updated_at!==note.created_at&&<small>Edited</small>}
      </article>):<div className="creator-notes-empty"><NotebookPen size={30}/><div><strong>No internal notes yet</strong><span>Add the first note to begin this creator's leadership history.</span></div></div>}
    </div>
  </section>;
}
