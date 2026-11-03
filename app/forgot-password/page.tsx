"use client";
import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { KeyRound, ShieldCheck, LockKeyhole } from "lucide-react";

function RecoveryContent(){
 const params=useSearchParams();
 const locked=params.get("reason")==="locked";
 const[username,setUsername]=useState("");
 return <main className="login-shell branded-login"><section className="login-card password-card">
  <div className="password-icon">{locked?<LockKeyhole size={24}/>:<KeyRound size={24}/>}</div>
  <span className="eyebrow">{locked?"Sign-in protection":"Account recovery"}</span>
  <div className="brand">{locked?"Your account is locked.":"Forgot your password?"}</div>
  {locked
    ?<div className="error" role="alert">The CRM rejected three sign-in attempts and locked the account for security. This does not mean you forgot your password. Even a correct password cannot open this account until your LHS manager resets access.</div>
    :<p>Enter your LHS/TikTok username below. You can ask your manager for help if you cannot sign in. A one-word Hint alone cannot reset access.</p>}
  <div className="field"><label htmlFor="forgot-username">Username (no @ symbol)</label>
   <input id="forgot-username" className="input" value={username} onChange={e=>setUsername(e.target.value)} placeholder="your.username" autoComplete="username"/>
  </div>
  {locked
    ?<p className="muted">You may have signed in successfully earlier. Later attempts using an old saved password, a typo, or another device can still trigger the three-attempt lock. The lock does not mean your profile or data was deleted.</p>
    :<p className="muted">If you saved a private Hint word, it remains protected. We cannot reveal it or allow it to reset your password without additional identity verification.</p>}
  <div className="panel card-pad">
   <h2>{locked?"How to restore your access":"Request a temporary password"}</h2>
   <p>Contact your LHS manager and provide your username{username?" ("+username+")":""}. Ask them to open <strong>Password Help</strong> in their Manager or Admin dashboard and generate a new, unique temporary password.</p>
   <p>The manager will share that password privately. Sign in with it and create your own new password. The old password will no longer work.</p>
  </div>
  <Link className="btn primary login-submit" href="/login">Return to sign in</Link>
  <div className="login-security"><ShieldCheck size={14}/> Managers cannot see your old password or protected Hint.</div>
 </section></main>;
}
export default function ForgotPasswordPage(){
 return <Suspense fallback={<main className="login-shell branded-login"><section className="login-card password-card"><p>Loading account help…</p></section></main>}><RecoveryContent/></Suspense>;
}
