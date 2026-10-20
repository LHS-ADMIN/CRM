"use client";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function RoleSwitcher({roles,active}:{roles:string[];active:string|null}){
  const router=useRouter();
  if(roles.length<2)return <span className="role-badge">{active||roles[0]||"member"}</span>;
  async function change(e:React.ChangeEvent<HTMLSelectElement>){
    const role=e.target.value;
    const {error}=await createClient().rpc("switch_role",{target_role:role});
    if(!error){router.refresh()}
  }
  return <select className="role-select" value={active||roles[0]} onChange={change} aria-label="Active role">
    {roles.map(r=><option key={r} value={r}>{r[0].toUpperCase()+r.slice(1)}</option>)}
  </select>;
}
