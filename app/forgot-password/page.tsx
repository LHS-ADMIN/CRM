"use client";
import Link from "next/link";
import { useState } from "react";
import { KeyRound,ShieldCheck } from "lucide-react";
export default function ForgotPasswordPage(){
 const[username,setUsername]=useState("");
 return <main className="login-shell branded-login"><section className="login-card password-card">
  <div className="password-icon"><KeyRound size={24}/></div>
  <span className="eyebrow">Account recovery</span><div className="brand">Forgot your password?</div>
  <p>Enter your LHS/TikTok username below. For security, a one-word hint cannot independently reset access.</p>
  <div className="field"><label htmlFor="forgot-username">Username (no @ symbol)</label><input id="forgot-username" className="input" value={username} onChange={e=>setUsername(e.target.value)} placeholder="your.username" autoComplete="username"/></div>
  <div className="field"><label htmlFor="forgot-hint">Your private Hint word</label><input id="forgot-hint" className="input" type="password" autoComplete="off" placeholder="The word saved in your Profile"/><small>Hints are stored securely. A hint alone does not verify who is using this page.</small></div>
  <div className="panel card-pad">
   <h2>Request a temporary password</h2>
   <p>Contact your LHS manager and provide your username{username?" ("+username+")":""}. They can generate a unique temporary password in <strong>Password Help</strong> inside the CRM.</p>
   <p>You will be required to create a permanent password at your next sign-in.</p>
  </div>
  <Link className="btn primary login-submit" href="/login">Return to sign in</Link>
  <div className="login-security"><ShieldCheck size={14}/> We never send your password or your Hint word to managers.</div>
 </section></main>;
}
