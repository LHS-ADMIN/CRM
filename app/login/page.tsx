"use client";
import { FormEvent, Suspense, useState } from "react";
import { HeartPulse, ShieldCheck, Sparkles, Swords, UsersRound } from "lucide-react";
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

    const {data,error:loginError}=await supabase.functions.invoke("username-login",{body:{username,password}});
    if(loginError||data?.error||!data?.access_token||!data?.refresh_token){
      setError("The username or password is incorrect.");setBusy(false);return;
    }

    const {data:sessionData,error:sessionError}=await supabase.auth.setSession({
      access_token:data.access_token,
      refresh_token:data.refresh_token
    });
    const signedInUser=sessionData.user;
    if(sessionError||!signedInUser){setError("The username or password is incorrect.");setBusy(false);return}

    const {error:auditError}=await supabase.rpc("record_login_success");
    if(auditError){await supabase.auth.signOut();setError("Your account could not be opened. Please contact LHS support.");setBusy(false);return}

    const {data:profile,error:profileError}=await supabase.from("profiles").select("active,must_change_password").eq("id",signedInUser.id).single();
    if(profileError||!profile?.active){await supabase.auth.signOut();setError("This LHS account is not active.");setBusy(false);return}

    const next=params.get("next");
    const destination=next?.startsWith("/portal")&&!next.startsWith("//")?next:"/portal";
    router.replace(profile.must_change_password?"/change-password":destination);
    router.refresh();
  }

  return <main className="login-shell branded-login">
    <section className="login-experience">
      <div className="login-story">
        <div className="login-story-brand">
          <div className="login-logo-wrap"><img src="/lhs-logo.webp" alt="LHS logo"/></div>
          <div><strong>LHS Connect</strong><small>Life · Health · Strength Creator Network</small></div>
        </div>
        <div className="login-story-copy"><span className="eyebrow light">A community built to connect, plan, and grow</span><h1>Your LHS community. Together.</h1><p>Creators and leadership share one home for battles, campaigns, development, community conversations, and network support.</p></div>
        <div className="login-feature-grid"><div><UsersRound size={20}/><span><strong>Creator Operations</strong><small>Profiles, teams and access</small></span></div><div><Swords size={20}/><span><strong>Battle Central</strong><small>League schedule in one place</small></span></div><div><Sparkles size={20}/><span><strong>Campaign Hub</strong><small>Challenges, prizes and growth</small></span></div><div><HeartPulse size={20}/><span><strong>LHS Community</strong><small>Life. Health. Strength.</small></span></div></div>
      </div>
      <div className="login-card">
        <div className="login-mobile-brand"><img src="/lhs-logo.webp" alt="LHS"/><span>LHS Connect</span></div>
        <span className="eyebrow">Invitation-only access</span>
        <div className="brand">Welcome back.</div>
        <p className="muted">Sign in using your TikTok username without the @ symbol. No email address is needed.</p>
        {error&&<div className="error">{error}</div>}
        <form onSubmit={submit}>
          <div className="field"><label htmlFor="page-username">Username</label><input id="page-username" className="input" name="username" autoComplete="username" required placeholder="your.username"/></div>
          <div className="field"><label htmlFor="page-password">Password</label><input id="page-password" className="input" name="password" type="password" autoComplete="current-password" required placeholder="••••••••••"/></div>
          <button className="btn primary login-submit" disabled={busy}>{busy?"Signing in…":"Enter LHS Connect"}</button>
        </form>
        <div className="login-security"><ShieldCheck size={15}/> Protected by secure role-based access.</div>
      </div>
    </section>
  </main>;
}

export default function LoginPage(){
  return <Suspense fallback={<main className="login-shell branded-login"><div className="login-card"><div className="brand">LHS Connect</div><p className="muted">Loading secure sign-in…</p></div></main>}><LoginForm/></Suspense>;
}
