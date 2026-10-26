import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, Search, Sparkles, UsersRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE=30;

function directoryHref(page:number,q:string){
  const params=new URLSearchParams();
  if(q.trim())params.set("q",q.trim());
  if(page>1)params.set("page",String(page));
  const query=params.toString();
  return "/portal/community/creators"+(query?"?"+query:"");
}

export default async function CreatorDirectoryPage({searchParams}:{searchParams:Promise<{q?:string;page?:string}>}){
  const{q="",page:pageParam="1"}=await searchParams;
  const supabase=await createClient();
  const{data:rows}=await supabase.from("creator_directory")
    .select("creator_id,user_id,display_name,tiktok_handle,avatar_url,niche,bio")
    .eq("active",true).order("display_name").limit(1000);

  const term=q.trim().toLowerCase();
  const filtered=(rows||[]).filter(c=>!term||[
    c.display_name,c.tiktok_handle,c.niche,c.bio
  ].some(v=>String(v||"").toLowerCase().includes(term)));

  const totalPages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
  const requestedPage=Math.max(1,Number.parseInt(pageParam,10)||1);
  const page=Math.min(requestedPage,totalPages);
  const start=(page-1)*PAGE_SIZE;
  const creators=filtered.slice(start,start+PAGE_SIZE);
  const first=filtered.length?start+1:0;
  const last=Math.min(start+PAGE_SIZE,filtered.length);

  return <>
    <Link className="btn" href="/portal/community"><ArrowLeft size={16}/> Back to Community</Link>
    <div className="page-head elevated-head directory-page-head">
      <div><span className="section-kicker">LHS Network</span><h1>Creator Directory</h1><p>Everyone in LHS is already connected. Browse the network, discover creators, and visit their profiles—no friend requests required.</p></div>
      <div className="directory-count"><UsersRound size={21}/><strong>{rows?.length||0}</strong><span>active creators</span></div>
    </div>

    <section className="panel creator-network-directory">
      <div className="panel-head">
        <div><span className="section-kicker">Find your people</span><h2>Meet the LHS creator network</h2><p className="directory-range">{filtered.length?"Showing "+first+"–"+last+" of "+filtered.length+" creators":"No creators found"}</p></div>
        <form className="search-form directory-search">
          <Search size={17}/>
          <input name="q" aria-label="Search creator directory" defaultValue={q} placeholder="Search name, TikTok handle, niche…"/>
        </form>
      </div>

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

      {filtered.length>PAGE_SIZE&&<nav className="directory-pagination" aria-label="Creator directory pages">
        <Link className={"pagination-button "+(page===1?"disabled":"")} aria-disabled={page===1} tabIndex={page===1?-1:0} href={page===1?directoryHref(1,q):directoryHref(page-1,q)}><ChevronLeft size={16}/> Previous</Link>
        <div className="pagination-pages">
          {Array.from({length:totalPages},(_,i)=>i+1).map(n=><Link key={n} className={"pagination-page "+(n===page?"active":"")} aria-current={n===page?"page":undefined} href={directoryHref(n,q)}>{n}</Link>)}
        </div>
        <Link className={"pagination-button "+(page===totalPages?"disabled":"")} aria-disabled={page===totalPages} tabIndex={page===totalPages?-1:0} href={page===totalPages?directoryHref(totalPages,q):directoryHref(page+1,q)}>Next <ChevronRight size={16}/></Link>
      </nav>}
    </section>
  </>;
}
