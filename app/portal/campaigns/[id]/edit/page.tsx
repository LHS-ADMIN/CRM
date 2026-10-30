import {notFound,redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {CampaignEditorPage,type EditableCampaign} from "@/components/campaign-editor-page";

export default async function EditCampaignPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!/^[0-9a-f-]{36}$/i.test(id))notFound();
 const db=await createClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user)redirect("/login");
 const {data:profile}=await db.from("profiles").select("active_role").eq("id",user.id).maybeSingle();
 const role=profile?.active_role;
 if(role!=="admin"&&role!=="manager")redirect("/portal/campaigns");
 const [{data:campaign},{data:teams}]=await Promise.all([
  db.from("campaigns")
   .select("id,created_by,title,description,start_at,end_at,audience_type,team_id,rules,metric,campaign_prizes(id,sort_order,place_label,prize_description)")
   .eq("id",id).maybeSingle(),
  db.from("teams").select("id,name").eq("active",true).order("name")
 ]);
 if(!campaign)notFound();
 if(role==="manager"&&campaign.created_by!==user.id)notFound();
 const existing=campaign as EditableCampaign;
 existing.campaign_prizes=[...(existing.campaign_prizes||[])].sort((a,b)=>(a.sort_order??0)-(b.sort_order??0));
 return <CampaignEditorPage userId={user.id} activeRole={role} teams={teams||[]} existing={existing}/>;
}
