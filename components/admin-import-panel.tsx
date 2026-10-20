"use client";
import { ChangeEvent, useState } from "react";
import { FileSpreadsheet, UploadCloud } from "lucide-react";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";

const endpoints={creators:"import-creators",metrics:"import-metrics",campaigns:"import-campaigns"} as const;

export function AdminImportPanel(){
  const [type,setType]=useState<keyof typeof endpoints>("metrics");
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState("");

  async function upload(e:ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0];
    if(!file)return;
    setBusy(true);setMsg("");
    try{
      const buffer=await file.arrayBuffer();
      const workbook=XLSX.read(buffer,{type:"array",cellDates:true});
      const sheet=workbook.Sheets[workbook.SheetNames[0]];
      const rows=XLSX.utils.sheet_to_json<Record<string,unknown>>(sheet,{defval:""});
      if(!rows.length)throw new Error("The first worksheet has no data rows.");
      const body:Record<string,unknown>={rows,sourceFileName:file.name};
      if(type==="metrics")body.dataPeriod=new Date().toISOString().slice(0,7);
      const {data,error}=await createClient().functions.invoke(endpoints[type],{body});
      if(error)throw error;
      if(data?.error)throw new Error(data.error);
      setMsg(`Import completed: ${data.matched??data.valid??data.synced??0} processed, ${data.unmatched??data.invalid??0} unmatched or invalid.`);
    }catch(err){
      setMsg(err instanceof Error?err.message:"Import failed.");
    }finally{
      setBusy(false);e.target.value="";
    }
  }

  return <section className="panel card-pad">
    <div className="panel-head inner"><div><span className="section-kicker">Data intake</span><h2>Production imports</h2></div><FileSpreadsheet size={20}/></div>
    <p className="muted">Imports use secured backend functions and are recorded in the Import Log. Metrics replace the previous current snapshot.</p>
    <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) auto",gap:10,alignItems:"center"}}>
      <select className="select" value={type} onChange={e=>setType(e.target.value as keyof typeof endpoints)}>
        <option value="metrics">Creator metrics</option>
        <option value="creators">Manage Creators roster</option>
        <option value="campaigns">Campaign data</option>
      </select>
      <label className={busy?"btn disabled":"btn primary"}><UploadCloud size={16}/>{busy?"Importing…":"Choose spreadsheet"}<input hidden type="file" accept=".xlsx,.xls,.csv" onChange={upload} disabled={busy}/></label>
    </div>
    {msg&&<div className={msg.startsWith("Import completed")?"success":"error"} style={{marginTop:12}}>{msg}</div>}
  </section>;
}
