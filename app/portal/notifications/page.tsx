import { BellRing, CalendarClock, CheckCircle2, Megaphone, Swords, Target } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { MarkAllNotificationsRead, NotificationActions } from "./notification-actions";

function fallbackUrl(type:string){
  if(type==="campaign")return "/portal/campaigns";
  if(type.startsWith("battle_"))return "/portal/battles";
  return "/portal/announcements";
}

function typeLabel(type:string){
  if(type==="campaign")return "Campaign";
  if(type==="battle_tomorrow")return "Battle tomorrow";
  if(type==="battle_hour")return "Battle reminder";
  return "Announcement";
}

function NoticeIcon({type}:{type:string}){
  if(type==="campaign")return <Target size={22}/>;
  if(type.startsWith("battle_"))return <Swords size={22}/>;
  return <Megaphone size={22}/>;
}

export default async function NotificationsPage(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return null;

  const {data:notifications}=await supabase.from("notifications")
    .select("id,notification_type,title,body,action_url,read_at,created_at")
    .order("created_at",{ascending:false})
    .limit(200);

  const rows=notifications||[];
  const unread=rows.filter(n=>!n.read_at).length;

  return <>
    <div className="page-head elevated-head">
      <div>
        <span className="section-kicker">Your LHS inbox</span>
        <h1>Notifications</h1>
        <p>Battle reminders, announcements, and campaign updates sent to your LHS account appear here.</p>
      </div>
      <div className="head-actions">
        <span className={unread?"chip accent":"chip"}><BellRing size={15}/>{unread} unread</span>
        <MarkAllNotificationsRead disabled={unread===0}/>
      </div>
    </div>

    <section className="notification-summary panel">
      <div><CalendarClock size={20}/><span><strong>Battle reminders</strong><small>Automatic notices are created the day before and about one hour before linked creator battles.</small></span></div>
      <div><Megaphone size={20}/><span><strong>Announcements</strong><small>Network, team, and leadership notices follow the audience selected by the publisher.</small></span></div>
      <div><Target size={20}/><span><strong>Campaigns</strong><small>New campaign alerts follow network, team, or targeted campaign access.</small></span></div>
    </section>

    {rows.length?<div className="notification-list">{rows.map(n=>{
      const read=Boolean(n.read_at);
      const actionUrl=n.action_url||fallbackUrl(n.notification_type);
      return <article className={read?"notification-card read":"notification-card unread"} key={n.id}>
        <div className="notification-icon"><NoticeIcon type={n.notification_type}/></div>
        <div className="notification-copy">
          <div className="notification-meta">
            <span className="chip">{typeLabel(n.notification_type)}</span>
            <span>{new Date(n.created_at).toLocaleString("en-US",{timeZone:"America/New_York",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})+" ET"}</span>
            {!read&&<span className="unread-dot" aria-label="Unread"/>}
          </div>
          <h2>{n.title}</h2>
          {n.body&&<p>{n.body}</p>}
          {read&&<span className="read-state"><CheckCircle2 size={14}/> Read</span>}
        </div>
        <NotificationActions id={n.id} actionUrl={actionUrl} read={read}/>
      </article>;
    })}</div>
    :<section className="empty-feature notification-empty">
      <div className="empty-feature-icon"><BellRing size={30}/></div>
      <div><span className="section-kicker">All clear</span><h2>No notifications yet</h2><p>New LHS announcements, campaigns, and battle reminders will appear here automatically.</p></div>
    </section>}
  </>;
}