import Link from "next/link";
import { Activity, FileUp, Gem, Search, ShieldCheck, UsersRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function CreatorsPage({searchParams}:{searchParams:Promise<{q?:string}>}){
  const {q=""}=await searchParams;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  const {data:profile}=user?await supabase.from("profiles").select("active_role").eq("id",user.id).single():{data:null};

  let query=supabase.from("creators").select("id,agency_creator_id,creator_name,display_name,tiktok_handle,group_name,creator_network_manager,graduation_status,status,tier").eq("active",true).order("creator_name").limit(1000);
  if(q.trim())query=query.or(`creator_name.ilike.%${q.trim()}%,display_name.ilike.%${q.trim()}%,tiktok_handle.ilike.%${q.trim()}%,agency_creator_id.ilike.%${q.trim()}%`);

  const [{data:creators},{data:metrics}]=await Promise.all([query,supabase.from("metrics_current").select("creator_id,diamonds,live_days,live_streams,rank,tier_status")]);
  const metricMap=new Map((metrics||[]).map(m=>[m.creator_id,m]));
  const totalDiamonds=(metrics||[]).reduce((s,m)=>s+Number(m.diamonds||0),0);
  const admin=profile?.active_role==="admin";

  return <>
    <div className="page-head elevated-head"><div><span className="section-kicker">Creator management</span><h1>Creator roster</h1><p>Permanent Agency Creator IDs stay fixed even when TikTok handles change. The roster and current metrics are separated so new metrics replace the prior snapshot without changing creator identities.</p></div>{admin&&<div className="head-actions"><Link className="btn primary" href="/portal/administration"><FileUp size={17}/> Import LHS roster</Link></div>}</div>

    <section className="kpi-grid three">
      <article className="kpi-card"><div className="kpi-icon"><UsersRound size={20}/></div><div><span>Creators visible</span><strong>{creators?.length||0}</strong><small>Role-scoped roster</small></div></article>
      <article className="kpi-card"><div className="kpi-icon"><Gem size={20}/></div><div><span>Current diamonds</span><strong>{totalDiamonds.toLocaleString()}</strong><small>Current snapshot</small></div></article>
      <article className="kpi-card"><div className="kpi-icon"><Activity size={20}/></div><div><span>Metrics loaded</span><strong>{metrics?.length||0}</strong><small>Current-only records</small></div></article>
    </section>

    <section className="panel creator-directory-panel">
      <div className="panel-head"><div><span className="section-kicker">Directory</span><h2>Active creators</h2></div><form className="search-form"><Search size={17}/><input name="q" placeholder="Search creator, handle, or ID" defaultValue={q}/></form></div>
      {(creators||[]).length?<div className="table-wrap"><table className="table creator-table"><thead><tr><th>Creator</th><th>Creator ID</th><th>Manager</th><th>Group</th><th>Tier</th><th>Diamonds</th><th>LIVE Days</th><th>Streams</th><th>Status</th></tr></thead><tbody>{(creators||[]).map(c=>{const m=metricMap.get(c.id);return <tr key={c.id}><td><div className="creator-cell"><span className="avatar-fallback sm">{(c.display_name||c.creator_name||"L")[0].toUpperCase()}</span><div><strong>{c.display_name||c.creator_name}</strong><small>{c.tiktok_handle||"No handle"}</small></div></div></td><td><code>{c.agency_creator_id}</code></td><td>{c.creator_network_manager||"—"}</td><td>{c.group_name||"—"}</td><td><span className="chip">{m?.tier_status||c.tier||"—"}</span></td><td><strong>{Number(m?.diamonds||0).toLocaleString()}</strong></td><td>{m?.live_days||0}</td><td>{m?.live_streams||0}</td><td><span className="status-badge success">{c.status}</span></td></tr>})}</tbody></table></div>:
      <div className="creator-empty-state"><div className="creator-empty-visual"><UsersRound size={38}/><span><ShieldCheck size={18}/></span></div><div><span className="section-kicker">Production roster required</span><h2>No approved LHS creators are loaded</h2><p>The legacy Google Sheet currently contains only the LHS test creator, so it was not migrated into production. Import the approved LHS creator roster here rather than displaying demo or non-LHS creator data.</p>{admin&&<Link className="btn gold" href="/portal/administration"><FileUp size={17}/> Open production import</Link>}</div></div>}
    </section>
  </>;
}
