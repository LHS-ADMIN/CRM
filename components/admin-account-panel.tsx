"use client";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Copy, ShieldCheck, UserCog } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Account={id:string;login_username:string;display_name:string;active:boolean;roles:string[];teamIds:string[]};
type Team={id:string;name:string};
type Creator={id:string;agency_creator_id:string;creator_name:string;auth_user_id:string|null};
type Credential={username:string;password:string};

export function AdminAccountPanel({accounts,teams,creators,currentUser}:{accounts:Account[];teams:Team[];creators:Creator[];currentUser:string}){
 const router=useRouter();
 const[message,setMessage]=useState("");
 const[busy,setBusy]=useState(false);
 const[credential,setCredential]=useState<Credential|null>(null);
 const[bulkCredentials,setBulkCredentials]=useState<Credential[]>([]);
 const credentialPanel=useRef<HTMLDivElement>(null);
 const inFlight=useRef(false);
 const[copied,setCopied]=useState(false);

 useEffect(()=>{if(credential){credentialPanel.current?.scrollIntoView({block:"center",behavior:"smooth"});credentialPanel.current?.focus({preventScroll:true});}},[credential]);

 const leadership=useMemo(()=>[
  {username:"mia_i_garcia",displayName:"Mia Garcia",roles:["admin","manager"],team:"Mia Garcia",creatorHandle:null as string|null},
  {username:"perfect.tenn7",displayName:"Tennille Branch",roles:["admin","manager"],team:"Tennille Branch",creatorHandle:null as string|null},
  {username:"bigzay292",displayName:"Big Zay",roles:["manager","creator"],team:"Big Zay",creatorHandle:"@bigzay292"},
  {username:"callmetash1",displayName:"NM Allen",roles:["manager","creator"],team:"NM Allen",creatorHandle:"@callmetash1"},
 ],[]);

 const remainingLeadership=leadership.filter(item=>item.username!=="mia_i_garcia"&&!accounts.some(a=>a.login_username.toLowerCase()===item.username));

 async function copyPassword(){
  if(!credential)return;
  try{await navigator.clipboard.writeText(credential.password);setCopied(true);}
  catch{setMessage("Copy was unavailable. Select the displayed password and copy it manually.");}
 }

 async function invoke(body:Record<string,unknown>){
  if(inFlight.current)return false;
  if(body.action==="reset_password"&&credential){setMessage("Copy the displayed password before dismissing it. Issuing another one replaces it.");return false;}
  inFlight.current=true;setBusy(true);setMessage("");
  try{
   const{data,error}=await createClient().functions.invoke("admin-users",{body});
   if(error){
    const detail=error.context instanceof Response?await error.context.json().catch(()=>null):null;
    throw new Error(error.context instanceof Response&&error.context.status===401?"Your Admin session expired. Sign in again before updating this account.":detail?.error||"Account update failed. Please try again.");
   }
   if(data?.error)throw new Error(data.error);
   if(data.temporaryPassword){setCopied(false);setCredential({username:data.username||accounts.find(a=>a.id===body.userId)?.login_username||"",password:data.temporaryPassword});}
   setMessage(data.temporaryPassword?"New temporary password created. Copy it below before signing out.":"Account updated.");
   router.refresh();
   return true;
  }catch(e){
   setMessage(e instanceof Error?e.message:"Account update failed.");
   return false;
  }finally{
   inFlight.current=false;setBusy(false);
  }
 }

 async function create(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  const form=e.currentTarget;
  const f=new FormData(form);
  const roles=f.getAll("roles").map(String);
  const creatorId=String(f.get("creatorId")||"");
  if(!roles.length){setMessage("Select at least one role.");return;}
  if(roles.includes("creator")&&!creatorId){setMessage("Choose an imported creator when granting the Creator role, or use Add creator in the roster.");return;}
  if(await invoke({
    action:"create",
    username:String(f.get("username")),
    displayName:String(f.get("display_name")),
    roles,
    creatorId:creatorId||null,
    teamIds:f.getAll("teamIds")
  })) form.reset();
 }

 async function provisionLeadership(){
  if(busy||!remainingLeadership.length)return;
  setBusy(true);setMessage("");setBulkCredentials([]);
  const client=createClient();
  const created:Credential[]=[];
  const errors:string[]=[];

  for(const person of remainingLeadership){
   const team=teams.find(t=>t.name===person.team);
   const creator=person.creatorHandle
    ?creators.find(c=>c.creator_name.toLowerCase()===person.creatorHandle?.toLowerCase())
    :null;

   if(!team){errors.push(person.displayName+": team not found");continue;}
   if(person.roles.includes("creator")&&!creator){errors.push(person.displayName+": imported creator record not found");continue;}

   const {data,error}=await client.functions.invoke("admin-users",{body:{
    action:"create",
    username:person.username,
    displayName:person.displayName,
    roles:person.roles,
    creatorId:creator?.id||null,
    teamIds:[team.id]
   }});

   if(error||data?.error){
    const detail=error?.context instanceof Response?await error.context.json().catch(()=>null):null;
    errors.push(person.displayName+": "+(data?.error||detail?.error||error?.message||"could not be created"));
    continue;
   }

   if(data?.temporaryPassword)created.push({username:person.username,password:data.temporaryPassword});
  }

  setBulkCredentials(created);
  if(errors.length)setMessage("Leadership setup finished with issues: "+errors.join(" | "));
  else setMessage("Leadership accounts configured. Copy the temporary passwords below before leaving this page.");
  setBusy(false);router.refresh();
 }

 return <section className="panel card-pad">
  <h2>User access & roles</h2>
  <p>Use usernames for every account. Existing imported creators can receive login access here.</p>

  <div className="leadership-setup-card">
    <div className="leadership-setup-head">
      <div><span className="section-kicker">Leadership access</span><h3>Manager & Admin setup</h3><p>Mia already has an existing account and will never be recreated here. This tool only provisions missing leadership accounts.</p></div>
      <ShieldCheck size={24}/>
    </div>
    <div className="leadership-status-grid">
      {leadership.map(person=>{
        const acct=accounts.find(a=>a.login_username.toLowerCase()===person.username);
        return <div className="leadership-status" key={person.username}>
          <div className={acct?"status-orb ready":"status-orb"}>{acct?<CheckCircle2 size={18}/>:<UserCog size={18}/>}</div>
          <div><strong>{person.displayName}</strong><span>@{person.username}</span><small>{person.roles.join(" + ")} · {person.team}</small></div>
          <span className={acct?"status-badge success":"status-badge"}>{acct?"Configured":"Pending"}</span>
        </div>;
      })}
    </div>
    {remainingLeadership.length>0&&<button type="button" className="btn gold" onClick={provisionLeadership} disabled={busy}>{busy?"Configuring…":"Configure "+remainingLeadership.length+" remaining leadership account"+(remainingLeadership.length===1?"":"s")}</button>}
    {!remainingLeadership.length&&<div className="success">All four leadership accounts are configured.</div>}
  </div>

  {message&&<p role="status" aria-live="polite">{message}</p>}

  {bulkCredentials.length>0&&<div className="bulk-credential-panel" role="status" aria-live="polite">
    <h3>Temporary leadership logins</h3>
    <p>Each person must sign in with the username shown and change the temporary password immediately. Copy these now; the passwords are not stored for later display.</p>
    {bulkCredentials.map(item=><div className="bulk-credential-row" key={item.username}><strong>@{item.username}</strong><code>{item.password}</code><button type="button" className="btn" onClick={()=>navigator.clipboard.writeText("Username: "+item.username+"\nTemporary password: "+item.password+"\nLogin: https://crm-taupe-sigma.vercel.app")}><Copy size={15}/> Copy</button></div>)}
  </div>}

  {credential&&<div ref={credentialPanel} tabIndex={-1} className="credential-values temporary-login-panel" aria-label="Latest temporary login details">
    <h3>Latest temporary login</h3>
    <p>Username: <strong>{credential.username}</strong></p>
    <p>This replaces every earlier temporary password for this account. Copy this password before signing out.</p>
    <code aria-label="Temporary password">{credential.password}</code>
    <div className="head-actions"><button type="button" className="btn primary" onClick={copyPassword}>{copied?"Password copied":"Copy password"}</button><button type="button" className="btn" onClick={()=>{setCredential(null);setCopied(false);}}>Dismiss login details</button></div>
    <p>Sign in with the username above. You will then choose a new password.</p>
  </div>}

  <details>
   <summary>Create user access</summary>
   <form onSubmit={create} className="form-grid">
    <label>Username<input className="input" name="username" required pattern="[a-zA-Z0-9][a-zA-Z0-9._-]{2,49}"/></label>
    <label>Display name<input className="input" name="display_name" required/></label>
    <fieldset><legend>Roles</legend>{["creator","manager","admin"].map(role=><label key={role}><input type="checkbox" name="roles" value={role}/>{role}</label>)}</fieldset>
    <label>Imported creator<select className="select" name="creatorId"><option value="">Not applicable</option>{creators.filter(c=>!c.auth_user_id).map(c=><option key={c.id} value={c.id}>{c.creator_name} · {c.agency_creator_id}</option>)}</select></label>
    <label>Manager teams<select className="select" multiple name="teamIds">{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
    <div><button className="btn primary" disabled={busy}>Create account</button></div>
   </form>
  </details>

  <div className="account-list">{accounts.map(a=><details key={a.id}><summary>{a.display_name} · @{a.login_username} · {a.active?"Active":"Inactive"}</summary>
   <form className="form-grid" onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const roles=f.getAll("roles").map(String);if(!roles.length){setMessage("Select at least one role.");return;}if(await invoke({action:"set_roles",userId:a.id,roles}))await invoke({action:"set_teams",userId:a.id,teamIds:f.getAll("teams")});}}>
    <fieldset><legend>Roles for {a.login_username}</legend>{["creator","manager","admin"].map(role=><label key={role}><input type="checkbox" name="roles" value={role} defaultChecked={a.roles.includes(role)} disabled={a.id===currentUser}/>{role}</label>)}</fieldset>
    <label>Manager teams<select className="select" multiple name="teams" defaultValue={a.teamIds}>{teams.map(t=><option value={t.id} key={t.id}>{t.name}</option>)}</select></label>
    <div className="head-actions"><button className="btn primary" disabled={busy||a.id===currentUser}>Save permissions</button><button className="btn" type="button" disabled={busy||a.id===currentUser} onClick={()=>invoke({action:"set_active",userId:a.id,active:!a.active})}>{a.active?"Deactivate":"Activate"}</button><button className="btn" type="button" disabled={busy||a.id===currentUser||Boolean(credential)} onClick={()=>{if(window.confirm("Issue a new temporary password for "+a.login_username+"? This replaces every earlier temporary password for this account."))void invoke({action:"reset_password",userId:a.id});}}>Issue temporary password</button></div>
   </form>
  </details>)}</div>
 </section>;
}
