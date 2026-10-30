import Link from "next/link";
type Campaign={id:string};

export function CampaignCreatePanel({activeRole,existing}:{
 userId:string;
 activeRole:string;
 teams:{id:string;name:string}[];
 existing?:Campaign;
}){
 if(activeRole!=="admin"&&activeRole!=="manager")return null;
 const href=existing?"/portal/campaigns/"+existing.id+"/edit":"/portal/campaigns/new";
 return <Link className="btn primary" href={href}>{existing?"Edit campaign":"New campaign"}</Link>;
}
