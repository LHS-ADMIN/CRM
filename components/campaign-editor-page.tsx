"use client";
import {FormEvent,useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {createClient} from "@/lib/supabase/client";

export type EditableCampaign={
  id:string; created_by:string; title:string; description:string|null;
  start_at:string; end_at:string; audience_type:string; team_id:string|null;
  rules:string|null; metric:string|null;
  campaign_prizes:{id:string;sort_order:number|null;place_label:string|null;prize_description:string}[];
};
type Team={id:string;name:string};

function localDate(iso?:string){
 if(!iso)return "";
 const d=new Date(iso);
 return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);
}
export function CampaignEditorPage({userId,activeRole,teams,existing}:{
 userId:string;activeRole:"admin"|"manager";teams:Team[];existing?:EditableCampaign;
}){
 const router=useRouter();
 const [audience,setAudience]=useState(existing?.audience_type||(activeRole==="admin"?"network":"team"));
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [savedId,setSavedId]=useState<string|null>(null);

 async function save(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  if(busy)return;
  setBusy(true);setError("");
  const form=e.currentTarget;
  const f=new FormData(form);
  try{
   const scope=activeRole==="manager"?(existing?.audience_type==="targeted"?"targeted":"team"):audience;
   const team=scope==="team"?String(f.get("team_id")||""):null;
   if(scope==="team"&&!team)throw new Error("Choose a manager / team to continue.");
   const start=new Date(String(f.get("start_at")||""));
   const end=new Date(String(f.get("end_at")||""));
   if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||end<=start)throw new Error("The campaign end must be after its start.");
   const title=String(f.get("title")||"").trim();
   if(!title)throw new Error("Enter a campaign title.");
   const file=f.get("attachment");
   if(file instanceof File&&file.size>0&&
    (file.size>20*1024*1024||!["image/png","image/jpeg","image/webp","image/gif","application/pdf"].includes(file.type)))
    throw new Error("Choose a PNG, JPG, WebP, GIF or PDF smaller than 20 MB.");

   const db=createClient();
   const idBefore=existing?.id||savedId;
   const payload={
    title,description:String(f.get("description")||"").trim()||null,
    audience_type:scope,team_id:team||null,
    start_at:start.toISOString(),end_at:end.toISOString(),
    rules:String(f.get("rules")||"").trim()||null,
    metric:String(f.get("metric")||"").trim()||null,
    status:"active",active:true,created_by:existing?.created_by||userId,source_type:"crm"
   };
   const record=idBefore
    ?await db.from("campaigns").update(payload).eq("id",idBefore).select("id").single()
    :await db.from("campaigns").insert(payload).select("id").single();
   if(record.error||!record.data)throw new Error("The campaign could not be saved. Check your access or team selection.");
   const id=record.data.id;
   setSavedId(id);

   const {data:old,error:prizeReadError}=await db.from("campaign_prizes")
     .select("id,sort_order").eq("campaign_id",id).order("sort_order",{ascending:true});
   if(prizeReadError)throw new Error("Campaign saved, but prizes could not be loaded. Try saving again.");
   const prizes=String(f.get("prizes")||"").split("\n").map(p=>p.trim()).filter(Boolean);
   if(prizes.length){
    const {error:prizeError}=await db.from("campaign_prizes").upsert(
      prizes.map((prize,i)=>({
       ...(old?.[i]?.id?{id:old[i].id}:{}),
       campaign_id:id,sort_order:i+1,place_label:"Prize "+(i+1),prize_description:prize
      }))
    );
    if(prizeError)throw new Error("Campaign saved, but prizes did not save. Try saving again.");
   }
   const removed=(old||[]).slice(prizes.length).map(p=>p.id);
   if(removed.length){
    const {error:removeError}=await db.from("campaign_prizes").delete().in("id",removed);
    if(removeError)throw new Error("Campaign saved, but old prizes could not be removed.");
   }
   if(file instanceof File&&file.size>0){
    const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,"-").slice(-120);
    const path=userId+"/campaigns/"+id+"/"+crypto.randomUUID()+"-"+safeName;
    const uploaded=await db.storage.from("crm-uploads").upload(path,file,{contentType:file.type});
    if(uploaded.error)throw new Error("Campaign saved, but the file upload failed. Reopen Edit campaign to retry.");
    const attached=await db.from("attachments").insert({
      parent_type:"campaign",parent_id:id,bucket_id:"crm-uploads",object_path:path,
      file_name:file.name,mime_type:file.type,file_size:file.size,
      visibility:scope==="team"?"team":"all",team_id:team||null,uploaded_by:userId
    });
    if(attached.error){
      await db.storage.from("crm-uploads").remove([path]);
      throw new Error("Campaign saved, but the attachment could not be linked. Try again.");
    }
   }
   router.push("/portal/campaigns");
   router.refresh();
  }catch(err){
   setError(err instanceof Error?err.message:"Campaign could not be saved.");
   window.scrollTo({top:0,behavior:"smooth"});
  }finally{setBusy(false);}
 }
 const isNetwork=activeRole==="admin"&&audience==="network";
 const managerScope=activeRole==="manager"&&audience==="team";
 return <div className="campaign-editor-page">
  <header className="campaign-editor-header">
    <div className="campaign-editor-header-inner">
      <div><p>LHS · Campaign Manager</p><h1>{existing?"Edit campaign":"Create a campaign"}</h1></div>
      <Link href="/portal/campaigns" className="campaign-editor-back">← Back to campaigns</Link>
    </div>
  </header>
  <main className="campaign-editor-main">
    <p className="campaign-editor-intro">Fill in each section below. This is a normal page—scroll up or down without a popup covering the screen.</p>
    {error&&<div className="campaign-editor-error" role="alert">{error}</div>}
    <form className="campaign-editor-form" onSubmit={save} style={{marginTop:error?18:0}}>
      <section className="campaign-editor-section" aria-labelledby="editor-basics">
        <h2 id="editor-basics">1. Campaign details</h2><p>Give your campaign a name and tell creators what it's about.</p>
        <div className="campaign-editor-fields">
          <label className="campaign-editor-field">Campaign title
            <input name="title" required maxLength={160} placeholder="Example: November LIVE Challenge" defaultValue={existing?.title||""}/>
          </label>
          <label className="campaign-editor-field">Description
            <textarea name="description" rows={3} placeholder="What is the goal of the campaign?" defaultValue={existing?.description||""}/>
          </label>
        </div>
      </section>
      <section className="campaign-editor-section" aria-labelledby="editor-audience">
        <h2 id="editor-audience">2. Who can participate?</h2><p>Set the audience before selecting any team.</p>
        <div className="campaign-editor-fields">
          {activeRole==="admin"?<label className="campaign-editor-field">Audience
            <select name="audience_type" value={audience} onChange={e=>setAudience(e.target.value)}>
              <option value="network">Entire LHS agency — all teams</option>
              <option value="team">Specific manager / team</option>
              {existing?.audience_type==="targeted"&&<option value="targeted">Selected creators (existing audience)</option>}
            </select>
          </label>:<p className="campaign-editor-scope">Manager campaign — choose your team below.</p>}
          {isNetwork&&<div className="campaign-editor-scope">All active LHS creators can see this campaign. No manager selection is needed.</div>}
          {(audience==="team"||managerScope)&&<label className="campaign-editor-field">Manager / team
            <select name="team_id" required defaultValue={existing?.team_id||""}>
              <option value="">Choose a team</option>
              {teams.map(team=><option key={team.id} value={team.id}>{team.name}</option>)}
            </select>
          </label>}
        </div>
      </section>
      <section className="campaign-editor-section" aria-labelledby="editor-dates">
        <h2 id="editor-dates">3. Start and end</h2><p>Choose when the campaign will run.</p>
        <div className="campaign-editor-grid">
          <label className="campaign-editor-field">Start
            <input name="start_at" type="datetime-local" required defaultValue={localDate(existing?.start_at)}/>
          </label>
          <label className="campaign-editor-field">End
            <input name="end_at" type="datetime-local" required defaultValue={localDate(existing?.end_at)}/>
          </label>
        </div>
      </section>
      <section className="campaign-editor-section" aria-labelledby="editor-rules">
        <h2 id="editor-rules">4. Goals and rules</h2><p>Explain what counts and how creators qualify.</p>
        <div className="campaign-editor-fields">
          <label className="campaign-editor-field">Metric
            <input name="metric" placeholder="LIVE days, diamonds, or recruiting" defaultValue={existing?.metric||""}/>
          </label>
          <label className="campaign-editor-field">Campaign rules
            <textarea name="rules" rows={5} placeholder="Eligibility, requirements, scoring and dates" defaultValue={existing?.rules||""}/>
          </label>
        </div>
      </section>
      <section className="campaign-editor-section" aria-labelledby="editor-prizes">
        <h2 id="editor-prizes">5. Prizes</h2><p>List each prize on its own line. Leave blank if there are no prizes.</p>
        <label className="campaign-editor-field">Prizes
          <textarea name="prizes" rows={4} placeholder={"1st: Gift card\n2nd: Coaching session"} defaultValue={existing?.campaign_prizes?.map(p=>p.prize_description).join("\n")||""}/>
        </label>
      </section>
      <section className="campaign-editor-section" aria-labelledby="editor-media">
        <h2 id="editor-media">6. Flyer or PDF</h2><p>Optional: upload an image or PDF up to 20 MB.</p>
        <label className="campaign-editor-field">Attachment
          <input name="attachment" type="file" accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"/>
        </label>
        {existing&&<p style={{margin:"16px 0 0"}}>Previously uploaded attachments will remain saved.</p>}
      </section>
      <div className="campaign-editor-actions">
        <Link href="/portal/campaigns">Cancel</Link>
        <button type="submit" disabled={busy}>{busy?"Saving…":existing?"Save campaign changes":"Publish campaign"}</button>
      </div>
    </form>
  </main>
 </div>;
}
