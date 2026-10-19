import { createClient } from "@/lib/supabase/server";
export default async function Dashboard(){
 const supabase=await createClient();const today=new Date().toISOString().slice(0,10);
 const end=new Date(Date.now()+30*86400000).toISOString().slice(0,10);
 const [{count:creators},{count:battles},{count:campaigns},{count:unread},{data:announcements}]=await Promise.all([
  supabase.from("creators").select("*",{count:"exact",head:true}).eq("active",true),
  supabase.from("battles").select("*",{count:"exact",head:true}).gte("battle_date",today).lte("battle_date",end),
  supabase.from("campaigns").select("*",{count:"exact",head:true}).eq("active",true).lte("start_at",new Date().toISOString()).gte("end_at",new Date().toISOString()),
  supabase.from("notifications").select("*",{count:"exact",head:true}).is("read_at",null),
  supabase.from("announcements").select("id,title,body,starts_at").order("starts_at",{ascending:false}).limit(4)
 ]);
 return <><div className="page-head"><div><h1>Dashboard</h1><p>Your LHS operations overview.</p></div></div><div className="grid cols4"><div className="card card-pad kpi"><span>Creators in scope</span><strong>{creators??0}</strong></div><div className="card card-pad kpi"><span>Next 30-day battles</span><strong>{battles??0}</strong></div><div className="card card-pad kpi"><span>Active campaigns</span><strong>{campaigns??0}</strong></div><div className="card card-pad kpi"><span>Unread notices</span><strong>{unread??0}</strong></div></div><div className="card card-pad" style={{marginTop:18}}><h2 style={{marginTop:0}}>Latest announcements</h2><div className="stack">{(announcements||[]).length?(announcements||[]).map(a=><div className="list-item" key={a.id}><strong>{a.title}</strong><div className="muted" style={{marginTop:5}}>{a.body}</div></div>):<div className="muted">No current announcements.</div>}</div></div></>
}
