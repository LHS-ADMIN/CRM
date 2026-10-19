"use client";
import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const supabase = createClient();
  const router = useRouter();
  const params = useSearchParams();
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError("");
    const form=new FormData(e.currentTarget);
    const username=String(form.get("username")||"").trim().toLowerCase();
    const password=String(form.get("password")||"");
    const email=`${username}@login.lhs-live.com`;
    const { error: signError }=await supabase.auth.signInWithPassword({email,password});
    if(signError){setError("The username or password is incorrect.");setBusy(false);return;}
    const { error: auditError }=await supabase.rpc("record_login_success");
    if(auditError){await supabase.auth.signOut();setError(auditError.message);setBusy(false);return;}
    const { data: profile,error: profileError }=await supabase.from("profiles").select("active,must_change_password").single();
    if(profileError||!profile?.active){await supabase.auth.signOut();setError("This LHS account is not active.");setBusy(false);return;}
    router.replace(profile.must_change_password?"/change-password":(params.get("next")||"/portal"));
    router.refresh();
  }

  return <main className="login-shell"><section className="login-card">
    <div className="eyebrow">Invitation-only access</div><div className="brand">LHS Creator Network</div>
    <p className="muted">Sign in with your permanent LHS username.</p>
    {error&&<div className="error">{error}</div>}
    <form onSubmit={submit}>
      <div className="field"><label>Username</label><input className="input" name="username" autoComplete="username" required /></div>
      <div className="field"><label>Password</label><input className="input" name="password" type="password" autoComplete="current-password" required /></div>
      <button className="btn primary" style={{width:"100%"}} disabled={busy}>{busy?"Signing in…":"Sign in"}</button>
    </form>
  </section></main>;
}

export default function LoginPage(){
  return <Suspense fallback={<main className="login-shell"><section className="login-card"><div className="brand">LHS Creator Network</div><p className="muted">Loading secure sign-in…</p></section></main>}><LoginForm/></Suspense>;
}
