"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, UsersRound, Swords, Megaphone, MessagesSquare,
  GraduationCap, LifeBuoy, UserRound, ShieldCheck, Target, BellRing
} from "lucide-react";

const base = [
  { href:"/portal", label:"Dashboard", icon:LayoutDashboard, exact:true },
  { href:"/portal/battles", label:"Battle Central", icon:Swords },
  { href:"/portal/campaigns", label:"Campaigns", icon:Target },
  { href:"/portal/community", label:"Community", icon:MessagesSquare },
  { href:"/portal/announcements", label:"Announcements", icon:BellRing },
  { href:"/portal/academy", label:"Creator Academy", icon:GraduationCap },
  { href:"/portal/support", label:"Support", icon:LifeBuoy },
  { href:"/portal/profile", label:"My Profile", icon:UserRound },
];

export function SidebarNav({activeRole}:{activeRole:string|null}) {
  const path=usePathname();
  const items=[...base];
  if(activeRole==="manager"||activeRole==="admin") items.splice(1,0,{href:"/portal/creators",label:"Creators",icon:UsersRound});
  if(activeRole==="admin") items.push({href:"/portal/administration",label:"Administration",icon:ShieldCheck});
  return <nav className="side-nav" aria-label="Primary navigation">
    {items.map(item=>{
      const active=item.exact?path===item.href:path.startsWith(item.href);
      const Icon=item.icon;
      return <Link key={item.href} href={item.href} aria-current={active?"page":undefined} className={active?"side-link active":"side-link"}>
        <span className="side-icon"><Icon size={18} strokeWidth={1.9}/></span>
        <span>{item.label}</span>
        {active&&<span className="side-active-dot"/>}
      </Link>;
    })}
  </nav>;
}
