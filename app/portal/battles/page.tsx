import Link from "next/link";
import { ChevronLeft, ChevronRight, Clock3, Swords } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

function monthValue(raw?:string){
  if(raw&&/^\d{4}-\d{2}$/.test(raw)){const [y,m]=raw.split("-").map(Number);if(m>=1&&m<=12)return new Date(Date.UTC(y,m-1,1));}
  const n=new Date(); return new Date(Date.UTC(n.getUTCFullYear(),n.getUTCMonth(),1));
}
function ymd(d:Date){return d.toISOString().slice(0,10)}
function ym(d:Date){return d.toISOString().slice(0,7)}

export default async function BattlesPage({searchParams}:{searchParams:Promise<{month?:string}>}){
  const params=await searchParams;
  const month=monthValue(params.month);
  const next=new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth()+1,1));
  const prev=new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth()-1,1));
  const start=new Date(month);
  start.setUTCDate(1-start.getUTCDay());
  const end=new Date(start); end.setUTCDate(start.getUTCDate()+41);

  const supabase=await createClient();
  const {data}=await supabase.from("battles")
    .select("id,creator_handle,battle_date,time_est,time_sort,opponent_name,opponent_agency,diamond_range,league,lhs_manager,status")
    .gte("battle_date",ymd(start)).lte("battle_date",ymd(end))
    .order("battle_date").order("time_sort").limit(1500);

  const byDate=new Map<string,typeof data>();
  for(const b of data||[]){const arr=byDate.get(b.battle_date)||[];arr.push(b);byDate.set(b.battle_date,arr)}
  const days=Array.from({length:42},(_,i)=>{const d=new Date(start);d.setUTCDate(start.getUTCDate()+i);return d});

  return <>
    <div className="page-head">
      <div><span className="section-kicker">Battle Central</span><h1>Battle calendar</h1><p>Leadership schedules battles in the A/B League source sheets. The CRM remains read-only and displays all battle times in EST.</p></div>
      <div className="head-actions"><span className="chip accent"><Clock3 size={13}/> EST only</span><span className="chip"><Swords size={13}/> {data?.length||0} in view</span></div>
    </div>

    <section className="panel calendar-panel">
      <div className="calendar-toolbar">
        <Link className="icon-button bordered" href={`/portal/battles?month=${ym(prev)}`} aria-label="Previous month"><ChevronLeft size={18}/></Link>
        <div><strong>{month.toLocaleDateString("en-US",{month:"long",year:"numeric",timeZone:"UTC"})}</strong><span>Battle schedule</span></div>
        <Link className="icon-button bordered" href={`/portal/battles?month=${ym(next)}`} aria-label="Next month"><ChevronRight size={18}/></Link>
      </div>
      <div className="calendar-weekdays">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=><span key={d}>{d}</span>)}</div>
      <div className="calendar-grid">{days.map(d=>{
        const key=ymd(d), rows=byDate.get(key)||[], outside=d.getUTCMonth()!==month.getUTCMonth();
        const today=key===new Date().toISOString().slice(0,10);
        return <div className={`calendar-day ${outside?"outside":""} ${today?"today":""}`} key={key}>
          <div className="calendar-date"><span>{d.getUTCDate()}</span>{rows.length>0&&<small>{rows.length}</small>}</div>
          <div className="calendar-events">{rows.slice(0,3).map(b=><div className="battle-event" key={b.id} title={`${b.creator_handle||"LHS"} vs ${b.opponent_name||"TBD"}`}>
            <strong>{b.time_est.replace(" EST","")}</strong><span>{b.creator_handle||"LHS Creator"}</span><small>vs {b.opponent_name||"TBD"}</small>
          </div>)}{rows.length>3&&<div className="more-events">+{rows.length-3} more</div>}</div>
        </div>
      })}</div>
    </section>

    <section className="panel" style={{marginTop:20}}>
      <div className="panel-head"><div><span className="section-kicker">Schedule detail</span><h2>All battles in this calendar window</h2></div></div>
      <div className="table-wrap"><table className="table"><thead><tr><th>Date</th><th>Time</th><th>LHS Creator</th><th>Manager</th><th>Opponent</th><th>Opponent Agency</th><th>Diamond Range</th><th>League</th></tr></thead><tbody>{(data||[]).map(b=><tr key={b.id}><td>{new Date(b.battle_date+"T12:00:00").toLocaleDateString()}</td><td><strong>{b.time_est}</strong></td><td>{b.creator_handle||"—"}</td><td>{b.lhs_manager||"—"}</td><td>{b.opponent_name||"—"}</td><td>{b.opponent_agency||"—"}</td><td>{b.diamond_range||"—"}</td><td><span className="chip accent">{b.league}</span></td></tr>)}</tbody></table></div>
    </section>
  </>;
}
