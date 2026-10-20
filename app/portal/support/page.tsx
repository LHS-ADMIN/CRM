import { CircleDot, LifeBuoy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
export default async function SupportPage(){
  const supabase=await createClient();
  const {data}=await supabase.from("support_tickets").select("id,subject,category,priority,status,updated_at,created_at").order("updated_at",{ascending:false}).limit(100);
  const open=(data||[]).filter(t=>!["resolved","closed"].includes(t.status)).length;
  return <><div className="page-head"><div><span className="section-kicker">Support Center</span><h1>Tickets and help</h1><p>Track issues without losing context in messages or email threads.</p></div><div className="head-actions"><span className="chip accent"><LifeBuoy size={14}/>{open} open</span></div></div>
  <section className="panel"><div className="panel-head"><div><span className="section-kicker">Your queue</span><h2>Support tickets</h2></div></div><div className="table-wrap"><table className="table"><thead><tr><th>Subject</th><th>Category</th><th>Priority</th><th>Status</th><th>Updated</th></tr></thead><tbody>{(data||[]).length?(data||[]).map(t=><tr key={t.id}><td><strong>{t.subject}</strong></td><td>{t.category||"General"}</td><td><span className={`priority ${t.priority}`}>{t.priority}</span></td><td><span className="status-inline"><CircleDot size={12}/>{t.status.replace("_"," ")}</span></td><td>{new Date(t.updated_at).toLocaleString()}</td></tr>):<tr><td colSpan={5}><div className="empty-state compact">No support tickets yet.</div></td></tr>}</tbody></table></div></section></>;
}
