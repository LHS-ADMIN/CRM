import { CircleDot, ExternalLink, LifeBuoy, MessageSquareText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SupportCreateForm } from "@/components/support-create-form";
import { AttachmentDisplay, type AttachmentRecord } from "@/components/attachment-display";

export default async function SupportPage(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return null;

  const [{data:creator},{data:teams}]=await Promise.all([
    supabase.from("creators").select("id,team_id").eq("auth_user_id",user.id).maybeSingle(),
    supabase.from("teams").select("id,name").eq("active",true).limit(1)
  ]);

  const {data}=await supabase.from("support_tickets")
    .select("id,subject,description,external_url,category,priority,status,updated_at,created_at")
    .order("updated_at",{ascending:false}).limit(100);

  const ids=(data||[]).map(t=>t.id);
  const {data:attachments}=ids.length
    ?await supabase.from("attachments").select("id,parent_id,file_name,mime_type,file_size").eq("parent_type","support_ticket").in("parent_id",ids)
    :{data:[] as (AttachmentRecord&{parent_id:string})[]};

  const byTicket=new Map<string,AttachmentRecord[]>();
  for(const item of attachments||[]){const rows=byTicket.get(item.parent_id)||[];rows.push(item);byTicket.set(item.parent_id,rows)}
  const open=(data||[]).filter(t=>!["resolved","closed"].includes(t.status)).length;

  return <>
    <div className="page-head elevated-head">
      <div><span className="section-kicker">Support Center</span><h1>Get help without losing context</h1><p>Open a ticket with details, screenshots, files, or reference links. Your ticket history stays attached to your account.</p></div>
      <div className="head-actions"><span className="chip accent"><LifeBuoy size={15}/>{open} open</span><SupportCreateForm userId={user.id} creatorId={creator?.id||null} teamId={creator?.team_id||teams?.[0]?.id||null}/></div>
    </div>

    {(data||[]).length?<div className="ticket-grid">{(data||[]).map(t=>
      <article className="ticket-card" key={t.id}>
        <div className="ticket-top">
          <div className="ticket-icon"><MessageSquareText size={20}/></div>
          <div><span className="section-kicker">{t.category||"General"}</span><h2>{t.subject}</h2></div>
          <span className={`status-badge ${t.status==="open"||t.status==="in_progress"?"success":""}`}><CircleDot size={12}/>{t.status.replace("_"," ")}</span>
        </div>
        {t.description&&<p className="ticket-description">{t.description}</p>}
        <div className="ticket-meta"><span className={`priority ${t.priority}`}>{t.priority} priority</span><span>Updated {new Date(t.updated_at).toLocaleString()}</span></div>
        {t.external_url&&<a className="resource-link" href={t.external_url} target="_blank" rel="noreferrer"><ExternalLink size={16}/> Open reference link</a>}
        <AttachmentDisplay items={byTicket.get(t.id)||[]}/>
      </article>
    )}</div>:<section className="empty-feature"><div className="empty-feature-icon"><LifeBuoy size={30}/></div><div><span className="section-kicker">Support queue</span><h2>No tickets yet</h2><p>When you need assistance, open a ticket and include a screenshot, document, or link so the team has the full picture.</p></div><SupportCreateForm userId={user.id} creatorId={creator?.id||null} teamId={creator?.team_id||teams?.[0]?.id||null}/></section>}
  </>;
}
