import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SidebarNav } from "@/components/sidebar-nav";
import { PortalTopbar } from "@/components/portal-topbar";
import { EventGate } from "@/components/event-gate";
import { ReturnToTop } from "@/components/return-to-top";

export default async function PortalLayout({children}:{children:React.ReactNode}){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect("/login");

  const [{data:profile},{data:roleRows},{count:unread}]=await Promise.all([
    supabase.from("profiles").select("display_name,active,must_change_password,active_role,avatar_url").eq("id",user.id).single(),
    supabase.from("user_roles").select("role").eq("user_id",user.id),
    supabase.from("notifications").select("*",{count:"exact",head:true}).is("read_at",null)
  ]);

  if(!profile?.active)redirect("/login");
  if(profile.must_change_password)redirect("/change-password");

  const {data:upcomingEvents}=await (supabase as any).from("community_events")
    .select("id,title,details,event_type,starts_at,require_ack")
    .eq("require_ack",true).gte("starts_at",new Date().toISOString()).order("starts_at").limit(30);
  const {data:acknowledgments}=await (supabase as any).from("event_acknowledgments").select("event_id").eq("user_id",user.id);
  const acknowledged=new Set((acknowledgments||[]).map((x:{event_id:string})=>x.event_id));
  const unacknowledged=(upcomingEvents||[]).filter((x:{id:string})=>!acknowledged.has(x.id));
  const roles=(roleRows||[]).map(x=>x.role);
  const active=profile.active_role||roles[0]||null;

  return <div className="portal-shell">
    <a className="skip-link" href="#main-content">Skip to main content</a>
    <aside className="sidebar">
      <div className="brand-lockup branded">
        <div className="brand-logo-wrap"><img src="/lhs-logo.webp" alt="LHS logo"/></div>
        <div className="brand-copy"><strong>LHS Connect</strong><span>Life · Health · Strength</span></div>
      </div>
      <div className="sidebar-brand-rule"><span/><span/><span/></div>
      <div className="sidebar-label">Workspace</div>
      <SidebarNav activeRole={active}/>
      <div className="sidebar-footer">
        <div className="network-status"><span className="status-dot"/><div><strong>Production</strong><small>Creator network online</small></div></div>
        <div className="sidebar-version">LHS Connect · Command Center</div>
      </div>
    </aside>
    <main className="workspace">
      <PortalTopbar displayName={profile.display_name} avatarUrl={profile.avatar_url} roles={roles} activeRole={active} unread={unread||0}/>
      <div id="main-content" tabIndex={-1} className="content">{children}</div>
      <ReturnToTop/>
      <EventGate userId={user.id} events={unacknowledged}/>
    </main>
  </div>;
}
