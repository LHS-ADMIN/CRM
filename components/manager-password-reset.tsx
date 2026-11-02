"use client";
import { useMemo,useState } from "react";
import { KeyRound,Copy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
type Creator={userId:string;displayName:string;handle:string};
export function ManagerPasswordReset({creators}:{creators:Creator[]}){
 const[query,setQuery]=useState("");
 const[busy,setBusy]=useState(false);
 const[message,setMessage]=useState("");
 const[credential,setCredential]=useState<{name:string;password:string}|null>(null);
 const matches=useMemo(()=>creators.filter(x=>(x.displayName+" "+x.handle).toLowerCase().includes(query.toLowerCase())).slice(0,60),[creators,query]);
 async function reset(creator:Creator){
  if(!window.confirm("Generate a NEW temporary password for "+creator.displayName+"? Their current password will stop working."))return;
  setBusy(true);setMessage("");setCredential(null);
  const {data,error}=await createClient().functions.invoke("admin-users",{body:{action:"reset_password",userId:creator.userId}});
  setBusy(false);
  if(error||data?.error||!data?.temporaryPassword){setMessage("Reset failed. Confirm this creator belongs to your team.");return;}
  setCredential({name:creator.displayName,password:data.temporaryPassword});
 }
 return <section className="panel card-pad">
  <div className="field"><label htmlFor="manager-creator-search">Search creator name or TikTok username</label><input id="manager-creator-search" className="input" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find a creator…"/></div>
  {message&&<p className="error" role="alert">{message}</p>}
  {credential&&<div className="temporary-login-panel" role="status" tabIndex={-1}>
   <h2>Temporary password for {credential.name}</h2>
   <p>Share this privately. The creator must sign in and set their own password.</p>
   <strong style={{fontSize:"1.45rem",overflowWrap:"anywhere"}}>{credential.password}</strong>
   <button type="button" className="btn primary" onClick={()=>navigator.clipboard.writeText(credential.password)}><Copy size={16}/> Copy password</button>
  </div>}
  <div className="manager-password-list">{matches.map(creator=><div key={creator.userId} className="manager-password-row">
   <div><strong>{creator.displayName}</strong><small>{creator.handle}</small></div>
   <button type="button" className="btn" disabled={busy} onClick={()=>reset(creator)}><KeyRound size={16}/> Generate temporary password</button>
  </div>)}
  {!matches.length&&<p>No matching creators.</p>}</div>
 </section>;
}
