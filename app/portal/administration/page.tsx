import { Activity, Database, ShieldCheck, UsersRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AdminImportPanel } from "@/components/admin-import-panel";
import { AdminTeamPanel } from "@/components/admin-team-panel";
import { AdminAccountPanel } from "@/components/admin-account-panel";
import { redirect } from "next/navigation";

export default async function AdministrationPage(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect("/login");
  const {data:profile}=await supabase.from("profiles").select("active_role").eq("id",user.id).single();
  if(profile?.active_role!=="admin")redirect("/portal");
  const [{count:users},{count:teams},{count:imports},{count:audit},{data:recentImports},{data:recentAudit},{data:teamRows}]=await Promise.all([
    supabase.from("profiles").select("*",{count:"exact",head:true}),
    supabase.from("teams").select("*",{count:"exact",head:true}),
    supabase.from("import_log").select("*",{count:"exact",head:true}),
    supabase.from("audit_log").select("*",{count:"exact",head:true}),
    supabase.from("import_log").select("id,import_type,status,received_count,matched_count,unmatched_count,started_at").order("started_at",{ascending:false}).limit(6),
    supabase.from("audit_log").select("id,event_time,actor_username,action,entity_type,result").order("event_time",{ascending:false}).limit(8),
    supabase.from("teams").select("id,name,slug,active").order("name")
  ]);
  const [{data:accounts},{data:roles},{data:memberships},{data:creatorRows}]=await Promise.all([
    supabase.from("profiles").select("id,login_username,display_name,active").order("login_username"),
    supabase.from("user_roles").select("user_id,role"),
    supabase.from("team_memberships").select("user_id,team_id").eq("active",true),
    supabase.from("creators").select("id,agency_creator_id,creator_name,auth_user_id").eq("active",true)
  ]);
  const accountRows=(accounts||[]).map(a=>({...a,roles:(roles||[]).filter(r=>r.user_id===a.id).map(r=>r.role),teamIds:(memberships||[]).filter(m=>m.user_id===a.id).map(m=>m.team_id)}));
  return <><div className="page-head"><div><span className="section-kicker">Administration</span><h1>System control center</h1><p>Production administration is restricted to the active Admin role and enforced by Supabase Row Level Security.</p></div><div className="head-actions"><span className="status-badge success"><ShieldCheck size={14}/> Protected</span></div></div>
  <section className="kpi-grid"><article className="kpi-card"><div className="kpi-icon"><UsersRound size={19}/></div><div><span>User accounts</span><strong>{users??0}</strong><small>Provisioned logins</small></div></article><article className="kpi-card"><div className="kpi-icon"><Database size={19}/></div><div><span>Teams</span><strong>{teams??0}</strong><small>Permission groups</small></div></article><article className="kpi-card"><div className="kpi-icon"><Activity size={19}/></div><div><span>Imports</span><strong>{imports??0}</strong><small>Operational jobs</small></div></article><article className="kpi-card"><div className="kpi-icon"><ShieldCheck size={19}/></div><div><span>Audit events</span><strong>{audit??0}</strong><small>Security trail</small></div></article></section>
  <AdminAccountPanel accounts={accountRows} teams={teamRows||[]} creators={creatorRows||[]} currentUser={user.id}/>
  <div className="dashboard-grid"><div className="span-6"><AdminImportPanel/></div><div className="span-6"><AdminTeamPanel teams={teamRows||[]}/></div></div><div className="dashboard-grid" style={{marginTop:18}}><section className="panel span-6"><div className="panel-head"><div><span className="section-kicker">Data operations</span><h2>Recent imports</h2></div></div><div className="table-wrap"><table className="table"><thead><tr><th>Type</th><th>Status</th><th>Received</th><th>Matched</th><th>Unmatched</th></tr></thead><tbody>{(recentImports||[]).map(i=><tr key={i.id}><td>{i.import_type}</td><td><span className={i.status==="completed"?"status-badge success":"status-badge"}>{i.status}</span></td><td>{i.received_count}</td><td>{i.matched_count}</td><td>{i.unmatched_count}</td></tr>)}</tbody></table></div></section>
  <section className="panel span-6"><div className="panel-head"><div><span className="section-kicker">Security</span><h2>Recent audit activity</h2></div></div><div className="audit-list">{(recentAudit||[]).map(a=><div className="audit-row" key={a.id}><span className={a.result==="success"?"audit-dot success":"audit-dot"}/><div><strong>{a.action.replaceAll("_"," ")}</strong><small>{a.actor_username||"system"} · {a.entity_type}</small></div><time>{new Date(a.event_time).toLocaleString()}</time></div>)}</div></section></div></>;
}
