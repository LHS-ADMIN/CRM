"use client";

import { Bell, HeartPulse, Sparkles } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";
import { RoleSwitcher } from "@/components/role-switcher";

export function PortalTopbar({
  displayName, roles, activeRole, unread
}:{displayName:string;roles:string[];activeRole:string|null;unread:number}) {
  const initials=displayName.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]?.toUpperCase()).join("")||"LH";
  return <header className="topbar branded-topbar">
    <div className="workspace-identity">
      <div className="workspace-mini-logo"><img src="/lhs-logo.png" alt=""/></div>
      <div><strong>LHS Connect</strong><span><HeartPulse size={14}/> Life, Health & Strength Creator Network</span></div>
      <span className="workspace-spark"><Sparkles size={16}/></span>
    </div>
    <div className="topbar-actions">
      <button className="icon-button" aria-label="Notifications">
        <Bell size={19}/>
        {unread>0&&<span className="notification-count">{unread>9?"9+":unread}</span>}
      </button>
      <RoleSwitcher roles={roles} active={activeRole}/>
      <div className="user-chip"><span className="avatar-fallback">{initials}</span><span className="user-chip-copy"><strong>{displayName}</strong><small>{activeRole||"member"}</small></span></div>
      <LogoutButton/>
    </div>
  </header>;
}
