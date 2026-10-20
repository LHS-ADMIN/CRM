import Link from "next/link";
import { Archive, CalendarDays, ChevronLeft, ChevronRight, Clock3, Swords } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

function easternToday(){
  const parts=new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const get=(type:string)=>parts.find(p=>p.type===type)?.value||"";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
function monthValue(raw?:string){
  if(raw&&/^\d{4}-\d{2}$/.test(raw)){
    const [y,m]=raw.split("-").map(Number);
    if(m>=1&&m<=12)return new Date(Date.UTC(y,m-1,1));
  }
  const [y,m]=easternToday().slice(0,7).split("-").map(Number);
  return new Date(Date.UTC(y,m-1,1));
}
function ymd(d:Date){return d.toISOString().slice(0,10)}
function ym(d:Date){return d.toISOString().slice(0,7)}
function prettyDate(key:string){
  return new Date(key+"T12:00:00").toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"});
}

export default async function BattlesPage({searchParams}:{searchParams:Promise<{month?:string;day?:string}>}){
  const params=await searchParams;
  const month=monthValue(params.month);
  const next=new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth()+1,1));
  const prev=new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth()-1,1));
  const monthKey=ym(month);
  const todayKey=easternToday();
  const currentMonthKey=todayKey.slice(0,7);
  const isArchived=monthKey<currentMonthKey;

  const selectedDay=params.day&&/^\d{4}-\d{2}-\d{2}$/.test(params.day)&&params.day.startsWith(monthKey+"-")
    ?params.day
    :null;

  const gridStart=new Date(month);
  gridStart.setUTCDate(1-gridStart.getUTCDay());
  const days=Array.from({length:42},(_,i)=>{const d=new Date(gridStart);d.setUTCDate(gridStart.getUTCDate()+i);return d});

  const supabase=await createClient();
  const {data:monthBattles}=await supabase.from("battles")
    .select("id,creator_handle,battle_date,time_est,time_sort,opponent_name,opponent_agency,diamond_range,league,lhs_manager,status")
    .gte("battle_date",ymd(month))
    .lt("battle_date",ymd(next))
    .order("battle_date")
    .order("time_sort")
    .limit(1500);

  const byDate=new Map<string,NonNullable<typeof monthBattles>>();
  for(const battle of monthBattles||[]){
    const rows=byDate.get(battle.battle_date)||[];
    rows.push(battle);
    byDate.set(battle.battle_date,rows);
  }

  const detailRows=selectedDay
    ?(monthBattles||[]).filter(b=>b.battle_date===selectedDay)
    :(monthBattles||[]);

  const detailTitle=selectedDay
    ?`Battles for ${prettyDate(selectedDay)}`
    :`${month.toLocaleDateString("en-US",{month:"long",year:"numeric",timeZone:"UTC"})} battles`;

  return <>
    <div className="page-head">
      <div>
        <span className="section-kicker">Battle Central</span>
        <h1>{isArchived?"Archived battle calendar":"Battle calendar"}</h1>
        <p>Leadership schedules battles in the A/B League source sheets. The CRM remains read-only and displays all battle times in EST. Select any date to view that day's battles.</p>
      </div>
      <div className="head-actions">
        {isArchived&&<span className="chip archive-chip"><Archive size={15}/> Archived month</span>}
        <span className="chip accent"><Clock3 size={15}/> EST only</span>
        <span className="chip"><Swords size={15}/> {monthBattles?.length||0} this month</span>
      </div>
    </div>

    <section className="panel calendar-panel">
      <div className="calendar-toolbar">
        <Link className="icon-button bordered" href={`/portal/battles?month=${ym(prev)}`} aria-label="Previous month"><ChevronLeft size={21}/></Link>
        <div>
          <strong>{month.toLocaleDateString("en-US",{month:"long",year:"numeric",timeZone:"UTC"})}</strong>
          <span>{isArchived?"Archived schedule":"Battle schedule"}</span>
        </div>
        <Link className="icon-button bordered" href={`/portal/battles?month=${ym(next)}`} aria-label="Next month"><ChevronRight size={21}/></Link>
      </div>

      <div className="calendar-weekdays">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(day=><span key={day}>{day}</span>)}</div>

      <div className="calendar-grid">{days.map(d=>{
        const key=ymd(d);
        const outside=d.getUTCMonth()!==month.getUTCMonth();
        const rows=outside?[]:(byDate.get(key)||[]);
        const today=key===todayKey;
        const selected=key===selectedDay;

        const inner=<>
          <div className="calendar-date">
            <span>{d.getUTCDate()}</span>
            {rows.length>0&&<small>{rows.length} {rows.length===1?"battle":"battles"}</small>}
          </div>
          <div className="calendar-events">
            {rows.slice(0,3).map(b=><div className="battle-event" key={b.id} title={`${b.creator_handle||"LHS"} vs ${b.opponent_name||"TBD"}`}>
              <strong>{b.time_est.replace(" EST","")}</strong>
              <span>{b.creator_handle||"LHS Creator"}</span>
              <small>vs {b.opponent_name||"TBD"}</small>
            </div>)}
            {rows.length>3&&<div className="more-events">+{rows.length-3} more — select day</div>}
            {!outside&&rows.length===0&&<div className="no-battles">No battles</div>}
          </div>
        </>;

        return outside
          ?<div className="calendar-day outside" key={key}>{inner}</div>
          :<Link
              className={`calendar-day calendar-day-link ${today?"today":""} ${selected?"selected":""}`}
              key={key}
              href={`/portal/battles?month=${monthKey}&day=${key}#schedule-detail`}
              aria-label={`View ${rows.length} ${rows.length===1?"battle":"battles"} for ${prettyDate(key)}`}
            >{inner}</Link>;
      })}</div>
    </section>

    <section className="panel battle-detail-panel" id="schedule-detail">
      <div className="panel-head">
        <div>
          <span className="section-kicker">{selectedDay?"Selected day":"Schedule detail"}</span>
          <h2>{detailTitle}</h2>
          <p className="battle-detail-copy">{selectedDay
            ?`${detailRows.length} ${detailRows.length===1?"battle":"battles"} scheduled for this date.`
            :"Only battles from this month are shown here. Previous months remain available through the calendar archive."
          }</p>
        </div>
        {selectedDay&&<Link className="btn" href={`/portal/battles?month=${monthKey}#schedule-detail`}><CalendarDays size={17}/> Show full month</Link>}
      </div>

      <div className="table-wrap">
        <table className="table battle-table">
          <thead><tr><th>Date</th><th>Time</th><th>LHS Creator</th><th>Manager</th><th>Opponent</th><th>Opponent Agency</th><th>Diamond Range</th><th>League</th></tr></thead>
          <tbody>{detailRows.length?detailRows.map(b=><tr key={b.id}>
            <td>{new Date(b.battle_date+"T12:00:00").toLocaleDateString()}</td>
            <td><strong>{b.time_est}</strong></td>
            <td>{b.creator_handle||"—"}</td>
            <td>{b.lhs_manager||"—"}</td>
            <td>{b.opponent_name||"—"}</td>
            <td>{b.opponent_agency||"—"}</td>
            <td>{b.diamond_range||"—"}</td>
            <td><span className="chip accent">{b.league}</span></td>
          </tr>):<tr><td colSpan={8}><div className="empty-state compact">No battles are scheduled for this date.</div></td></tr>}</tbody>
        </table>
      </div>
    </section>
  </>;
}
