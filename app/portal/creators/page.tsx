import Link from "next/link";
import { FileUp, Layers3, Search, ShieldCheck, UserRoundCheck, UsersRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AddCreatorControl, ArchiveCreatorButton, RestoreCreatorButton } from "@/components/creator-admin-controls";

export default async function CreatorsPage({searchParams}:{searchParams:Promise<{q?:string;archived?:string;setup?:string}>}){
  const {q="",archived,setup=""}=await searchParams;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  const {data:profile}=user?await supabase.from("profiles").select("active_role").eq("id",user.id).single():{data:null};
  const admin=profile?.active_role==="admin";
  const viewingInactive=admin&&archived==="1";
  const setupFilter=admin&&["not-activated","activated","saved"].includes(setup)?setup:"all";

  let query=supabase.from("creators").select("id,agency_creator_id,creator_name,display_name,tiktok_handle,group_name,creator_network_manager,graduation_status,status,tier,active,auth_user_id").eq("active",!viewingInactive).order("creator_name").limit(1000);
  if(q.trim())query=query.or(`creator_name.ilike.%${q.trim()}%,display_name.ilike.%${q.trim()}%,tiktok_handle.ilike.%${q.trim()}%,agency_creator_id.ilike.%${q.trim()}%`);

  const [{data:creators},{data:teams},{data:accountProfiles},{data:savedProfiles}]=await Promise.all([
    query,
    admin?supabase.from("teams").select("id,name").eq("active",true).order("name"):Promise.resolve({data:[] as {id:string;name:string}[]}),
    admin?supabase.from("profiles").select("id,last_login_at,must_change_password").limit(1500):Promise.resolve({data:[] as {id:string;last_login_at:string|null;must_change_password:boolean}[]}),
    admin?supabase.from("profile_details").select("user_id,updated_at").limit(1500):Promise.resolve({data:[] as {user_id:string;updated_at:string}[]})
  ]);

  const accountById=new Map((accountProfiles||[]).map(account=>[account.id,account]));
  const savedById=new Map((savedProfiles||[]).map(record=>[record.user_id,record]));
  type SetupStatus="not-activated"|"activated"|"saved";
  const setupFor=(creator:{auth_user_id:string|null}):SetupStatus=>{
    const account=creator.auth_user_id?accountById.get(creator.auth_user_id):null;
    if(!account?.last_login_at||account.must_change_password!==false)return "not-activated";
    if(creator.auth_user_id&&savedById.has(creator.auth_user_id))return "saved";
    return "activated";
  };
  const setupTotals={unactivated:(creators||[]).filter(c=>setupFor(c)==="not-activated").length,
    activated:(creators||[]).filter(c=>setupFor(c)!=="not-activated").length,
    saved:(creators||[]).filter(c=>setupFor(c)==="saved").length};
  const visibleCreators=admin&&setupFilter!=="all"?(creators||[]).filter(c=>setupFor(c)===setupFilter):(creators||[]);
  const filterUrl=(value:string)=>{
    const params=new URLSearchParams();
    if(q.trim())params.set("q",q.trim());
    if(viewingInactive)params.set("archived","1");
    if(value!=="all")params.set("setup",value);
    const search=params.toString();
    return "/portal/creators"+(search?"?"+search:"");
  };

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


    {admin&&<section className="panel creator-setup-overview" aria-label="Creator account setup summary">
      <div className="creator-setup-heading">
        <div><span className="section-kicker">Onboarding tracker</span><h2>Account & profile setup</h2>
        <p>Activated = signed in and changed temporary password. Profile saved = opened My Profile and saved the form. These are different milestones.</p></div>
        <span className="creator-setup-total">{creators?.length||0} creators in this view</span>
      </div>
      <div className="creator-setup-counters">
        <div><strong>{setupTotals.unactivated}</strong><span>Not activated</span></div>
        <div><strong>{setupTotals.activated}</strong><span>Accounts activated</span></div>
        <div><strong>{setupTotals.saved}</strong><span>Profiles saved</span></div>
      </div>
      <div className="creator-setup-filters" aria-label="Filter creators by profile setup">
        {([["all","All creators"],["not-activated","Not activated"],["activated","Activated only"],["saved","Profile saved"]] as const).map(([value,label])=>
          <Link key={value} href={filterUrl(value)} className={setupFilter===value?"creator-setup-filter active":"creator-setup-filter"} aria-current={setupFilter===value?"page":undefined}>{label}</Link>
        )}
      </div>
    </section>}

    <section className="panel creator-directory-panel">
      <div className="panel-head"><div><span className="section-kicker">Directory</span><h2>{viewingInactive?"Deactivated creators":"Active creators"}</h2>{admin&&<Link className="btn" href={viewingInactive?"/portal/creators":"/portal/creators?archived=1"}>{viewingInactive?"View active roster":"View deactivated creators"}</Link>}</div><form className="search-form"><Search size={17}/>{viewingInactive&&<input type="hidden" name="archived" value="1"/>}{admin&&setupFilter!=="all"&&<input type="hidden" name="setup" value={setupFilter}/>}<input aria-label="Search creators" name="q" placeholder="Search creator, handle, or ID" defaultValue={q}/></form></div>
      {visibleCreators.length?<div className="table-wrap"><table className="table creator-table"><thead><tr><th>Creator</th><th>Creator ID</th><th>Manager</th><th>Group</th><th>Tier</th><th>Status</th>{admin&&<th>Profile setup</th>}{admin&&<th>Actions</th>}</tr></thead><tbody>{visibleCreators.map(c=>{const name=c.display_name||c.creator_name;const setupStatus=setupFor(c);const account=c.auth_user_id?accountById.get(c.auth_user_id):null;const profileSaved=c.auth_user_id?savedById.get(c.auth_user_id):null;return <tr key={c.id}><td><div className="creator-cell"><span className="avatar-fallback sm">{(name||"L")[0].toUpperCase()}</span><div><strong><Link href={`/portal/creators/${c.id}`}>{name}</Link></strong><small>{c.tiktok_handle||"No handle"}</small></div></div></td><td><code>{c.agency_creator_id}</code></td><td>{c.creator_network_manager||"—"}</td><td>{c.group_name||"—"}</td><td><span className="chip">{c.tier||"—"}</span></td><td><span className={c.active?"status-badge success":"status-badge"}>{c.active?"Active":"Deactivated"}</span></td>{admin&&<td><div className="creator-setup-cell"><span className={"creator-setup-badge "+setupStatus}>{setupStatus==="saved"?"Profile saved":setupStatus==="activated"?"Activated":"Not activated"}</span>{profileSaved&&setupStatus==="saved"?<small>Saved {new Date(profileSaved.updated_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</small>:account?.last_login_at&&setupStatus==="activated"?<small>Last sign-in {new Date(account.last_login_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</small>:null}</div></td>}
{admin&&<td>{viewingInactive?<RestoreCreatorButton creatorId={c.id}/>:<ArchiveCreatorButton creatorId={c.id} name={name}/>}</td>}</tr>})}</tbody></table></div>:
      <div className="creator-empty-state"><div className="creator-empty-visual"><UsersRound size={38}/><span><ShieldCheck size={18}/></span></div><div><span className="section-kicker">{viewingInactive?"Deactivated roster":"Production roster"}</span><h2>{admin&&setupFilter!=="all"?"No creators match this setup filter":viewingInactive?"No creators are currently deactivated":"No active creators are loaded yet"}</h2><p>{admin&&setupFilter!=="all"?"Choose another setup filter to see different creators.":viewingInactive?"Creators deactivated by Admin will appear here and can be reactivated without losing their history.":"Add creators individually by username or import the approved LHS roster."}</p>{admin&&!viewingInactive&&<div className="empty-actions"><AddCreatorControl teams={teams||[]}/><Link className="btn" href="/portal/administration"><FileUp size={17}/> Import approved roster</Link></div>}</div></div>}
    </section>
  </>;
}
