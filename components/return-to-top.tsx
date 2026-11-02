"use client";
import { useEffect,useState } from "react";
import { ArrowUp } from "lucide-react";
export function ReturnToTop(){
 const[visible,setVisible]=useState(false);
 useEffect(()=>{const check=()=>setVisible(window.scrollY>350);check();window.addEventListener("scroll",check,{passive:true});return()=>window.removeEventListener("scroll",check)},[]);
 if(!visible)return null;
 return <button type="button" className="return-top" onClick={()=>window.scrollTo({top:0,behavior:"smooth"})}><ArrowUp size={19}/><span>Back to top</span></button>;
}
