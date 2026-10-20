import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SidebarNav } from "@/components/sidebar-nav";
import { PortalTopbar } from "@/components/portal-topbar";

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
      <PortalTopbar displayName={profile.display_name} roles={roles} activeRole={active} unread={unread||0}/>
      <div id="main-content" tabIndex={-1} className="content">{children}</div>
    </main>
  </div>;
}
