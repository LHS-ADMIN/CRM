"use client";
import { useEffect, useState } from "react";
import { CommunityComposer } from "@/components/community-composer";
import { createClient } from "@/lib/supabase/client";

export function CommunityComposerShell(){
  const [state,setState]=useState<{userId:string;activeRole:string;teams:{id:string;name:string}[]}|null>(null);
  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      const supabase=createClient();
      const {data:{user}}=await supabase.auth.getUser();
      if(!user||cancelled)return;
      const [{data:profile},{data:teams}]=await Promise.all([
        supabase.from("profiles").select("active_role").eq("id",user.id).single(),
        supabase.from("teams").select("id,name").eq("active",true).order("name")
      ]);
      if(!cancelled)setState({userId:user.id,activeRole:profile?.active_role||"creator",teams:teams||[]});
    })();
    return()=>{cancelled=true};
  },[]);
  return state?<CommunityComposer {...state}/>:null;
}
