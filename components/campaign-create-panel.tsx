"use client";
import {FormEvent,useState} from "react";
import {useRouter} from "next/navigation";
import {createClient} from "@/lib/supabase/client";
import {useDialog} from "@/components/use-dialog";
type Campaign={id:string;created_by:string;title:string;description:string|null;start_at:string;end_at:string;audience_type:string;team_id:string|null;rules:string|null;metric:string|null;campaign_prizes:{id:string;place_label:string|null;prize_description:string}[]};
const localDate=(date?:string)=>{if(!date)return "";const d=new Date(date);return new Date(d.valueOf()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);};
export function CampaignCreatePanel({userId,activeRole,teams,existing}:{userId:string;activeRole:string;teams:{id:string;name:string}[];existing?:Campaign}){
 const router=useRouter();const[open,setOpen]=useState(false);const[busy,setBusy]=useState(false);const[msg,setMsg]=useState("");const[audience,setAudience]=useState(activeRole==="manager"?(existing?.audience_type==="targeted"?"targeted":"team"):(existing?.audience_type||"network"));const dialogRef=useDialog(open,()=>setOpen(false));
 if(!["manager","admin"].includes(activeRole))return null;
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();const form=e.currentTarget;const f=new FormData(form);setBusy(true);setMsg("");
  try{
   const db=createClient();const audience=activeRole==="manager"?(existing?.audience_type==="targeted"?"targeted":"team"):String(f.get("audience_type"));const team=audience==="team"?String(f.get("team_id")||""):null;if(audience==="team"&&!team)throw new Error("Choose a team.");
   const start=new Date(String(f.get("start_at")));const end=new Date(String(f.get("end_at")));if(!Number.isFinite(start.valueOf())||!Number.isFinite(end.valueOf())||end<=start)throw new Error("End must be later than start.");
   const file=f.get("attachment");
   if(file instanceof File&&file.size>0&&(!["image/png","image/jpeg","image/webp","image/gif","application/pdf"].includes(file.type)||file.size>20*1024*1024))throw new Error("Choose an image or PDF no larger than 20 MB.");
   const payload={title:String(f.get("title")).trim(),description:String(f.get("description")||"").trim()||null,audience_type:audience,team_id:team||null,start_at:start.toISOString(),end_at:end.toISOString(),rules:String(f.get("rules")||"").trim()||null,metric:String(f.get("metric")||"").trim()||null,status:"active",active:true,created_by:existing?.created_by||userId,source_type:"crm"};
   const result=existing?await db.from("campaigns").update(payload).eq("id",existing.id).select("id").single():await db.from("campaigns").insert(payload).select("id").single();if(result.error||!result.data)throw new Error("Campaign could not be saved. Check your team permissions.");
   const id=result.data.id;const prizes=String(f.get("prizes")||"").split("\n").map(x=>x.trim()).filter(Boolean);const old=existing?.campaign_prizes||[];
   if(prizes.length){const r=await db.from("campaign_prizes").upsert(prizes.map((p,i)=>({...old[i]?.id?{id:old[i].id}:{},campaign_id:id,sort_order:i+1,place_label:`Prize ${i+1}`,prize_description:p})));if(r.error)throw new Error("Campaign saved, but prizes could not be saved. Reopen Edit campaign to retry.");}
   const removed=old.slice(prizes.length).map(p=>p.id);if(removed.length){const r=await db.from("campaign_prizes").delete().in("id",removed);if(r.error)throw new Error("Campaign saved, but old prizes could not be removed.");}
   if(file instanceof File&&file.size>0){
    const path=`${userId}/campaigns/${id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,"-").slice(-120)}`;
    const uploaded=await db.storage.from("crm-uploads").upload(path,file,{contentType:file.type});
    if(uploaded.error)throw new Error("Campaign saved, but the attachment could not be uploaded. Reopen Edit campaign to retry.");
    const attached=await db.from("attachments").insert({parent_type:"campaign",parent_id:id,bucket_id:"crm-uploads",object_path:path,file_name:file.name,mime_type:file.type,file_size:file.size,visibility:audience==="team"?"team":"all",team_id:team||null,uploaded_by:userId});
    if(attached.error){await db.storage.from("crm-uploads").remove([path]);throw new Error("Campaign saved, but the attachment could not be linked. Reopen Edit campaign to retry.");}
   }
   setMsg("Campaign saved.");const attachmentInput=form.elements.namedItem("attachment");if(attachmentInput instanceof HTMLInputElement)attachmentInput.value="";router.refresh();if(!existing)form.reset();
  }catch(e){setMsg(e instanceof Error?e.message:"Campaign could not be saved.");router.refresh();}finally{setBusy(false);}
 }

 const sectionStyle={background:"#fff",border:"1px solid #dce4ee",borderRadius:20,padding:"clamp(20px, 3vw, 32px)",boxShadow:"0 8px 28px rgba(9,27,47,.06)"};
 const labelStyle={display:"grid",gap:9,fontSize:17,fontWeight:750,color:"#183049"};
 const fieldStyle={fontSize:17,minHeight:51,borderRadius:12,border:"1px solid #bac8d9",width:"100%",padding:"13px 14px",color:"#132a43",background:"#fff"};
 const rowStyle={display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(min(100%, 275px), 1fr))",gap:20};
 const sectionHeading={fontSize:23,lineHeight:1.25,fontWeight:850,letterSpacing:"-.02em",margin:"0 0 8px",color:"#142741"};
 const sectionDescription={fontSize:16,color:"#52657b",lineHeight:1.5,margin:"0 0 22px"};
 const audienceIsNetwork=activeRole==="admin"&&audience==="network";
 return <>
  <button className="btn primary" type="button" onClick={()=>{setMsg("");setOpen(true);}}>{existing?"Edit campaign":"New campaign"}</button>
  {open&&<div style={{position:"fixed",inset:0,zIndex:1000,background:"#f3f6fb",overflowY:"auto",overscrollBehavior:"contain",WebkitOverflowScrolling:"touch"}}>
   <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={existing?"Edit campaign":"Create campaign"} tabIndex={-1} style={{minHeight:"100dvh",outline:"none"}}>
    <div style={{position:"sticky",top:0,zIndex:5,background:"#0b1b30",color:"#fff",borderBottom:"3px solid #d6ad5c",boxShadow:"0 6px 24px rgba(4,17,33,.2)"}}>
     <div style={{maxWidth:1040,margin:"0 auto",padding:"14px clamp(16px, 4vw, 32px)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:18,flexWrap:"wrap"}}>
      <div><div style={{fontSize:12,letterSpacing:".12em",fontWeight:850,color:"#e6bf70",textTransform:"uppercase"}}>LHS Campaign Manager</div><h1 style={{fontSize:"clamp(22px, 3vw, 30px)",lineHeight:1.2,margin:"5px 0 0",color:"#fff"}}>{existing?"Edit campaign":"Create a campaign"}</h1></div>
      <button type="button" onClick={()=>setOpen(false)} style={{fontSize:16,fontWeight:800,minHeight:48,border:"1px solid #7b8aa0",borderRadius:12,background:"#fff",color:"#172a44",padding:"10px 21px",cursor:"pointer"}} aria-label="Close campaign editor">Close editor</button>
     </div>
    </div>
    <form onSubmit={submit} id={"lhs-campaign-form-"+(existing?.id||"new")} style={{maxWidth:1040,margin:"0 auto",padding:"28px clamp(16px, 4vw, 32px) 38px",display:"grid",gap:24}}>
      <div style={{color:"#405a77",fontSize:17,lineHeight:1.55}}>Complete the sections below. The entire editor is one easy-to-scroll page, with no small popup or nested scrolling.</div>
      {msg&&<div role="status" style={{background:msg==="Campaign saved."?"#ecfff3":"#fff1f1",border:"1px solid "+(msg==="Campaign saved."?"#6faf82":"#e5a4a4"),color:msg==="Campaign saved."?"#14542c":"#8b2424",padding:"16px 18px",fontWeight:750,borderRadius:12,fontSize:17}}>{msg}</div>}
      <section style={sectionStyle} aria-labelledby={"lhs-campaign-basics-"+(existing?.id||"new")}>
       <h2 id={"lhs-campaign-basics-"+(existing?.id||"new")} style={sectionHeading}>01 / Campaign details</h2>
       <p style={sectionDescription}>Give the campaign a clear name and explain what creators will be doing.</p>
       <div style={{display:"grid",gap:20}}>
        <label style={labelStyle}>Campaign title <span style={{color:"#63758b",fontSize:14,fontWeight:500}}>Required</span><input style={fieldStyle} name="title" required maxLength={160} placeholder="Example: November LIVE Challenge" defaultValue={existing?.title}/></label>
        <label style={labelStyle}>Description <textarea style={{...fieldStyle,minHeight:120,resize:"vertical"}} name="description" rows={4} placeholder="Describe the goal and how creators can participate." defaultValue={existing?.description||""}/></label>
       </div>
      </section>
      <section style={sectionStyle} aria-labelledby={"lhs-campaign-audience-"+(existing?.id||"new")}>
       <h2 id={"lhs-campaign-audience-"+(existing?.id||"new")} style={sectionHeading}>02 / Who can participate?</h2>
       <p style={sectionDescription}>Choose whether all LHS creators or only one manager's team can see this campaign.</p>
       {activeRole==="admin"?<div style={{display:"grid",gap:14}}>
        <label style={labelStyle}>Campaign audience
         <select style={fieldStyle} name="audience_type" value={audience} onChange={e=>setAudience(e.target.value)}>
          <option value="network">Entire LHS agency — all teams</option>
          <option value="team">Specific manager / team</option>
          {existing?.audience_type==="targeted"&&<option value="targeted">Selected creators (existing audience)</option>}
         </select>
        </label>
        {audienceIsNetwork&&<div role="status" style={{background:"#edf7f5",border:"1px solid #a7d1cb",borderRadius:12,padding:"16px 18px",color:"#165348",fontSize:16,fontWeight:700}}>Entire agency selected. All active LHS creators and managers will be able to view this campaign. No team selection is needed.</div>}
       </div>:<div style={{background:"#f3f7ff",border:"1px solid #b5c8e6",borderRadius:12,padding:"15px 18px",fontSize:16,fontWeight:700,color:"#173958"}}>Manager campaign — choose the team you manage below.</div>}
       {audience==="team"&&<label style={{...labelStyle,marginTop:20}}>Manager / team
        <select style={fieldStyle} name="team_id" required defaultValue={existing?.team_id||""}>
         <option value="">Choose a team</option>
         {teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
       </label>}
      </section>
      <section style={sectionStyle} aria-labelledby={"lhs-campaign-dates-"+(existing?.id||"new")}>
       <h2 id={"lhs-campaign-dates-"+(existing?.id||"new")} style={sectionHeading}>03 / Dates and times</h2>
       <p style={sectionDescription}>Set the opening and closing date for the campaign.</p>
       <div style={rowStyle}>
        <label style={labelStyle}>Campaign starts <input style={fieldStyle} name="start_at" type="datetime-local" required defaultValue={localDate(existing?.start_at)}/></label>
        <label style={labelStyle}>Campaign ends <input style={fieldStyle} name="end_at" type="datetime-local" required defaultValue={localDate(existing?.end_at)}/></label>
       </div>
      </section>
      <section style={sectionStyle} aria-labelledby={"lhs-campaign-rules-"+(existing?.id||"new")}>
       <h2 id={"lhs-campaign-rules-"+(existing?.id||"new")} style={sectionHeading}>04 / Goals and rules</h2>
       <p style={sectionDescription}>Make it easy for creators to understand what counts and how to qualify.</p>
       <div style={{display:"grid",gap:20}}>
        <label style={labelStyle}>What will be measured? <input style={fieldStyle} name="metric" placeholder="Example: LIVE days, diamonds, recruiting" defaultValue={existing?.metric||""}/></label>
        <label style={labelStyle}>Campaign rules <textarea style={{...fieldStyle,minHeight:170,resize:"vertical"}} name="rules" rows={6} placeholder="List the eligibility requirements, dates, and any special instructions." defaultValue={existing?.rules||""}/></label>
       </div>
      </section>
      <section style={sectionStyle} aria-labelledby={"lhs-campaign-prizes-"+(existing?.id||"new")}>
       <h2 id={"lhs-campaign-prizes-"+(existing?.id||"new")} style={sectionHeading}>05 / Prizes</h2>
       <p style={sectionDescription}>Enter one prize per line. You can leave this section empty if there are no prizes.</p>
       <label style={labelStyle}>Prizes <textarea style={{...fieldStyle,minHeight:145,resize:"vertical"}} name="prizes" rows={5} placeholder={"1st place: $100\n2nd place: $50\n3rd place: Gift card"} defaultValue={existing?.campaign_prizes.map(p=>p.prize_description).join("\n")}/></label>
      </section>
      <section style={sectionStyle} aria-labelledby={"lhs-campaign-media-"+(existing?.id||"new")}>
       <h2 id={"lhs-campaign-media-"+(existing?.id||"new")} style={sectionHeading}>06 / Flyer or attachment</h2>
       <p style={sectionDescription}>Optional: attach a campaign flyer, photo, or PDF. Maximum file size is 20 MB.</p>
       <label style={labelStyle}>Upload image or PDF <input style={{...fieldStyle,padding:"13px"}} type="file" name="attachment" accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"/></label>
       {existing&&<p style={{fontSize:15,color:"#52657b",margin:"14px 0 0"}}>Existing campaign attachments will remain saved. New uploads are added to them.</p>}
      </section>
      <div style={{position:"sticky",bottom:0,zIndex:4,display:"flex",justifyContent:"flex-end",alignItems:"center",gap:14,flexWrap:"wrap",background:"rgba(255,255,255,.98)",border:"1px solid #d3dce8",borderRadius:16,boxShadow:"0 -8px 30px rgba(15,37,67,.12)",padding:"14px clamp(15px, 3vw, 24px)",paddingBottom:"max(14px, env(safe-area-inset-bottom))"}}>
       <button type="button" onClick={()=>setOpen(false)} style={{fontSize:17,minHeight:52,padding:"12px 24px",border:"1px solid #b8c7d6",borderRadius:12,background:"#fff",color:"#18324b",fontWeight:800,cursor:"pointer"}}>Cancel</button>
       <button className="btn gold" disabled={busy} style={{fontSize:17,minHeight:52,padding:"12px 26px",fontWeight:850,borderRadius:12}}>{busy?"Saving campaign…":existing?"Save changes":"Publish campaign"}</button>
      </div>
    </form>
   </div>
  </div>}
 </>;
}
