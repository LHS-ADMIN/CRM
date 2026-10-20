import {notFound} from "next/navigation";
import Link from "next/link";
import {createClient} from "@/lib/supabase/server";
import {CreatorEditForm} from "@/components/creator-edit-form";

export default async function CreatorPage({params}:{params:Promise<{id:string}>}){
 const{id}=await params;
 if(!/^[0-9a-f-]{36}$/i.test(id))notFound();
 const db=await createClient();
 const{data:{user}}=await db.auth.getUser();
 if(!user)notFound();
 const{data:profile}=await db.from("profiles").select("active_role").eq("id",user.id).single();
 const{data:creator}=await db.from("creators").select("id,agency_creator_id,display_name,creator_name,tiktok_handle,niche,bio,team_id,auth_user_id,active,status").eq("id",id).maybeSingle();
 if(!creator)notFound();
 const admin=profile?.active_role==="admin";
 const[{data:details},{data:legacy},{data:teams}]=await Promise.all([
   admin&&creator.auth_user_id?db.from("profile_details").select("real_name,email,phone,address,birthday,bio,niche").eq("user_id",creator.auth_user_id).maybeSingle():Promise.resolve({data:null}),
   admin?db.from("creator_private_contacts").select("email,phone,address").eq("creator_id",id).maybeSingle():Promise.resolve({data:null}),
   admin?db.from("teams").select("id,name").eq("active",true):Promise.resolve({data:[]})
 ]);
 return <>
   <Link className="btn" href="/portal/creators">Back to roster</Link>
   <div className="page-head"><div><h1>{creator.display_name||creator.creator_name}</h1><p>Agency Creator ID: <strong>{creator.agency_creator_id}</strong></p><p>{creator.tiktok_handle} · {creator.niche||details?.niche||"Niche not added"}</p></div><div className="head-actions"><span className={creator.active?"status-badge success":"status-badge"}>{creator.active?"Active":"Deactivated"}</span></div></div>
   <section className="panel card-pad">
     <h2>Creator profile</h2>
     <p>{creator.bio||details?.bio||"No bio added yet."}</p>
     {admin&&<><h2>Private personal information</h2><p className="muted">Visible only to the creator and active Admin users.</p><dl className="private-details-list"><dt>Real name</dt><dd>{details?.real_name||"Not added"}</dd><dt>Email</dt><dd>{details?.email||legacy?.email||"Not added"}</dd><dt>Phone</dt><dd>{details?.phone||legacy?.phone||"Not added"}</dd><dt>Mailing address</dt><dd>{details?.address||legacy?.address||"Not added"}</dd><dt>Birthday</dt><dd>{details?.birthday||"Not added"}</dd></dl><CreatorEditForm creator={creator} teams={teams||[]}/></>}
   </section>
 </>;
}
