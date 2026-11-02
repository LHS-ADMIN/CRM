"use client";
import { useState } from "react";
import { RichPost } from "@/components/rich-post";
export function ExpandableRichPost({text,maxLength=340}:{text:string;maxLength?:number}){
 const[expanded,setExpanded]=useState(false);
 const long=text.length>maxLength;
 const clipped=text.slice(0,maxLength).replace(/\s+\S*$/,"").trimEnd()+"…";
 return <div className="expandable-rich-post">
  {long&&!expanded?<p className="post-rich-text">{clipped}</p>:<RichPost text={text}/>}
  {long&&<button type="button" className="show-post-more" aria-expanded={expanded} onClick={()=>setExpanded(x=>!x)}>{expanded?"Show less":"Show more"}</button>}
 </div>;
}
