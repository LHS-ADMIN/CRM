import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {CampaignEditorPage} from "@/components/campaign-editor-page";

export default async function NewCampaignPage(){
 const db=await createClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user)redirect("/login");
 const {data:profile}=await db.from("profiles").select("active_role").eq("id",user.id).maybeSingle();
 const role=profile?.active_role;
 if(role!=="admin"&&role!=="manager")redirect("/portal/campaigns");
 const {data:teams}=await db.from("teams").select("id,name").eq("active",true).order("name");
 return <CampaignEditorPage userId={user.id} activeRole={role} teams={teams||[]}/>;
}
