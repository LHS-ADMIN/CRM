import Link from "next/link";
import { ArrowRight, CalendarClock, Gem, Radio, Sparkles, Trophy, UsersRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function Dashboard(){
  const supabase=await createClient();
  const now=new Date();
  const today=now.toISOString().slice(0,10);
  const in30=new Date(Date.now()+30*86400000).toISOString().slice(0,10);
  const isoNow=now.toISOString();

  const [
    {count:creators},{count:battles},{count:campaigns},{count:unread},
    {data:upcoming},{data:campaignList},{data:announcements},{data:metrics}
  ]=await Promise.all([
    supabase.from("creators").select("*",{count:"exact",head:true}).eq("active",true),
    supabase.from("battles").select("*",{count:"exact",head:true}).gte("battle_date",today).lte("battle_date",in30),
    supabase.from("campaigns").select("*",{count:"exact",head:true}).eq("active",true).lte("start_at",isoNow).gte("end_at",isoNow),
    supabase.from("notifications").select("*",{count:"exact",head:true}).is("read_at",null),
    supabase.from("battles").select("id,creator_handle,battle_date,time_est,opponent_name,league").gte("battle_date",today).order("battle_date").order("time_sort").limit(5),
    supabase.from("campaigns").select("id,title,start_at,end_at,status,audience_type").eq("active",true).order("start_at",{ascending:true}).limit(4),
    supabase.from("announcements").select("id,title,body,starts_at,audience_type").order("starts_at",{ascending:false}).limit(4),
    supabase.from("metrics_current").select("diamonds,live_days,live_streams")
  ]);

  const totalDiamonds=(metrics||[]).reduce((sum,row)=>sum+Number(row.diamonds||0),0);
  const liveDays=(metrics||[]).reduce((sum,row)=>sum+Number(row.live_days||0),0);

  return <>
    <section className="hero-panel">
      <div>
        <span className="eyebrow light">LHS operations intelligence</span>
        <h1>Network command center</h1>
        <p>One place to run creator operations, battles, campaigns, community, and leadership workflows without chasing spreadsheets.</p>
      </div>
      <div className="hero-actions">
        <Link className="btn light" href="/portal/battles"><CalendarClock size={17}/> View Battle Central</Link>
        <Link className="btn gold" href="/portal/campaigns"><Sparkles size={17}/> Campaign Hub</Link>
      </div>
      <div className="hero-orb hero-orb-one"/><div className="hero-orb hero-orb-two"/>
    </section>

    <section className="kpi-grid">
      <article className="kpi-card"><div className="kpi-icon"><UsersRound size={19}/></div><div><span>Creators in scope</span><strong>{creators??0}</strong><small>Based on active role</small></div></article>
      <article className="kpi-card"><div className="kpi-icon"><Radio size={19}/></div><div><span>Next 30-day battles</span><strong>{battles??0}</strong><small>Read-only calendar</small></div></article>
      <article className="kpi-card"><div className="kpi-icon"><Trophy size={19}/></div><div><span>Active campaigns</span><strong>{campaigns??0}</strong><small>Current visibility</small></div></article>
      <article className="kpi-card"><div className="kpi-icon"><Gem size={19}/></div><div><span>Current diamonds</span><strong>{totalDiamonds.toLocaleString()}</strong><small>{liveDays.toLocaleString()} live-days recorded</small></div></article>
    </section>

    <section className="dashboard-grid">
      <article className="panel span-7">
        <div className="panel-head"><div><span className="section-kicker">Battle Central</span><h2>Upcoming matchups</h2></div><Link href="/portal/battles" className="text-link">Full calendar <ArrowRight size={15}/></Link></div>
        <div className="battle-list">{(upcoming||[]).length?(upcoming||[]).map(b=><div className="battle-row" key={b.id}>
          <div className="date-tile"><strong>{new Date(b.battle_date+"T12:00:00").toLocaleDateString("en-US",{day:"2-digit"})}</strong><span>{new Date(b.battle_date+"T12:00:00").toLocaleDateString("en-US",{month:"short"})}</span></div>
          <div className="battle-main"><strong>{b.creator_handle||"LHS Creator"}</strong><span>vs. {b.opponent_name||"Opponent TBD"}</span></div>
          <div className="battle-time"><strong>{b.time_est}</strong><span className="chip">{b.league} League</span></div>
        </div>):<div className="empty-state compact">No upcoming battles in the next window.</div>}</div>
      </article>

      <article className="panel span-5">
        <div className="panel-head"><div><span className="section-kicker">Communications</span><h2>Latest announcements</h2></div><Link href="/portal/announcements" className="text-link">All updates <ArrowRight size={15}/></Link></div>
        <div className="announcement-stack">{(announcements||[]).length?(announcements||[]).map(a=><div className="announcement-item" key={a.id}><div className="announcement-dot"/><div><div className="split-line"><strong>{a.title}</strong><span>{a.audience_type}</span></div><p>{a.body}</p><small>{new Date(a.starts_at).toLocaleDateString()}</small></div></div>):<div className="empty-state compact">No current announcements.</div>}</div>
      </article>

      <article className="panel span-12">
        <div className="panel-head"><div><span className="section-kicker">Campaign Hub</span><h2>Current and upcoming campaigns</h2></div><Link href="/portal/campaigns" className="text-link">Open campaigns <ArrowRight size={15}/></Link></div>
        <div className="campaign-strip">{(campaignList||[]).length?(campaignList||[]).map(c=>{
          const start=new Date(c.start_at),end=new Date(c.end_at);
          const pct=Math.max(0,Math.min(100,Math.round(((Date.now()-start.valueOf())/Math.max(1,end.valueOf()-start.valueOf()))*100)));
          return <div className="campaign-mini" key={c.id}><div className="split-line"><span className="chip accent">{c.audience_type}</span><small>{c.status}</small></div><h3>{c.title}</h3><div className="progress"><span style={{width:`${pct}%`}}/></div><div className="split-line"><small>{start.toLocaleDateString()}</small><strong>{pct}%</strong><small>{end.toLocaleDateString()}</small></div></div>
        }):<div className="empty-state compact">No campaigns available for your current role.</div>}</div>
      </article>
    </section>
  </>;
}
