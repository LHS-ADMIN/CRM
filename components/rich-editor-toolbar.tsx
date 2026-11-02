"use client";
import type { RefObject } from "react";
import { Bold, Italic, Underline, Type } from "lucide-react";
export function RichEditorToolbar({editorRef}:{editorRef:RefObject<HTMLTextAreaElement|null>}){
 function wrap(before:string,after:string){
  const el=editorRef.current;if(!el)return;
  const start=el.selectionStart,end=el.selectionEnd;
  const selected=el.value.slice(start,end)||"your text";
  el.setRangeText(before+selected+after,start,end,"select");
  el.focus();
 }
 return <details className="rich-format-disclosure"><summary aria-label="Show text formatting options"><Type size={18}/> Format text</summary><div className="rich-editor-toolbar" aria-label="Format your post">
  <button type="button" title="Bold" aria-label="Bold selected text" onClick={()=>wrap("**","**")}><Bold size={18}/></button>
  <button type="button" title="Italic" aria-label="Italic selected text" onClick={()=>wrap("*","*")}><Italic size={18}/></button>
  <button type="button" title="Underline" aria-label="Underline selected text" onClick={()=>wrap("__","__")}><Underline size={18}/></button>
  <select aria-label="Add text color" defaultValue="" onChange={e=>{if(e.target.value)wrap("[color="+e.target.value+"]","[/color]");e.target.value="";}}>
   <option value="">Text color</option><option value="red">Red</option><option value="blue">Blue</option><option value="green">Green</option><option value="purple">Purple</option><option value="orange">Orange</option>
  </select>
 </div></details>;
}
