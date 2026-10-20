"use client";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

export function RoleSwitcher({roles,active}:{roles:string[];active:string|null}){
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  if(roles.length<2)return <span className="role-badge">{active||roles[0]||"member"}</span>;
  async function change(e:React.ChangeEvent<HTMLSelectElement>){
    const role=e.target.value;
    setBusy(true);setError("");
    try{
      const {error}=await createClient().rpc("switch_role",{target_role:role});
      if(error)throw error;
      router.refresh();
    }catch{setError("Role could not be changed. Please try again.");}
    finally{setBusy(false);}
  }
  return <div><select className="role-select" value={active||roles[0]} onChange={change} aria-label="Active role" disabled={busy} aria-describedby={error?"role-switch-error":undefined}>
    {roles.map(r=><option key={r} value={r}>{r[0].toUpperCase()+r.slice(1)}</option>)}
  </select>{error&&<p id="role-switch-error" className="error" role="alert">{error}</p>}</div>;
}
