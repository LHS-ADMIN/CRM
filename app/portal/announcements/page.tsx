import { BellRing, CalendarClock, ExternalLink, Megaphone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AnnouncementCreateShell } from "@/components/announcement-create-shell";
import { AttachmentDisplay, type AttachmentRecord } from "@/components/attachment-display";

export default async function AnnouncementsPage(){
  const supabase=await createClient();
  const {data}=await supabase.from("announcements")
    .select("id,title,body,starts_at,ends_at,audience_type,external_url")
    .order("starts_at",{ascending:false}).limit(100);

  const ids=(data||[]).map(a=>a.id);
  const {data:attachments}=ids.length
    ?await supabase.from("attachments").select("id,parent_id,file_name,mime_type,file_size").eq("parent_type","announcement").in("parent_id",ids)
    :{data:[] as (AttachmentRecord&{parent_id:string})[]};

  const byAnnouncement=new Map<string,AttachmentRecord[]>();
  for(const item of attachments||[]){
    const rows=byAnnouncement.get(item.parent_id)||[];
    rows.push(item);
    byAnnouncement.set(item.parent_id,rows);
  }

  return <>
    <div className="page-head elevated-head">
      <div><span className="section-kicker">Official communications</span><h1>Announcements</h1><p>Publish network updates with supporting images, documents, and action links. Visibility follows the selected audience and team permissions.</p></div>
      <div className="head-actions"><span className="chip accent"><BellRing size={15}/>{data?.length||0} visible</span><AnnouncementCreateShell/></div>
    </div>

    {(data||[]).length?
      <div className="announcement-grid rich-announcements">{(data||[]).map(a=>
        <article className="announcement-card rich-card" key={a.id}>
          <div className="announcement-card-icon"><Megaphone size={22}/></div>
          <div className="announcement-body">
            <div className="split-line"><span className="chip">{a.audience_type}</span><small>{new Date(a.starts_at).toLocaleDateString()}</small></div>
            <h2>{a.title}</h2>
            <p>{a.body}</p>
            {a.external_url&&<a className="resource-link" href={a.external_url} target="_blank" rel="noreferrer"><ExternalLink size={16}/> Open attached link</a>}
            <AttachmentDisplay items={byAnnouncement.get(a.id)||[]}/>
            {a.ends_at&&<div className="announcement-expiry"><CalendarClock size={15}/> Visible through {new Date(a.ends_at).toLocaleString()}</div>}
          </div>
        </article>
      )}</div>
      :<section className="empty-feature">
        <div className="empty-feature-icon"><BellRing size={30}/></div>
        <div><span className="section-kicker">Ready when you are</span><h2>No announcements yet</h2><p>Use <strong>Publish announcement</strong> to post the first network update with an image, file, or link.</p></div>
        <AnnouncementCreateShell/>
      </section>
    }
  </>;
}
