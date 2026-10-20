"use client";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton(){
  const router=useRouter();
  async function logout(){await createClient().auth.signOut();router.replace("/login");router.refresh()}
  return <button className="icon-button" onClick={logout} title="Sign out" aria-label="Sign out"><LogOut size={18}/></button>;
}
