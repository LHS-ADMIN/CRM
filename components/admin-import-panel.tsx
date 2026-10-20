"use client";
import { ChangeEvent, useState } from "react";
import { FileSpreadsheet, UploadCloud } from "lucide-react";
import { readSheet } from "read-excel-file/browser";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const endpoints={creators:"import-creators",metrics:"import-metrics",campaigns:"import-campaigns"} as const;

function rowsToObjects(rows:unknown[][]){
  if(rows.length<2)return [];
  const headers=rows[0].map((value,index)=>{
    const label=String(value??"").trim();
    return label||`Column ${index+1}`;
  });
  return rows.slice(1)
    .filter(row=>row.some(value=>value!==null&&value!==undefined&&String(value).trim()!==""))
    .map(row=>Object.fromEntries(headers.map((header,index)=>[header,row[index]??""])));
}

export function AdminImportPanel(){
  const router=useRouter();
  const [type,setType]=useState<keyof typeof endpoints>("metrics");
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState("");

  async function upload(e:ChangeEvent<HTMLInputElement>){
    const input=e.currentTarget;
    const file=input.files?.[0];
    if(!file)return;
    if(!file.name.toLowerCase().endsWith(".xlsx")||file.size>20*1024*1024){setMsg("Choose an .xlsx file no larger than 20 MB.");input.value="";return;}
    setBusy(true);setMsg("");
    try{
      const sheet=await readSheet(file);
      const rows=rowsToObjects(sheet as unknown[][]);
      if(!rows.length)throw new Error("The first worksheet has no data rows.");
      const body:Record<string,unknown>={rows,sourceFileName:file.name};
      if(type==="metrics")body.dataPeriod=new Date().toISOString().slice(0,7);
      const {data,error}=await createClient().functions.invoke(endpoints[type],{body});
      if(error){
        const detail=error.context instanceof Response?await error.context.json().catch(()=>null):null;
        throw new Error(detail?.error||"Import could not be completed. No replacement was committed.");
      }
      if(data?.error)throw new Error(data.error);
      setMsg(`Import completed: ${data.received??rows.length} received, ${data.matched??data.valid??data.synced??0} processed, ${data.unmatched??data.invalid??0} unmatched or invalid.${type==="creators"?` ${data.created??0} created, ${data.updated??0} updated.`:""}`);
    }catch(err){
      setMsg(err instanceof Error?err.message:"Import failed.");
    }finally{
      setBusy(false);input.value="";
      router.refresh();
    }
  }

  return <section className="panel card-pad">
    <div className="panel-head inner"><div><span className="section-kicker">Data intake</span><h2>Production imports</h2></div><FileSpreadsheet size={20}/></div>
    <p className="muted">Imports use secured backend functions and are recorded in the Import Log. Metrics replace the previous current snapshot.</p>
    <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) auto",gap:10,alignItems:"center"}}>
      <select aria-label="Import type" className="select" disabled={busy} value={type} onChange={e=>setType(e.target.value as keyof typeof endpoints)}>
        <option value="metrics">Creator metrics</option>
        <option value="creators">Manage Creators roster</option>
        <option value="campaigns">Campaign data</option>
      </select>
      <label className={busy?"btn disabled":"btn primary"}><UploadCloud size={16}/>{busy?"Importing…":"Choose .xlsx file"}<input hidden type="file" accept=".xlsx" onChange={upload} disabled={busy}/></label>
    </div>
    {msg&&<div className={msg.startsWith("Import completed")?"success":"error"} style={{marginTop:12}}>{msg}</div>}
  </section>;
}
