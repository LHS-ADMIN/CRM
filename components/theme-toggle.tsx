"use client";
import { useEffect,useState } from "react";
import { Moon, Sun } from "lucide-react";
export function ThemeToggle(){
 const[dark,setDark]=useState(false);
 useEffect(()=>{const saved=localStorage.getItem("lhs-theme");const on=saved==="dark"||(saved===null&&window.matchMedia("(prefers-color-scheme: dark)").matches);setDark(on);document.documentElement.dataset.theme=on?"dark":"light";},[]);
 function toggle(){const next=!dark;setDark(next);document.documentElement.dataset.theme=next?"dark":"light";localStorage.setItem("lhs-theme",next?"dark":"light");}
 return <button className="theme-toggle" type="button" onClick={toggle} aria-label={dark?"Switch to light mode":"Switch to dark mode"} title={dark?"Light mode":"Dark mode"}>{dark?<Sun size={20}/>:<Moon size={20}/>}</button>;
}
