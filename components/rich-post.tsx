import type { ReactNode } from "react";
const colors:Record<string,string>={red:"#c83045",blue:"#236bc4",green:"#178250",purple:"#7d51c4",orange:"#b65a13"};
export function RichPost({text}:{text:string}){
 const pattern=/(\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__|\[color=(red|blue|green|purple|orange)\][\s\S]*?\[\/color\])/g;
 const chunks:ReactNode[]=[];let last=0;let match:RegExpExecArray|null;
 while((match=pattern.exec(text))!==null){
   if(match.index>last)chunks.push(text.slice(last,match.index));
   const token=match[0];
   if(token.startsWith("**"))chunks.push(<strong key={match.index}>{token.slice(2,-2)}</strong>);
   else if(token.startsWith("__"))chunks.push(<u key={match.index}>{token.slice(2,-2)}</u>);
   else if(token.startsWith("*"))chunks.push(<em key={match.index}>{token.slice(1,-1)}</em>);
   else {const color=match[2];chunks.push(<span key={match.index} style={{color:colors[color]}}>{token.slice(7+color.length,-8)}</span>);}
   last=pattern.lastIndex;
 }
 if(last<text.length)chunks.push(text.slice(last));
 return <p className="post-rich-text">{chunks}</p>;
}
