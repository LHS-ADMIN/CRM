import { MessageCircle, MessagesSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function CommunityPage(){
  const supabase=await createClient();
  const {data:posts}=await supabase.from("community_posts").select("id,body,channel_type,created_at,author_user_id").order("created_at",{ascending:false}).limit(100);
  const authorIds=[...new Set((posts||[]).map(p=>p.author_user_id))];
  const {data:directory}=authorIds.length?await supabase.from("profile_directory").select("user_id,display_name,avatar_url").in("user_id",authorIds):{data:[] as {user_id:string;display_name:string;avatar_url:string|null}[]};
  const {data:replies}=posts?.length?await supabase.from("community_replies").select("post_id").in("post_id",posts.map(p=>p.id)):{data:[] as {post_id:string}[]};
  const names=new Map((directory||[]).map(p=>[p.user_id,p]));
  const replyCount=new Map<string,number>(); for(const r of replies||[])replyCount.set(r.post_id,(replyCount.get(r.post_id)||0)+1);

  return <>
    <div className="page-head"><div><span className="section-kicker">Creator Community</span><h1>Network conversation</h1><p>Community channels are permission-aware: network, team, and leadership discussions stay in the right room.</p></div><div className="head-actions"><span className="chip accent"><MessagesSquare size={14}/>{posts?.length||0} recent posts</span></div></div>
    <div className="community-layout">
      <section className="feed">{(posts||[]).length?(posts||[]).map(p=>{const author=names.get(p.author_user_id);return <article className="post-card" key={p.id}>
        <div className="post-head"><span className="avatar-fallback">{(author?.display_name||"L")[0].toUpperCase()}</span><div><strong>{author?.display_name||"LHS Member"}</strong><span>{new Date(p.created_at).toLocaleString()}</span></div><span className="chip">{p.channel_type}</span></div>
        <p>{p.body}</p>
        <div className="post-footer"><span><MessageCircle size={15}/>{replyCount.get(p.id)||0} replies</span><span>Visible to {p.channel_type}</span></div>
      </article>}):<div className="panel empty-state">No community posts yet.</div>}</section>
      <aside className="community-side"><div className="panel card-pad"><span className="section-kicker">Channel guide</span><h3>Keep conversation organized</h3><div className="channel-guide"><div><span className="channel-dot network"/><p><strong>Network</strong><small>Visible across LHS</small></p></div><div><span className="channel-dot team"/><p><strong>Team</strong><small>Scoped to your community</small></p></div><div><span className="channel-dot leadership"/><p><strong>Leadership</strong><small>Managers and Admin</small></p></div></div></div></aside>
    </div>
  </>;
}
