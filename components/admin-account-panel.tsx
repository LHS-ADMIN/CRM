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
 const[creatorCredentials,setCreatorCredentials]=useState<Credential[]>([]);
 const[activationSearch,setActivationSearch]=useState("");
 const[activationProgress,setActivationProgress]=useState("");
 const[activationErrors,setActivationErrors]=useState<string[]>([]);
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
 const creatorsWithoutLogin=useMemo(()=>creators.filter(c=>!c.auth_user_id),[creators]);
 const filteredCreators=useMemo(()=>creatorsWithoutLogin.filter(c=>(
  c.creator_name.toLowerCase().includes(activationSearch.toLowerCase().trim())||
  c.agency_creator_id.toLowerCase().includes(activationSearch.toLowerCase().trim())
 )).slice(0,8),[creatorsWithoutLogin,activationSearch]);

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
   setMessage(data.temporaryPassword?"A new temporary password was generated. Copy it securely; the user must change it at their next sign-in.":"Account updated.");
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


 async function activateCreators(selectedIds:string[]){
  if(busy||inFlight.current||!selectedIds.length)return;
  if(creatorCredentials.length){
   setMessage("Download and securely deliver the current temporary passwords before starting another activation.");
   return;
  }
  inFlight.current=true;setBusy(true);
  setMessage("");setActivationErrors([]);
  const credentials:Credential[]=[];
  const problems:string[]=[];
  let processed=0;
  const client=createClient();
  try{
   for(let offset=0;offset<selectedIds.length;offset+=8){
    const batch=selectedIds.slice(offset,offset+8);
    setActivationProgress("Activating "+(processed+1)+"–"+Math.min(processed+batch.length,selectedIds.length)+" of "+selectedIds.length+" creators");
    const {data,error}=await client.functions.invoke("admin-users",{
     body:{action:"provision_creator_batch",creatorIds:batch}
    });
    if(error||data?.error){
     const detail=error?.context instanceof Response?await error.context.json().catch(()=>null):null;
     problems.push("Batch "+(Math.floor(offset/8)+1)+": "+(data?.error||detail?.error||"Unable to activate these creators"));
    }else{
     for(const item of data?.created||[]){
      if(item?.username&&item?.temporaryPassword){
       credentials.push({username:String(item.username),password:String(item.temporaryPassword)});
      }
     }
     for(const item of data?.skipped||[]){
      const creator=creators.find(c=>c.id===item.creatorId);
      problems.push((creator?.creator_name||"Creator")+": "+String(item.reason||"Account was not activated"));
     }
    }
    processed+=batch.length;
   }
   setCreatorCredentials(credentials);
   setActivationErrors(problems);
   setActivationProgress(credentials.length+" creator logins created. "+problems.length+" need review.");
   setMessage(credentials.length
    ?"New creators were activated. Download and privately distribute the unique temporary passwords below."
    :"No creator logins were created. Review the activation errors.");
   router.refresh();
  }catch(e){
   setCreatorCredentials(credentials);
   setActivationErrors([...problems,e instanceof Error?e.message:"Activation interrupted"]);
   setActivationProgress("Activation interrupted after "+processed+" of "+selectedIds.length+" creators.");
  }finally{
   inFlight.current=false;setBusy(false);
  }
 }

 function downloadCreatorCredentials(){
  if(!creatorCredentials.length)return;
  const quoted=(v:string)=>'"'+v.replace(/"/g,'""')+'"';
  const lines=[
   "TikTok username,Temporary password,Change on first login",
   ...creatorCredentials.map(c=>[quoted(c.username),quoted(c.password),"Yes"].join(","))
  ];
  const blob=new Blob(["\uFEFF"+lines.join("\r\n")],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download="LHS-private-creator-logins-"+new Date().toISOString().slice(0,10)+".csv";
  document.body.appendChild(a);a.click();a.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
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


  <div className="panel card-pad" style={{marginTop:20,border:"2px solid #b9d3e9",borderRadius:16}}>
   <div className="panel-head inner">
    <div>
     <span className="section-kicker">Creator onboarding</span>
     <h3>Activate missing creator logins</h3>
     <p style={{fontSize:"1rem",lineHeight:1.55}}>
      <strong>{creatorsWithoutLogin.length} active roster accounts need activation.</strong>
      Each account keeps its existing Creator ID and team. Each new login receives its own temporary password.
     </p>
    </div>
    <UserPlus size={23}/>
   </div>
   <p style={{fontSize:".9rem",lineHeight:1.55}}>
    Search for a creator to activate just that account, or activate all remaining creators.
    The passwords appear only after creation. Save and send them privately.
   </p>
   <div className="field" style={{maxWidth:520}}>
    <label htmlFor="activation-creator-search">Find creator by TikTok username or Creator ID</label>
    <input id="activation-creator-search" className="input" value={activationSearch}
     onChange={e=>setActivationSearch(e.target.value)}
     placeholder="Example: torsha969905" disabled={busy} />
   </div>
   {activationSearch.trim()&&<div style={{display:"grid",gap:8,maxWidth:600,marginTop:8}}>
    {filteredCreators.length===0&&<p>No unlinked active creator matched this search.</p>}
    {filteredCreators.map(c=><div key={c.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap",padding:"10px 12px",border:"1px solid #d9e3ed",borderRadius:10}}>
     <div><strong>{c.creator_name}</strong><small style={{display:"block"}}>Creator ID: {c.agency_creator_id}</small></div>
     <button className="btn primary" type="button" disabled={busy||creatorCredentials.length>0}
      onClick={()=>activateCreators([c.id])}>Activate login</button>
    </div>)}
   </div>}
   <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:14}}>
    <button className="btn gold" type="button" disabled={busy||!creatorsWithoutLogin.length||creatorCredentials.length>0}
     onClick={()=>{if(window.confirm("Activate "+creatorsWithoutLogin.length+" missing creator logins with unique temporary passwords? You must download and privately distribute the passwords after creation."))void activateCreators(creatorsWithoutLogin.map(c=>c.id));}}>
     {busy?"Activating…":"Activate all "+creatorsWithoutLogin.length+" missing creator logins"}
    </button>
   </div>
   {activationProgress&&<p role="status" aria-live="polite" style={{fontSize:"1rem",fontWeight:600,marginTop:12}}>{activationProgress}</p>}
   {creatorCredentials.length>0&&<div className="bulk-credential-panel" style={{marginTop:14}}>
    <h3>One-time creator login credentials</h3>
    <p style={{fontSize:".95rem"}}>Download this private file before leaving. These passwords are not stored for later viewing. Each creator must change their password immediately after signing in.</p>
    <button type="button" className="btn primary" onClick={downloadCreatorCredentials}>
     <Copy size={16}/> Download private login CSV ({creatorCredentials.length} accounts)
    </button>
    <div style={{marginTop:12}}>
     {creatorCredentials.slice(0,6).map(c=><div key={c.username} className="bulk-credential-row">
      <strong>@{c.username}</strong>
      <code>{c.password}</code>
      <button type="button" className="btn" onClick={()=>navigator.clipboard.writeText("Username: "+c.username+"\nTemporary password: "+c.password)}>Copy</button>
     </div>)}
     {creatorCredentials.length>6&&<p>Download the file to see the remaining {creatorCredentials.length-6} accounts.</p>}
    </div>
    <button className="btn" type="button" onClick={()=>{if(window.confirm("Have you saved the passwords? Dismissing permanently clears the one-time credentials from this screen.")){setCreatorCredentials([]);setActivationProgress("");setActivationErrors([]);router.refresh();}}}>
      I saved the passwords — clear this list
    </button>
   </div>}
   {activationErrors.length>0&&<details style={{marginTop:12}}>
    <summary><strong>{activationErrors.length} accounts need review</strong></summary>
    <ul>{activationErrors.map((e,i)=><li key={i}>{e}</li>)}</ul>
   </details>}
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
    <p>This is a unique temporary password. It must be given privately to the account holder, who must change it at first login.</p>
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
       <button className="btn" type="button" disabled={busy||a.id===currentUser||Boolean(credential)} onClick={()=>{if(window.confirm("Generate a new temporary password for "+a.login_username+"? Their previous password will stop working immediately."))void invoke({action:"reset_password",userId:a.id});}}>Reset password</button>
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
