import { BookOpen, ExternalLink, FileText, GraduationCap, PlayCircle, Sparkles, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

const iconFor=(type:string)=>type==="video"?PlayCircle:type==="pdf"||type==="document"?FileText:BookOpen;

export default async function AcademyPage(){
  const supabase=await createClient();
  const {data}=await supabase.from("academy_resources").select("id,title,description,resource_type,resource_url,audience_type").eq("active",true).order("sort_order").limit(500);
  const official=(data||[]).find(r=>r.resource_url?.includes("tiktok.com/creator-academy"));
  const others=(data||[]).filter(r=>r.id!==official?.id);

  return <>
    <section className="academy-hero">
      <div className="academy-hero-copy"><span className="eyebrow light">LHS Creator Academy</span><h1>Learn smarter. Go LIVE stronger.</h1><p>Education for creator growth, LIVE performance, platform knowledge, and leadership development—all in one place.</p>
        <div className="academy-pill-row"><span><GraduationCap size={16}/> Skill building</span><span><TrendingUp size={16}/> Growth strategy</span><span><Sparkles size={16}/> TikTok education</span></div>
      </div>
      {official&&<a className="tiktok-academy-card" href={official.resource_url||"#"} target="_blank" rel="noreferrer">
        <div className="tiktok-mark">TikTok</div>
        <span>Official resource</span>
        <h2>TikTok Creator Academy</h2>
        <p>Courses, creator tips, monetization guidance, platform features, and account education directly from TikTok.</p>
        <strong>Open Creator Academy <ExternalLink size={17}/></strong>
      </a>}
    </section>

    <div className="academy-section-head"><div><span className="section-kicker">LHS learning library</span><h2>Network resources</h2></div><span className="chip">{others.length} resources</span></div>

    {others.length?<div className="academy-grid">{others.map(r=>{const Icon=iconFor(r.resource_type);return <article className="resource-card rich-card" key={r.id}>
      <div className="resource-icon"><Icon size={25}/></div><span className="chip">{r.resource_type}</span><h2>{r.title}</h2><p>{r.description||"LHS training resource"}</p>
      <div className="resource-footer"><small>{r.audience_type}</small>{r.resource_url&&<a href={r.resource_url} target="_blank" rel="noreferrer">Open resource <ExternalLink size={15}/></a>}</div>
    </article>})}</div>:<section className="empty-feature academy-empty"><div className="empty-feature-icon"><BookOpen size={30}/></div><div><span className="section-kicker">LHS library</span><h2>More training is coming</h2><p>The official TikTok Creator Academy is available above. LHS leadership can add network-specific guides, videos, PDFs, and courses here.</p></div></section>}
  </>;
}
