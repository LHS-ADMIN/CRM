import Link from "next/link";
import { Archive, CalendarDays, ChevronLeft, ChevronRight, Clock3, Swords } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BattleCalendarActions } from "./battle-calendar-actions";

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
  const {data:{user}}=await supabase.auth.getUser();
  let activeRole:string|null=null;
  let ownCreatorId:string|null=null;
  if(user){
    const [{data:profile},{data:ownCreator}]=await Promise.all([
      supabase.from("profiles").select("active_role").eq("id",user.id).maybeSingle(),
      supabase.from("creators").select("id").eq("auth_user_id",user.id).eq("active",true).maybeSingle()
    ]);
    activeRole=profile?.active_role||null;
    ownCreatorId=ownCreator?.id||null;
  }

  const {data:monthBattles}=await supabase.from("battles")
    .select("id,creator_id,creator_handle,battle_date,time_est,time_sort,opponent_name,opponent_agency,diamond_range,league,lhs_manager,status,updated_at,synced_at,alert_reason,alert_at,source_confirm,alert_previous_opponent,alert_new_opponent,alert_previous_time,alert_new_time")
    .gte("battle_date",ymd(month))
    .lt("battle_date",ymd(next))
    .order("battle_date")
    .order("time_sort")
    .limit(1500);

  const isSoon=(b:{battle_date:string;time_sort:string|null})=>{
    if(!b.time_sort)return false;
    const now=Date.now();
    const [year,mo,day]=b.battle_date.split("-").map(Number);
    const [hours,minutes]=b.time_sort.split(":").map(Number);
    const probe=new Date(Date.UTC(year,mo-1,day,hours,minutes));
    const offsetName=new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",timeZoneName:"shortOffset"}).formatToParts(probe).find(p=>p.type==="timeZoneName")?.value||"GMT-5";
    const hoursOffset=Number(offsetName.replace("GMT",""))||-5;
    const battleAt=Date.UTC(year,mo-1,day,hours-hoursOffset,minutes);
    return battleAt>now&&battleAt<=now+48*3600*1000;
  };
  const statusOf=(b:NonNullable<typeof monthBattles>[number])=>{
    if(b.status==="filled"&&(b.alert_reason||(activeRole==="manager"&&isSoon(b))))return "Alert";
    return b.status==="open"?"Open":b.status==="filled"?"Filled":b.status==="confirmed"?"Confirmed":b.status;
  };
  const categoryCounts={open:0,filled:0,confirmed:0,alerts:0};
  for(const b of monthBattles||[]){
    if(b.status==="open")categoryCounts.open++;
    if(b.status==="filled")categoryCounts.filled++;
    if(b.status==="confirmed")categoryCounts.confirmed++;
    if(statusOf(b)==="Alert")categoryCounts.alerts++;
  }
  const alertBattles=(monthBattles||[]).filter(b=>statusOf(b)==="Alert");
  const lastSynced=(monthBattles||[]).map(b=>b.synced_at).filter((value):value is string=>Boolean(value)).sort().at(-1)||null;
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

  type BattleRow=NonNullable<typeof monthBattles>[number];
  const canSyncBattle=(b:BattleRow)=>(
    (activeRole==="admin"||activeRole==="manager"||(activeRole==="creator"&&Boolean(ownCreatorId&&b.creator_id===ownCreatorId)))
    && Boolean(b.time_sort)
    && !["cancelled","canceled"].includes(String(b.status||"").toLowerCase())
  );
  const calendarActions=(b:BattleRow)=><BattleCalendarActions battle={{
    id:b.id,creatorHandle:b.creator_handle,battleDate:b.battle_date,
    timeEst:b.time_est,timeSort:b.time_sort,opponentName:b.opponent_name,
    opponentAgency:b.opponent_agency,diamondRange:b.diamond_range,
    league:b.league,lhsManager:b.lhs_manager,updatedAt:b.updated_at
  }}/>;
  const quickAddBattles=(monthBattles||[])
    .filter(b=>b.battle_date>=todayKey&&canSyncBattle(b))
    .slice(0,3);

  return <div className={"battles-page"+(selectedDay?" has-selected-day":"")}>
    <div className="page-head">
      <div>
        <span className="section-kicker">Battle Central</span>
        <h1>{isArchived?"Archived battle calendar":"Battle calendar"}</h1>

        <div className="calendar-sync-note"><CalendarDays size={17}/><span><strong>Calendar sync:</strong> Assigned battles can be added to Google Calendar or Apple/iCal. This version creates a calendar copy; later Battle Central changes do not automatically rewrite an event already added to your personal calendar.</span></div>
      </div>
      <div className="head-actions">
        {isArchived&&<span className="chip archive-chip"><Archive size={15}/> Archived month</span>}
        <span className="chip accent"><Clock3 size={15}/> EST only</span>
        <span className="chip"><Swords size={15}/> {monthBattles?.length||0} this month</span>
        {lastSynced&&<span className="chip battle-sync-timestamp" title="Google Sheets are checked automatically every five minutes"><Clock3 size={15}/> Last synced: {new Date(lastSynced).toLocaleString("en-US",{timeZone:"America/New_York",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})} ET</span>}
      </div>
    </div>

    <div className="battle-source-links">
      <a href="https://docs.google.com/spreadsheets/d/1aeRaVKJgQLcCQx3ZXogcnsfCrgBguFZTpVe-TUtJv3w/edit?usp=drivesdk" target="_blank" rel="noopener noreferrer" className="btn">Open A League Google Sheet ↗</a>
      <a href="https://docs.google.com/spreadsheets/d/1MAvE8MazgSx83Dv1VYa8x_KVGRUDSZzTti922Ypx_F0/edit?usp=drivesdk" target="_blank" rel="noopener noreferrer" className="btn">Open B League Google Sheet ↗</a>
    </div>
    <section className="battle-alert-summary panel" aria-label="Battle status summary">
      <span><strong>{categoryCounts.open}</strong> Open</span>
      <span><strong>{categoryCounts.filled}</strong> Filled</span>
      <span className="battle-confirmed-count"><strong>{categoryCounts.confirmed}</strong> Confirmed</span>
      <a href="#battle-alerts" className={categoryCounts.alerts?"battle-alert-count active battle-alert-link":"battle-alert-count battle-alert-link"} aria-label={`Show ${categoryCounts.alerts} battle alerts`}><strong>{categoryCounts.alerts}</strong> Alerts <span aria-hidden="true">↓</span></a>
    </section>
    <div className="battle-status-legend" aria-label="Battle status colors">
      <span className="battle-status open">Open</span><span className="battle-status filled">Filled</span>
      <span className="battle-status confirmed">Confirmed</span><span className="battle-status alert">Alert</span>
    </div>
    <section className="panel battle-alerts-panel" id="battle-alerts" aria-labelledby="battle-alerts-heading">
      <h2 id="battle-alerts-heading">Battle alerts ({alertBattles.length})</h2>
      {alertBattles.length?<div className="battle-alert-items">{alertBattles.map(b=><article className="battle-alert-item" key={b.id}>
        <div className="battle-alert-head"><strong>{b.creator_handle||"LHS Creator"}</strong><span className="battle-status alert">Alert</span></div>
        <div className="battle-alert-sub">{prettyDate(b.battle_date)} · {b.time_est} · {b.league} League</div>
        <p className="battle-alert-reason">{b.alert_reason||"Not marked confirmed within 48 hours of battle time."}</p>
        {(b.alert_previous_opponent||b.alert_new_opponent)&&<p><strong>Opponent:</strong> {b.alert_previous_opponent||"Unknown"} → {b.alert_new_opponent||b.opponent_name||"Unassigned"}</p>}
        {(b.alert_previous_time||b.alert_new_time)&&<p><strong>Time:</strong> {b.alert_previous_time||"Unknown"} → {b.alert_new_time||b.time_est}</p>}
        {b.alert_reason&&!b.alert_previous_opponent&&!b.alert_previous_time&&<p className="muted">Earlier alert: the previous value was not recorded.</p>}
        <Link className="battle-alert-day-link" href={`/portal/battles?month=${monthKey}&day=${b.battle_date}#schedule-detail`}>View this battle</Link>
      </article>)}</div>:<p className="muted">No active battle alerts this month.</p>}
    </section>
    <section className="panel battle-calendar-quickadd" aria-labelledby="battle-calendar-add-heading">
      <div className="battle-calendar-quickadd-header">
        <div>
          <span className="section-kicker">Calendar tools</span>
          <h2 id="battle-calendar-add-heading"><CalendarDays size={23} aria-hidden="true"/> Add battles to your calendar</h2>
          <p>Choose Google Calendar to create an event, or Apple / iCal to download a calendar file. Each event is a copy; if the battle changes, add the updated version again.</p>
        </div>
        <a className="btn battle-calendar-find-date" href="#battle-calendar"><CalendarDays size={18}/> Choose a date</a>
      </div>
      {quickAddBattles.length>0
        ?<div className="battle-calendar-quickadd-list">
          {quickAddBattles.map(b=><article className="battle-calendar-quickadd-item" key={b.id}>
            <div className="battle-calendar-quickadd-meta"><strong>{prettyDate(b.battle_date)} · {b.time_est}</strong>
              <span>{b.creator_handle||"LHS Creator"} vs. {b.opponent_name||"Opponent TBD"} · {b.league} League</span>
            </div>
            {calendarActions(b)}
          </article>)}
        </div>
        :<p className="battle-calendar-quickadd-empty">{activeRole==="creator"
          ?"No upcoming battles are currently linked to your creator account for this month. Ask your manager to check your account link if a battle is missing."
          :"Select a date below to find battles and add them to your calendar."}</p>}
    </section>
    <section className="panel calendar-panel" id="battle-calendar">
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
            {rows.length>0&&<span className="calendar-status-dots" aria-hidden="true">
              {(["open","filled","confirmed"] as const).filter(s=>rows.some(b=>b.status===s)).map(s=><i key={s} className={"calendar-dot "+s}/>)}
              {rows.some(b=>statusOf(b)==="Alert")&&<i className="calendar-dot alert"/>}
            </span>}
            {rows.length>0&&<small title={`${rows.length} scheduled ${rows.length===1?"battle":"battles"}`}>{rows.length} {rows.length===1?"battle":"battles"}</small>}
          </div>
          <div className="calendar-events">
            {rows.slice(0,3).map(b=><div className={"battle-event status-"+b.status+(statusOf(b)==="Alert"?" has-alert":"")} key={b.id} title={`${b.creator_handle||"LHS"} vs ${b.opponent_name||"TBD"}`}>
              <strong>{b.time_est.replace(" EST","")}</strong>
              <span>{b.creator_handle||"LHS Creator"}</span>
              <small>vs {b.opponent_name||"TBD"}</small><em className={"battle-status "+statusOf(b).toLowerCase()}>{statusOf(b)}</em>
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
        {selectedDay&&<Link className="btn battle-day-close" href={`/portal/battles?month=${monthKey}`}><CalendarDays size={17}/> Back to month</Link>}
      </div>

      {selectedDay&&<div className="mobile-battle-day-list" aria-label={"Battles for "+prettyDate(selectedDay)}>
        {detailRows.length?detailRows.map(b=><article className="mobile-day-battle" key={b.id}>
          <div className="mobile-day-battle-top"><strong>{b.time_est}</strong><span className={"battle-status "+statusOf(b).toLowerCase()}>{statusOf(b)}</span></div>
          {statusOf(b)==="Alert"&&<p className="battle-alert-reason">{b.alert_reason||"Not marked confirmed within 48 hours of battle time."}</p>}
          <div className="mobile-day-battle-names"><strong>{b.creator_handle||"LHS Creator"}</strong><span>vs.</span><strong>{b.opponent_name||"Opponent not assigned"}</strong></div>
          <div className="mobile-day-battle-meta">
            <span>{b.league} League</span>
            {b.lhs_manager&&<span>Manager: {b.lhs_manager}</span>}
            {b.opponent_agency&&<span>Agency: {b.opponent_agency}</span>}
            {b.diamond_range&&<span>Diamonds: {b.diamond_range}</span>}
          </div>
          {canSyncBattle(b)&&<div className="mobile-day-battle-calendar">
            <strong className="mobile-calendar-heading"><CalendarDays size={17} aria-hidden="true"/> Add to calendar</strong>
            {calendarActions(b)}
          </div>}
        </article>):<p className="mobile-day-empty">No battles are scheduled for this day.</p>}
      </div>}
      <div className="table-wrap">
        <table className="table battle-table">
          <thead><tr><th>Date</th><th>Time</th><th>LHS Creator</th><th>Manager</th><th>Opponent</th><th>Opponent Agency</th><th>Diamond Range</th><th>League</th><th>Status</th><th>Calendar</th></tr></thead>
          <tbody>{detailRows.length?detailRows.map(b=><tr key={b.id}>
            <td>{new Date(b.battle_date+"T12:00:00").toLocaleDateString()}</td>
            <td><strong>{b.time_est}</strong></td>
            <td>{b.creator_handle||"—"}</td>
            <td>{b.lhs_manager||"—"}</td>
            <td>{b.opponent_name||"—"}</td>
            <td>{b.opponent_agency||"—"}</td>
            <td>{b.diamond_range||"—"}</td>
            <td><span className="chip accent">{b.league}</span></td>
            <td><span className={"battle-status "+statusOf(b).toLowerCase()} title={b.alert_reason||undefined}>{statusOf(b)}</span></td>
            <td>{canSyncBattle(b)?calendarActions(b):<span className="calendar-sync-unavailable">Only assigned, scheduled battles can be added</span>}</td>
          </tr>):<tr><td colSpan={10}><div className="empty-state compact">No battles are scheduled for this date.</div></td></tr>}</tbody>
        </table>
      </div>
    </section>
  </div>;
}
