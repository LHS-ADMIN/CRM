"use client";

import { Bell, Search } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";
import { RoleSwitcher } from "@/components/role-switcher";

export function PortalTopbar({
  displayName, roles, activeRole, unread
}:{displayName:string;roles:string[];activeRole:string|null;unread:number}) {
  const initials=displayName.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]?.toUpperCase()).join("")||"LH";
  return <header className="topbar">
    <div className="topbar-search"><Search size={17}/><span>Search workspace</span><kbd>⌘ K</kbd></div>
    <div className="topbar-actions">
      <button className="icon-button" aria-label="Notifications">
        <Bell size={18}/>
        {unread>0&&<span className="notification-count">{unread>9?"9+":unread}</span>}
      </button>
      <RoleSwitcher roles={roles} active={activeRole}/>
      <div className="user-chip"><span className="avatar-fallback">{initials}</span><span className="user-chip-copy"><strong>{displayName}</strong><small>{activeRole||"member"}</small></span></div>
      <LogoutButton/>
    </div>
  </header>;
}
