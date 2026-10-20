import Link from "next/link";
import { FileUp, Layers3, Search, ShieldCheck, UserRoundCheck, UsersRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AddCreatorControl, ArchiveCreatorButton, RestoreCreatorButton } from "@/components/creator-admin-controls";

export default async function CreatorsPage({searchParams}:{searchParams:Promise<{q?:string;archived?:string}>}){
  const {q="",archived}=await searchParams;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  const {data:profile}=user?await supabase.from("profiles").select("active_role").eq("id",user.id).single():{data:null};
  const admin=profile?.active_role==="admin";
  const viewingInactive=admin&&archived==="1";

  let query=supabase.from("creators").select("id,agency_creator_id,creator_name,display_name,tiktok_handle,group_name,creator_network_manager,graduation_status,status,tier,active").eq("active",!viewingInactive).order("creator_name").limit(1000);
  if(q.trim())query=query.or(`creator_name.ilike.%${q.trim()}%,display_name.ilike.%${q.trim()}%,tiktok_handle.ilike.%${q.trim()}%,agency_creator_id.ilike.%${q.trim()}%`);

  const [{data:creators},{data:teams}]=await Promise.all([
    query,
    admin?supabase.from("teams").select("id,name").eq("active",true).order("name"):Promise.resolve({data:[] as {id:string;name:string}[]})
  ]);

  const groups=new Set((creators||[]).map(c=>c.group_name?.trim()).filter(Boolean));
  const managers=new Set((creators||[]).map(c=>c.creator_network_manager?.trim()).filter(Boolean));

  return <>
    <div className="page-head elevated-head creator-head">
      <div><span className="section-kicker">Creator management</span><h1>Creator roster</h1><p>The people behind LHS. Search the network, manage access, assign teams, and preserve each creator's permanent identity even when their TikTok handle changes.</p></div>
      {admin&&<div className="head-actions"><AddCreatorControl teams={teams||[]}/><Link className="btn" href="/portal/administration"><FileUp size={17}/> Import roster</Link></div>}
    </div>

    {admin&&<div className="username-onboarding-banner"><div className="username-banner-icon">@</div><div><strong>Creator access is managed here.</strong><span>Use <strong>Deactivate</strong> to remove a creator from the active roster while preserving their history and Creator ID. Use the deactivated roster to reactivate them later.</span></div></div>}

    <section className="kpi-grid three branded-kpis">
      <article className="kpi-card tone-cyan"><div className="kpi-icon"><UsersRound size={20}/></div><div><span>{viewingInactive?"Deactivated creators":"Creators visible"}</span><strong>{creators?.length||0}</strong><small>{viewingInactive?"History preserved":"Based on your role"}</small></div></article>
      <article className="kpi-card tone-gold"><div className="kpi-icon"><Layers3 size={20}/></div><div><span>Groups represented</span><strong>{groups.size}</strong><small>Across this roster view</small></div></article>
      <article className="kpi-card tone-magenta"><div className="kpi-icon"><UserRoundCheck size={20}/></div><div><span>Managers represented</span><strong>{managers.size}</strong><small>Across this roster view</small></div></article>
    </section>

    <section className="panel creator-directory-panel">
      <div className="panel-head"><div><span className="section-kicker">Directory</span><h2>{viewingInactive?"Deactivated creators":"Active creators"}</h2>{admin&&<Link className="btn" href={viewingInactive?"/portal/creators":"/portal/creators?archived=1"}>{viewingInactive?"View active roster":"View deactivated creators"}</Link>}</div><form className="search-form"><Search size={17}/>{viewingInactive&&<input type="hidden" name="archived" value="1"/>}<input aria-label="Search creators" name="q" placeholder="Search creator, handle, or ID" defaultValue={q}/></form></div>
      {(creators||[]).length?<div className="table-wrap"><table className="table creator-table"><thead><tr><th>Creator</th><th>Creator ID</th><th>Manager</th><th>Group</th><th>Tier</th><th>Status</th>{admin&&<th>Actions</th>}</tr></thead><tbody>{(creators||[]).map(c=>{const name=c.display_name||c.creator_name;return <tr key={c.id}><td><div className="creator-cell"><span className="avatar-fallback sm">{(name||"L")[0].toUpperCase()}</span><div><strong><Link href={`/portal/creators/${c.id}`}>{name}</Link></strong><small>{c.tiktok_handle||"No handle"}</small></div></div></td><td><code>{c.agency_creator_id}</code></td><td>{c.creator_network_manager||"—"}</td><td>{c.group_name||"—"}</td><td><span className="chip">{c.tier||"—"}</span></td><td><span className={c.active?"status-badge success":"status-badge"}>{c.active?"Active":"Deactivated"}</span></td>{admin&&<td>{viewingInactive?<RestoreCreatorButton creatorId={c.id}/>:<ArchiveCreatorButton creatorId={c.id} name={name}/>}</td>}</tr>})}</tbody></table></div>:
      <div className="creator-empty-state"><div className="creator-empty-visual"><UsersRound size={38}/><span><ShieldCheck size={18}/></span></div><div><span className="section-kicker">{viewingInactive?"Deactivated roster":"Production roster"}</span><h2>{viewingInactive?"No creators are currently deactivated":"No active creators are loaded yet"}</h2><p>{viewingInactive?"Creators deactivated by Admin will appear here and can be reactivated without losing their history.":"Add creators individually by username or import the approved LHS roster."}</p>{admin&&!viewingInactive&&<div className="empty-actions"><AddCreatorControl teams={teams||[]}/><Link className="btn" href="/portal/administration"><FileUp size={17}/> Import approved roster</Link></div>}</div></div>}
    </section>
  </>;
}
