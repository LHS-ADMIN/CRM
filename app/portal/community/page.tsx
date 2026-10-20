import { MessageCircle, MessagesSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CommunityReplyForm } from "@/components/community-reply-form";
import { CommunityComposerShell } from "@/components/community-composer-shell";
import { CommunityModeration } from "@/components/community-moderation";

export default async function CommunityPage(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return null;
  const [{data:posts},{data:profile},{data:memberships}]=await Promise.all([
    supabase.from("community_posts").select("id,body,channel_type,team_id,active,created_at,author_user_id").order("created_at",{ascending:false}).limit(100),
    supabase.from("profiles").select("active_role").eq("id",user.id).single(),
    supabase.from("team_memberships").select("team_id").eq("user_id",user.id).eq("active",true),
  ]);
  const managedTeams=new Set((memberships||[]).map(m=>m.team_id));
  const admin=profile?.active_role==="admin";
  const canModerateTeam=(p:{channel_type:string;team_id:string|null})=>profile?.active_role==="manager"&&p.channel_type==="team"&&p.team_id!==null&&managedTeams.has(p.team_id);
  const {data:replies}=posts?.length?await supabase.from("community_replies").select("id,post_id,body,author_user_id,active,created_at").in("post_id",posts.map(p=>p.id)).order("created_at"):{data:[]};
  const authorIds=[...new Set([...(posts||[]).map(p=>p.author_user_id),...(replies||[]).map(r=>r.author_user_id)])];
  const {data:directory}=authorIds.length?await supabase.from("profile_directory").select("user_id,display_name,avatar_url").in("user_id",authorIds):{data:[] as {user_id:string;display_name:string;avatar_url:string|null}[]};

  const names=new Map((directory||[]).map(p=>[p.user_id,p]));
  const replyCount=new Map<string,number>(); for(const r of replies||[])replyCount.set(r.post_id,(replyCount.get(r.post_id)||0)+1);

  return <>
    <div className="page-head"><div><span className="section-kicker">Creator Community</span><h1>Network conversation</h1><p>Community channels are permission-aware: network, team, and leadership discussions stay in the right room.</p></div><div className="head-actions"><span className="chip accent"><MessagesSquare size={14}/>{posts?.length||0} recent posts</span></div></div>
    <CommunityComposerShell/><div className="community-layout">
      <section className="feed">{(posts||[]).length?(posts||[]).map(p=>{const author=names.get(p.author_user_id);return <article className="post-card" key={p.id}>
        <div className="post-head"><span className="avatar-fallback">{(author?.display_name||"L")[0].toUpperCase()}</span><div><strong>{author?.display_name||"LHS Member"}</strong><span>{new Date(p.created_at).toLocaleString()}</span></div><span className="chip">{p.channel_type}</span></div>
        <p>{p.body}</p>
        {!p.active&&<p className="chip">Hidden from channel</p>}
        {(admin||(p.active&&(p.author_user_id===user.id||canModerateTeam(p))))&&<CommunityModeration kind="post" id={p.id} hidden={!p.active}/>}
        <div className="post-footer"><span><MessageCircle size={15}/>{replyCount.get(p.id)||0} replies</span><span>Visible to {p.channel_type}</span></div>
        {(replies||[]).filter(r=>r.post_id===p.id).map(r=><div className="community-reply" key={r.id}><strong>{names.get(r.author_user_id)?.display_name||"LHS Member"}</strong><time>{new Date(r.created_at).toLocaleString()}</time><p>{r.body}</p>{!r.active&&<p className="chip">Hidden from channel</p>}{(admin||(r.active&&(r.author_user_id===user.id||canModerateTeam(p))))&&<CommunityModeration kind="reply" id={r.id} hidden={!r.active}/>}</div>)}
        {p.active&&<CommunityReplyForm postId={p.id} userId={user.id}/>}
      </article>}):<div className="panel empty-state">No community posts yet.</div>}</section>
      <aside className="community-side"><div className="panel card-pad"><span className="section-kicker">Channel guide</span><h3>Keep conversation organized</h3><div className="channel-guide"><div><span className="channel-dot network"/><p><strong>Network</strong><small>Visible across LHS</small></p></div><div><span className="channel-dot team"/><p><strong>Team</strong><small>Scoped to your community</small></p></div><div><span className="channel-dot leadership"/><p><strong>Leadership</strong><small>Managers and Admin</small></p></div></div></div></aside>
    </div>
  </>;
}
