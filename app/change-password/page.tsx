"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ChangePasswordPage(){
 const supabase=createClient(); const router=useRouter(); const [error,setError]=useState(""); const [busy,setBusy]=useState(false);
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setError("");const f=new FormData(e.currentTarget);
  const password=String(f.get("password")||"");const confirm=String(f.get("confirm")||"");
  if(password.length<10){setError("Use at least 10 characters.");setBusy(false);return;}
  if(password!==confirm){setError("Passwords do not match.");setBusy(false);return;}
  const {error:u}=await supabase.auth.updateUser({password});if(u){setError(u.message);setBusy(false);return;}
  const {error:r}=await supabase.rpc("finish_password_change");if(r){setError(r.message);setBusy(false);return;}
  router.replace("/portal");router.refresh();
 }
 return <main className="login-shell"><section className="login-card"><div className="eyebrow">Account security</div><div className="brand">Create a new password</div><p className="muted">Your temporary password cannot be used as your permanent password.</p>{error&&<div className="error">{error}</div>}<form onSubmit={submit}><div className="field"><label>New password</label><input className="input" type="password" name="password" required /></div><div className="field"><label>Confirm password</label><input className="input" type="password" name="confirm" required /></div><button className="btn primary" style={{width:"100%"}} disabled={busy}>{busy?"Updating…":"Save password"}</button></form></section></main>
}
