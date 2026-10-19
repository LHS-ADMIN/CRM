import { createClient } from "@/lib/supabase/server";

export default async function CommunityPage(){
  const supabase=await createClient();
  const {data:posts}=await supabase.from("community_posts")
    .select("id,body,channel_type,created_at,author_user_id")
    .order("created_at",{ascending:false}).limit(100);

  const authorIds=[...new Set((posts||[]).map(p=>p.author_user_id))];
  const {data:directory}=authorIds.length
    ? await supabase.from("profile_directory").select("user_id,display_name,avatar_url").in("user_id",authorIds)
    : {data:[] as {user_id:string;display_name:string;avatar_url:string|null}[]};
  const names=new Map((directory||[]).map(p=>[p.user_id,p.display_name]));

  return <><div className="page-head"><div><h1>Creator Community</h1><p>Network, team, and leadership conversations are separated by permission.</p></div></div><div className="stack">{(posts||[]).map(p=><article className="card card-pad" key={p.id}><div className="split"><strong>{names.get(p.author_user_id)||"LHS Member"}</strong><span className="chip">{p.channel_type}</span></div><p style={{whiteSpace:"pre-wrap"}}>{p.body}</p><div className="muted" style={{fontSize:12}}>{new Date(p.created_at).toLocaleString()}</div></article>)}</div></>;
}
