import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle, Search, Sparkles, UsersRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CommunityReplyForm } from "@/components/community-reply-form";
import { CommunityStatusComposer } from "@/components/community-status-composer";

export default async function CreatorSocialProfile({params}:{params:Promise<{id:string}>}){
  const{id}=await params;
  if(!/^[0-9a-f-]{36}$/i.test(id))notFound();
  const supabase=await createClient();
  const{data:{user}}=await supabase.auth.getUser();
  if(!user)notFound();

  const{data:creator}=await supabase.from("creator_directory")
    .select("creator_id,user_id,display_name,tiktok_handle,avatar_url,niche,bio,active")
    .eq("creator_id",id).eq("active",true).maybeSingle();
  if(!creator)notFound();

  const isSelf=creator.user_id===user.id;
  const{data:posts}=creator.user_id?await supabase.from("community_posts")
    .select("id,body,created_at,author_user_id")
    .eq("author_user_id",creator.user_id).eq("channel_type","network").eq("active",true)
    .order("created_at",{ascending:false}).limit(50):{data:[]};

  const postIds=(posts||[]).map(p=>p.id);
  const{data:replies}=postIds.length?await supabase.from("community_replies")
    .select("id,post_id,body,author_user_id,created_at")
    .in("post_id",postIds).eq("active",true).order("created_at"):{data:[]};
  const replyAuthorIds=[...new Set((replies||[]).map(r=>r.author_user_id))];
  const{data:replyAuthors}=replyAuthorIds.length?await supabase.from("profile_directory")
    .select("user_id,display_name,avatar_url").in("user_id",replyAuthorIds):{data:[]};
  const authorMap=new Map((replyAuthors||[]).map(a=>[a.user_id,a]));

  return <>
    <div className="social-profile-toolbar"><Link className="btn" href="/portal/community/creators"><ArrowLeft size={16}/> Creator Directory</Link><form className="search-form social-profile-search" action="/portal/community/creators"><Search size={16}/><input name="q" aria-label="Search LHS creators" placeholder="Search LHS creators…"/></form></div>
    <section className="social-profile-hero">
      <div className="social-profile-cover"><div className="cover-orb one"/><div className="cover-orb two"/><div className="cover-grid"/></div>
      <div className="social-profile-main">
        <div className="social-profile-avatar">{creator.avatar_url?<img src={creator.avatar_url} alt={creator.display_name}/>:<span>{creator.display_name[0]?.toUpperCase()||"L"}</span>}</div>
        <div className="social-profile-copy"><span className="connected-badge"><UsersRound size={14}/> Connected through LHS</span><h1>{creator.display_name}</h1><p className="social-profile-handle">{creator.tiktok_handle||"LHS Creator"}</p><span className="chip accent">{creator.niche||"Creator"}</span></div>
        {isSelf&&<Link className="btn light" href="/portal/profile">Edit my profile</Link>}
      </div>
      <div className="social-profile-bio"><strong>About</strong><p>{creator.bio||"This creator has not added a bio yet."}</p></div>
    </section>

    <div className="social-profile-layout">
      <main className="social-profile-feed">
        {isSelf&&<section className="panel card-pad"><CommunityStatusComposer userId={user.id} displayName={creator.display_name}/></section>}
        <section className="panel social-status-feed">
          <div className="panel-head"><div><span className="section-kicker">Status feed</span><h2>{isSelf?"Your LHS updates":creator.display_name+"'s updates"}</h2></div><span className="chip">{posts?.length||0} posts</span></div>
          {(posts||[]).length?(posts||[]).map(p=><article className="profile-status-card" key={p.id}>
            <div className="profile-status-head"><div className="mini-social-avatar">{creator.avatar_url?<img src={creator.avatar_url} alt=""/>:<span>{creator.display_name[0]?.toUpperCase()}</span>}</div><div><strong>{creator.display_name}</strong><span>{new Date(p.created_at).toLocaleString()}</span></div></div>
            <p>{p.body}</p>
            <div className="profile-status-meta"><span><MessageCircle size={15}/>{(replies||[]).filter(r=>r.post_id===p.id).length} replies</span><span>Network status</span></div>
            <div className="profile-status-replies">{(replies||[]).filter(r=>r.post_id===p.id).map(r=>{const a=authorMap.get(r.author_user_id);return <div className="social-reply" key={r.id}><div className="mini-social-avatar sm">{a?.avatar_url?<img src={a.avatar_url} alt=""/>:<span>{(a?.display_name||"L")[0]}</span>}</div><div><strong>{a?.display_name||"LHS Member"}</strong><time>{new Date(r.created_at).toLocaleString()}</time><p>{r.body}</p></div></div>})}</div>
            <CommunityReplyForm postId={p.id} userId={user.id}/>
          </article>):<div className="profile-status-empty"><Sparkles size={28}/><strong>No statuses yet</strong><span>{isSelf?"Post your first update above.":"When this creator posts to the LHS Network, their updates will appear here."}</span></div>}
        </section>
      </main>
      <aside className="social-profile-side"><div className="panel card-pad"><span className="section-kicker">LHS connection</span><h3>Everyone is connected</h3><p>There are no friend requests or follower controls inside LHS. Every active creator can discover and visit every other creator profile.</p><Link className="btn" href="/portal/community/creators"><UsersRound size={16}/> Browse all creators</Link></div></aside>
    </div>
  </>;
}
