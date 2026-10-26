"use client";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Copy, Edit3, Plus, ShieldCheck, UserCog, UserPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useDialog } from "@/components/use-dialog";

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
 const[addOpen,setAddOpen]=useState(false);
 const[editOpen,setEditOpen]=useState(false);
 const[editingUserId,setEditingUserId]=useState<string|null>(null);
 const credentialPanel=useRef<HTMLDivElement>(null);
 const inFlight=useRef(false);
 const[copied,setCopied]=useState(false);
 const addDialogRef=useDialog(addOpen,()=>setAddOpen(false));
 const editDialogRef=useDialog(editOpen,()=>setEditOpen(false));

 useEffect(()=>{if(credential){credentialPanel.current?.scrollIntoView({block:"center",behavior:"smooth"});credentialPanel.current?.focus({preventScroll:true});}},[credential]);

 const leadership=useMemo(()=>[
  {username:"mia_i_garcia",displayName:"Mia Garcia",roles:["admin","manager"],team:"Mia Garcia",creatorHandle:null as string|null},
  {username:"perfect.tenn7",displayName:"Tennille Branch",roles:["admin","manager"],team:"Tennille Branch",creatorHandle:null as string|null},
  {username:"bigzay292",displayName:"Big Zay",roles:["manager","creator"],team:"Big Zay",creatorHandle:"@bigzay292"},
  {username:"callmetash1",displayName:"NM Allen",roles:["manager","creator"],team:"NM Allen",creatorHandle:"@callmetash1"},
 ],[]);

 const remainingLeadership=leadership.filter(item=>item.username!=="mia_i_garcia"&&!accounts.some(a=>a.login_username.toLowerCase()===item.username));
 const editingUser=editingUserId?accounts.find(a=>a.id===editingUserId)||null:null;

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
   setMessage(data.temporaryPassword?"Password reset to the LHS temporary password. The user must change it at the next sign-in.":"Account updated.");
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
  const ok=await invoke({action:"create",username:String(f.get("username")),displayName:String(f.get("display_name")),roles,creatorId:creatorId||null,teamIds:f.getAll("teamIds")});
  if(ok){form.reset();setAddOpen(false);}
 }

 async function saveExisting(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  if(!editingUser)return;
  const f=new FormData(e.currentTarget);
  const roles=f.getAll("roles").map(String);
  const teamIds=f.getAll("teams").map(String);
  if(!roles.length){setMessage("Select at least one role.");return;}
  if(editingUser.id===currentUser){setMessage("You cannot change your own roles while signed into this Admin account. Another Admin must make that change.");return;}
  const rolesSaved=await invoke({action:"set_roles",userId:editingUser.id,roles});
  if(!rolesSaved)return;
  const teamsSaved=await invoke({action:"set_teams",userId:editingUser.id,teamIds});
  if(teamsSaved){setMessage("Roles and team access updated.");setEditOpen(false);setEditingUserId(null);router.refresh();}
 }

 function openEditor(userId:string){
  setMessage("");
  setEditingUserId(userId);
  setEditOpen(true);
 }

 async function provisionLeadership(){
  if(busy||!remainingLeadership.length)return;
  setBusy(true);setMessage("");setBulkCredentials([]);
  const client=createClient();
  const created:Credential[]=[];
  const errors:string[]=[];
  for(const person of remainingLeadership){
   const team=teams.find(t=>t.name===person.team);
   const creator=person.creatorHandle?creators.find(c=>c.creator_name.toLowerCase()===person.creatorHandle?.toLowerCase()):null;
   if(!team){errors.push(person.displayName+": team not found");continue;}
   if(person.roles.includes("creator")&&!creator){errors.push(person.displayName+": imported creator record not found");continue;}
   const {data,error}=await client.functions.invoke("admin-users",{body:{action:"create",username:person.username,displayName:person.displayName,roles:person.roles,creatorId:creator?.id||null,teamIds:[team.id]}});
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
  <div className="panel-head inner admin-users-head">
   <div><span className="section-kicker">Access management</span><h2>Users & role assignments</h2><p><strong>Edit existing users</strong> to change Creator, Manager, or Admin roles. Use <strong>Add new user</strong> only when the person does not already have an LHS login.</p></div>
   <button type="button" className="btn primary" onClick={()=>{setMessage("");setAddOpen(true)}}><UserPlus size={17}/> Add new user</button>
  </div>

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

  {message&&<p className={message.includes("updated")||message.includes("reset")?"success":"error"} role="status" aria-live="polite">{message}</p>}

  {bulkCredentials.length>0&&<div className="bulk-credential-panel" role="status" aria-live="polite">
    <h3>Temporary leadership logins</h3>
    <p>Each person must sign in with the username shown and change the temporary password immediately. Copy these now; the passwords are not stored for later display.</p>
    {bulkCredentials.map(item=><div className="bulk-credential-row" key={item.username}><strong>@{item.username}</strong><code>{item.password}</code><button type="button" className="btn" onClick={()=>navigator.clipboard.writeText("Username: "+item.username+"\nTemporary password: "+item.password)}><Copy size={15}/> Copy</button></div>)}
  </div>}

  {credential&&<div ref={credentialPanel} tabIndex={-1} className="credential-values temporary-login-panel" aria-label="Latest temporary login details">
    <h3>Latest temporary login</h3>
    <p>Username: <strong>{credential.username}</strong></p>
    <p>This resets the account to the standard LHS temporary password. The user must change it at the next sign-in.</p>
    <code aria-label="Temporary password">{credential.password}</code>
    <div className="head-actions"><button type="button" className="btn primary" onClick={copyPassword}>{copied?"Password copied":"Copy password"}</button><button type="button" className="btn" onClick={()=>{setCredential(null);setCopied(false);}}>Dismiss login details</button></div>
  </div>}

  <div className="admin-account-directory">
    <div className="account-directory-head"><div><span className="section-kicker">Existing users</span><h3>Select a user to change their role</h3><p>Current roles are shown below. Click <strong>Edit access</strong> to make changes.</p></div><span className="chip">{accounts.length} users</span></div>
    <div className="account-list access-card-grid">{accounts.map(a=><article className="account-access-card user-access-row" key={a.id}>
      <div className="user-access-identity"><strong>{a.display_name}</strong><span>@{a.login_username}</span></div>
      <div className="account-role-summary">{a.roles.map(role=><span className="chip" key={role}>{role}</span>)}<span className={a.active?"status-badge success":"status-badge"}>{a.active?"Active":"Inactive"}</span></div>
      <div className="user-access-actions">
       {a.id===currentUser?<span className="self-access-note">Your account · another Admin must change your roles</span>:<button type="button" className="btn primary" onClick={()=>openEditor(a.id)}><Edit3 size={16}/> Edit access</button>}
       <button className="btn" type="button" disabled={busy||a.id===currentUser} onClick={()=>invoke({action:"set_active",userId:a.id,active:!a.active})}>{a.active?"Deactivate":"Activate"}</button>
       <button className="btn" type="button" disabled={busy||a.id===currentUser||Boolean(credential)} onClick={()=>{if(window.confirm("Reset the password for "+a.login_username+" to LHS2026!? The user will be required to choose a new password at the next sign-in."))void invoke({action:"reset_password",userId:a.id});}}>Reset password</button>
      </div>
    </article>)}</div>
  </div>

  {editOpen&&editingUser&&<div className="modal-backdrop" onMouseDown={()=>setEditOpen(false)}><div ref={editDialogRef} role="dialog" aria-modal="true" aria-label={"Edit access for "+editingUser.display_name} tabIndex={-1} className="modal-card access-edit-modal" onMouseDown={e=>e.stopPropagation()}>
    <div className="modal-head"><div><span className="section-kicker">Existing user</span><h2>Edit access: {editingUser.display_name}</h2><p>@{editingUser.login_username} · Choose the roles this user should have, then assign Manager teams if applicable.</p></div><button type="button" className="icon-button" aria-label="Close dialog" onClick={()=>setEditOpen(false)}><X size={20}/></button></div>
    <form className="form-grid" onSubmit={saveExisting}>
      <fieldset className="role-picker"><legend>Assigned roles</legend>{["creator","manager","admin"].map(role=><label key={role}><input type="checkbox" name="roles" value={role} defaultChecked={editingUser.roles.includes(role)}/><span><strong>{role}</strong><small>{role==="creator"?"Creator portal access":role==="manager"?"Manage assigned creator team(s)":"Network-wide Administration access"}</small></span></label>)}</fieldset>
      <div className="field"><label>Manager teams <span className="muted">(only needed for Manager access)</span></label><select className="select access-team-select" multiple name="teams" defaultValue={editingUser.teamIds}>{teams.map(t=><option value={t.id} key={t.id}>{t.name}</option>)}</select><small className="field-help">Hold Ctrl on Windows or Command on Mac to select more than one team.</small></div>
      <div className="modal-actions"><button type="button" className="btn" onClick={()=>setEditOpen(false)}>Cancel</button><button type="submit" className="btn gold" disabled={busy}><CheckCircle2 size={16}/>{busy?"Saving…":"Save changes"}</button></div>
    </form>
  </div></div>}

  {addOpen&&<div className="modal-backdrop" onMouseDown={()=>setAddOpen(false)}><div ref={addDialogRef} role="dialog" aria-modal="true" aria-label="Add new user" tabIndex={-1} className="modal-card" onMouseDown={e=>e.stopPropagation()}>
    <div className="modal-head"><div><span className="section-kicker">New account only</span><h2>Add a new user</h2><p>Use this only for someone who does not already have an LHS login. To change an existing user’s role, close this window and choose <strong>Edit access</strong> beside their name.</p></div><button className="icon-button" aria-label="Close dialog" onClick={()=>setAddOpen(false)}><X size={20}/></button></div>
    <form onSubmit={create} className="form-grid">
      <div className="field"><label>Username</label><input className="input" name="username" required pattern="[a-zA-Z0-9][a-zA-Z0-9._-]{2,49}" placeholder="username"/></div>
      <div className="field"><label>Display name</label><input className="input" name="display_name" required placeholder="Name shown in LHS"/></div>
      <fieldset className="role-picker"><legend>Assign roles</legend>{["creator","manager","admin"].map(role=><label key={role}><input type="checkbox" name="roles" value={role}/><span><strong>{role}</strong><small>{role==="creator"?"Creator self-service access":role==="manager"?"Assigned-team management":"Network-wide administration"}</small></span></label>)}</fieldset>
      <div className="field"><label>Imported creator <span className="muted">(required only for Creator role)</span></label><select className="select" name="creatorId"><option value="">Not applicable</option>{creators.filter(c=>!c.auth_user_id).map(c=><option key={c.id} value={c.id}>{c.creator_name} · {c.agency_creator_id}</option>)}</select></div>
      <div className="field"><label>Manager teams</label><select className="select" multiple name="teamIds">{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
      <div className="modal-actions"><button type="button" className="btn" onClick={()=>setAddOpen(false)}>Cancel</button><button className="btn gold" disabled={busy}><Plus size={16}/>{busy?"Creating…":"Create new user"}</button></div>
    </form>
  </div></div>}
 </section>;
}
