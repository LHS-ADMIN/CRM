import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";
import { RoleSwitcher } from "@/components/role-switcher";

export default async function PortalLayout({children}:{children:React.ReactNode}){
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const [{data:profile},{data:roleRows}]=await Promise.all([
  supabase.from("profiles").select("display_name,active,must_change_password,active_role").eq("id",user.id).single(),
  supabase.from("user_roles").select("role").eq("user_id",user.id)
 ]);
 if(!profile?.active){await supabase.auth.signOut();redirect("/login")}
 if(profile.must_change_password)redirect("/change-password");
 const roles=(roleRows||[]).map(x=>x.role);const active=profile.active_role||roles[0]||null;
 const nav=[["/portal","Dashboard"],["/portal/battles","Battle Calendar"],["/portal/campaigns","Campaigns"],["/portal/community","Creator Community"],["/portal/announcements","Announcements"],["/portal/academy","Creator Academy"],["/portal/support","Support"],["/portal/profile","My Profile"]];
 if(active==="manager"||active==="admin")nav.splice(1,0,["/portal/creators","Creators"]);
 if(active==="admin")nav.push(["/portal/administration","Administration"]);
 return <div className="portal"><aside className="sidebar"><div className="sidebar-brand"><strong>LHS Creator Network</strong><span>Operations Portal</span></div><nav className="nav">{nav.map(([href,label])=><Link key={href} href={href}>{label}</Link>)}</nav><div className="sidebar-bottom"><div className="muted" style={{fontSize:12,marginBottom:8}}>Signed in as</div><strong style={{display:"block",color:"#fff",marginBottom:10}}>{profile.display_name}</strong><RoleSwitcher roles={roles} active={active}/></div></aside><main className="workspace"><header className="topbar"><strong>LHS Creator Network CRM</strong><div className="top-actions"><LogoutButton/></div></header><div className="content">{children}</div></main></div>
}
