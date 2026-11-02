"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, UsersRound, Swords, MessagesSquare, GraduationCap, LifeBuoy, UserRound, ShieldCheck, Target, BellRing, Bell, Menu, X, KeyRound } from "lucide-react";

const base=[
 {href:"/portal",label:"Dashboard",icon:LayoutDashboard,exact:true},
 {href:"/portal/battles",label:"Battle Central",icon:Swords},
 {href:"/portal/campaigns",label:"Campaigns",icon:Target},
 {href:"/portal/community",label:"Community",icon:MessagesSquare},
 {href:"/portal/announcements",label:"Announcements",icon:BellRing},
 {href:"/portal/notifications",label:"Notifications",icon:Bell},
 {href:"/portal/academy",label:"Creator Academy",icon:GraduationCap},
 {href:"/portal/support",label:"Support",icon:LifeBuoy},
 {href:"/portal/profile",label:"My Profile",icon:UserRound}
];
export function SidebarNav({activeRole}:{activeRole:string|null}){
 const pathname=usePathname();
 const[menuOpen,setMenuOpen]=useState(false);
 useEffect(()=>{setMenuOpen(false)},[pathname]);
 const items=[...base];
 if(activeRole==="manager"||activeRole==="admin"){
  items.splice(1,0,{href:"/portal/creators",label:"Creators",icon:UsersRound});
  items.push({href:"/portal/password-help",label:"Password Help",icon:KeyRound});
 }
 if(activeRole==="admin")items.push({href:"/portal/administration",label:"Administration",icon:ShieldCheck});
 return <div className="nav-container">
  <button type="button" className="mobile-menu-toggle" aria-expanded={menuOpen} aria-controls="lhs-main-menu" onClick={()=>setMenuOpen(v=>!v)}>
   {menuOpen?<X size={20}/>:<Menu size={20}/>}<span>{menuOpen?"Close menu":"Open page menu"}</span>
  </button>
  <nav id="lhs-main-menu" className={"side-nav "+(menuOpen?"mobile-open":"")} aria-label="Primary navigation">
    {items.map(item=>{
      const active="exact" in item&&item.exact?pathname===item.href:pathname.startsWith(item.href);
      const Icon=item.icon;
      return <Link key={item.href} href={item.href} aria-current={active?"page":undefined} className={active?"side-link active":"side-link"} onClick={()=>setMenuOpen(false)}>
       <span className="side-icon"><Icon size={20} strokeWidth={1.9}/></span><span>{item.label}</span>
       {active&&<span className="side-active-dot"/>}
      </Link>;
    })}
  </nav>
 </div>;
}
