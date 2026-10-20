import { BookOpen, ExternalLink, FileText, PlayCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
const iconFor=(type:string)=>type==="video"?PlayCircle:type==="pdf"||type==="document"?FileText:BookOpen;
export default async function AcademyPage(){
  const supabase=await createClient();
  const {data}=await supabase.from("academy_resources").select("id,title,description,resource_type,resource_url,audience_type").eq("active",true).order("sort_order").limit(500);
  return <><div className="page-head"><div><span className="section-kicker">Creator Academy</span><h1>Learn. Apply. Grow.</h1><p>Role-aware training resources for stronger LIVE performance, creator development, and leadership execution.</p></div></div><div className="academy-grid">{(data||[]).length?(data||[]).map(r=>{const Icon=iconFor(r.resource_type);return <article className="resource-card" key={r.id}><div className="resource-icon"><Icon size={23}/></div><span className="chip">{r.resource_type}</span><h2>{r.title}</h2><p>{r.description||"LHS training resource"}</p><div className="resource-footer"><small>{r.audience_type}</small>{r.resource_url&&<a href={r.resource_url} target="_blank" rel="noreferrer">Open resource <ExternalLink size={14}/></a>}</div></article>}):<div className="panel empty-state">Academy resources will appear here as leadership publishes them.</div>}</div></>;
}
