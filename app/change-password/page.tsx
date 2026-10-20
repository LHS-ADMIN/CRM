"use client";
import { FormEvent, useState } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ChangePasswordPage(){
 const supabase=createClient();const router=useRouter();const[error,setError]=useState("");const[busy,setBusy]=useState(false);
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setError("");
  const f=new FormData(e.currentTarget);const password=String(f.get("password")||"");const confirm=String(f.get("confirm")||"");
  if(password.length<10){setError("Use at least 10 characters.");setBusy(false);return}
  if(password!==confirm){setError("Passwords do not match.");setBusy(false);return}
  const {error:u}=await supabase.auth.updateUser({password});if(u){setError(u.message);setBusy(false);return}
  const {error:r}=await supabase.rpc("finish_password_change");if(r){setError(r.message);setBusy(false);return}
  router.replace("/portal");router.refresh();
 }
 return <main className="login-shell"><section className="login-card password-card"><div className="password-icon"><KeyRound size={24}/></div><span className="eyebrow">Account security</span><div className="brand">Create your permanent password.</div><p className="muted">Your first sign-in requires a password only you know. Use at least 10 characters.</p>{error&&<div className="error">{error}</div>}<form onSubmit={submit}><div className="field"><label htmlFor="page-password">New password</label><input id="page-password" className="input" type="password" name="password" autoComplete="new-password" required/></div><div className="field"><label htmlFor="page-confirm">Confirm password</label><input id="page-confirm" className="input" type="password" name="confirm" autoComplete="new-password" required/></div><button className="btn primary login-submit" disabled={busy}>{busy?"Updating…":"Secure my account"}</button></form><div className="login-security"><ShieldCheck size={14}/> Your password is handled by Supabase Auth and is not stored in the CRM tables.</div></section></main>
}
