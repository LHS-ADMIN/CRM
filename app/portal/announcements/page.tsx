import { BellRing, CalendarClock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AnnouncementCreateShell } from "@/components/announcement-create-shell";

export default async function AnnouncementsPage(){
  const supabase=await createClient();
  const {data}=await supabase.from("announcements").select("id,title,body,starts_at,ends_at,audience_type").order("starts_at",{ascending:false}).limit(100);
  return <><div className="page-head"><div><span className="section-kicker">Official communications</span><h1>Announcements</h1><p>Important updates from LHS leadership, shown according to your role and team.</p></div><div className="head-actions"><span className="chip accent"><BellRing size={14}/>{data?.length||0} visible</span><AnnouncementCreateShell/></div></div>
  <div className="announcement-grid">{(data||[]).length?(data||[]).map(a=><article className="announcement-card" key={a.id}><div className="announcement-card-icon"><BellRing size={20}/></div><div><div className="split-line"><span className="chip">{a.audience_type}</span><small>{new Date(a.starts_at).toLocaleDateString()}</small></div><h2>{a.title}</h2><p>{a.body}</p>{a.ends_at&&<div className="announcement-expiry"><CalendarClock size={14}/> Visible through {new Date(a.ends_at).toLocaleString()}</div>}</div></article>):<div className="panel empty-state">No announcements are currently available.</div>}</div></>;
}
