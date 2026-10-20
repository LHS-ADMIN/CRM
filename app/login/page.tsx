"use client";
import { FormEvent, Suspense, useState } from "react";
import { ShieldCheck, Sparkles, Swords, UsersRound } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm(){
  const supabase=createClient();const router=useRouter();const params=useSearchParams();
  const[error,setError]=useState("");const[busy,setBusy]=useState(false);

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setError("");
    const form=new FormData(e.currentTarget);
    const username=String(form.get("username")||"").trim().toLowerCase();
    const password=String(form.get("password")||"");
    const {error:signError}=await supabase.auth.signInWithPassword({email:`${username}@login.lhs-live.com`,password});
    if(signError){setError("The username or password is incorrect.");setBusy(false);return}
    const {error:auditError}=await supabase.rpc("record_login_success");
    if(auditError){await supabase.auth.signOut();setError(auditError.message);setBusy(false);return}
    const {data:profile,error:profileError}=await supabase.from("profiles").select("active,must_change_password").single();
    if(profileError||!profile?.active){await supabase.auth.signOut();setError("This LHS account is not active.");setBusy(false);return}
    router.replace(profile.must_change_password?"/change-password":(params.get("next")||"/portal"));router.refresh();
  }

  return <main className="login-shell">
    <section className="login-experience">
      <div className="login-story">
        <div className="login-story-brand"><span>LHS</span><div><strong>Creator Network</strong><small>Operations Command Center</small></div></div>
        <div className="login-story-copy"><span className="eyebrow light">Built for the way LHS operates</span><h1>Everything your creator network needs. One command center.</h1><p>Battle scheduling, campaigns, creator management, community, support, and leadership controls — backed by production-grade permissions.</p></div>
        <div className="login-feature-grid"><div><UsersRound size={19}/><span><strong>Creator Operations</strong><small>Teams, metrics and profiles</small></span></div><div><Swords size={19}/><span><strong>Battle Central</strong><small>Read-only league calendar</small></span></div><div><Sparkles size={19}/><span><strong>Campaign Hub</strong><small>Prizes and leaderboards</small></span></div><div><ShieldCheck size={19}/><span><strong>Role Security</strong><small>Creator, Manager, Admin</small></span></div></div>
      </div>
      <div className="login-card">
        <div className="login-mobile-brand">LHS Creator Network</div>
        <span className="eyebrow">Invitation-only access</span>
        <div className="brand">Welcome back.</div>
        <p className="muted">Use your permanent LHS username to enter the creator network portal.</p>
        {error&&<div className="error">{error}</div>}
        <form onSubmit={submit}>
          <div className="field"><label>Username</label><input className="input" name="username" autoComplete="username" required placeholder="your.username"/></div>
          <div className="field"><label>Password</label><input className="input" name="password" type="password" autoComplete="current-password" required placeholder="••••••••••"/></div>
          <button className="btn primary login-submit" disabled={busy}>{busy?"Signing in…":"Enter LHS Command Center"}</button>
        </form>
        <div className="login-security"><ShieldCheck size={14}/> Protected by Supabase Auth and row-level permissions.</div>
      </div>
    </section>
  </main>;
}

export default function LoginPage(){
  return <Suspense fallback={<main className="login-shell"><div className="login-card"><div className="brand">LHS Creator Network</div><p className="muted">Loading secure sign-in…</p></div></main>}><LoginForm/></Suspense>;
}
