import Link from "next/link";
import { ArrowLeft, Search, Sparkles, UsersRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function CreatorDirectoryPage({searchParams}:{searchParams:Promise<{q?:string}>}){
  const{q=""}=await searchParams;
  const supabase=await createClient();
  const{data:rows}=await supabase.from("creator_directory")
    .select("creator_id,user_id,display_name,tiktok_handle,avatar_url,niche,bio")
    .eq("active",true).order("display_name").limit(1000);

  const term=q.trim().toLowerCase();
  const creators=(rows||[]).filter(c=>!term||[
    c.display_name,c.tiktok_handle,c.niche,c.bio
  ].some(v=>String(v||"").toLowerCase().includes(term)));

  return <>
    <Link className="btn" href="/portal/community"><ArrowLeft size={16}/> Back to Community</Link>
    <div className="page-head elevated-head directory-page-head">
      <div><span className="section-kicker">LHS Network</span><h1>Creator Directory</h1><p>Everyone in LHS is already connected. Browse the network, discover creators, and visit their profiles—no friend requests required.</p></div>
      <div className="directory-count"><UsersRound size={21}/><strong>{rows?.length||0}</strong><span>active creators</span></div>
    </div>

    <section className="panel creator-network-directory">
      <div className="panel-head"><div><span className="section-kicker">Find your people</span><h2>Meet the LHS creator network</h2></div><form className="search-form directory-search"><Search size={17}/><input name="q" aria-label="Search creator directory" defaultValue={q} placeholder="Search name, TikTok handle, niche…"/></form></div>
      {creators.length?<div className="creator-social-grid">{creators.map(c=><Link href={"/portal/community/creators/"+c.creator_id} className="creator-social-card" key={c.creator_id}>
        <div className="creator-social-cover"><span/><span/><span/></div>
        <div className="creator-social-avatar">{c.avatar_url?<img src={c.avatar_url} alt=""/>:<span>{c.display_name[0]?.toUpperCase()||"L"}</span>}</div>
        <div className="creator-social-body">
          <div className="creator-social-name"><strong>{c.display_name}</strong>{c.user_id&&<span title="Profile can post statuses"><Sparkles size={14}/></span>}</div>
          <span className="creator-social-handle">{c.tiktok_handle||"LHS Creator"}</span>
          <span className="creator-social-niche">{c.niche||"Creator"}</span>
          <p>{c.bio||"Part of the LHS Creator Network."}</p>
          <span className="view-social-profile">View LHS profile →</span>
        </div>
      </Link>)}</div>:<div className="creator-directory-empty"><UsersRound size={32}/><strong>No creators matched that search.</strong><span>Try a name, TikTok handle, or niche.</span></div>}
    </section>
  </>;
}
