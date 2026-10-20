import { CalendarRange, Gift, Target, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AttachmentDisplay } from "@/components/attachment-display";
import { CampaignCreatePanel } from "@/components/campaign-create-panel";

export default async function CampaignsPage(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return null;
  const [{data:profile},{data:teams}]=await Promise.all([supabase.from("profiles").select("active_role").eq("id",user.id).single(),supabase.from("teams").select("id,name").eq("active",true).order("name")]);
  const {data}=await supabase.from("campaigns")
    .select("id,title,description,start_at,end_at,status,audience_type,team_id,created_by,rules,metric,campaign_prizes(id,place_label,prize_description),campaign_leaderboard(rank,score,metric_value,creators(creator_name,tiktok_handle))")
    .eq("active",true).order("start_at",{ascending:false}).limit(200);

  const {data:attachments}=data?.length?await supabase.from("attachments").select("id,parent_id,file_name,mime_type,file_size").eq("parent_type","campaign").in("parent_id",data.map(c=>c.id)):{data:[]};
  const now=Date.now();
  return <>
    <div className="page-head"><div><span className="section-kicker">Campaign Manager</span><h1>Campaign hub</h1><p>Creators have read-only campaign visibility. Managers and Admins work within the permissions assigned to their teams.</p></div><div className="head-actions"><CampaignCreatePanel userId={user.id} activeRole={profile?.active_role||"creator"} teams={teams||[]}/></div></div>
    <div className="campaign-grid">{(data||[]).length?(data||[]).map((c:any)=>{
      const start=new Date(c.start_at),end=new Date(c.end_at);
      const active=now>=start.valueOf()&&now<=end.valueOf();
      const pct=Math.max(0,Math.min(100,Math.round(((now-start.valueOf())/Math.max(1,end.valueOf()-start.valueOf()))*100)));
      return <article className="campaign-card" key={c.id}>
        <div className="campaign-card-top"><span className={active?"status-badge success":"status-badge"}>{active?"Active":c.status}</span><span className="chip accent"><Target size={13}/>{c.audience_type}</span></div>
        <h2>{c.title}</h2><p>{c.description||"No campaign description has been added yet."}</p>
        <div className="campaign-meta"><span><CalendarRange size={15}/>{start.toLocaleDateString()} – {end.toLocaleDateString()}</span><span><Trophy size={15}/>{c.metric||"Campaign metric"}</span></div>
        <div className="progress large"><span style={{width:`${pct}%`}}/></div><div className="progress-label"><span>Timeline progress</span><strong>{pct}%</strong></div>
        {c.campaign_prizes?.length>0&&<div className="prize-box"><div className="prize-title"><Gift size={16}/> Prizes</div>{c.campaign_prizes.slice(0,3).map((p:any,i:number)=><div className="prize-row" key={i}><span>{p.place_label||`Prize ${i+1}`}</span><strong>{p.prize_description}</strong></div>)}</div>}
        {c.campaign_leaderboard?.length>0&&<div><h3>Leaderboard</h3><ol>{[...c.campaign_leaderboard].sort((a:any,b:any)=>(a.rank||999)-(b.rank||999)).map((row:any,i:number)=><li key={i}>{row.rank||i+1}. {row.creators?.tiktok_handle||row.creators?.creator_name||"LHS Creator"} — {row.metric_value??row.score??0}</li>)}</ol></div>}
        {(profile?.active_role==="admin"||(profile?.active_role==="manager"&&c.created_by===user.id))&&<CampaignCreatePanel userId={user.id} activeRole={profile.active_role} teams={teams||[]} existing={c}/>}
        <AttachmentDisplay items={(attachments||[]).filter(a=>a.parent_id===c.id)}/>
        {c.rules&&<details className="rules"><summary>Campaign rules</summary><p>{c.rules}</p></details>}
      </article>
    }):<div className="panel empty-state">No campaigns are available for your current role.</div>}</div>
  </>;
}
