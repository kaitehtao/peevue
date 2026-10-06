import { service } from "@/lib/supabase-server";
export async function publicDirectory() {
 const db=service();
 const {data:reviews,error}=await db.from("community_reviews").select("id,venue_id,bathroom_id,display_name,rating,body,visited,updated_at,photo_keys").eq("status","approved").order("updated_at",{ascending:false}).limit(1000);
 if(error) throw error;
 const ids=[...new Set(reviews.map(r=>r.venue_id).filter(Boolean))];
 if(!ids.length) return {reviews,venues:[],bathrooms:[]};
 const [{data:venues,error:ve},{data:bathrooms,error:be}]=await Promise.all([db.from("venues").select("id,name,address,area,type,access,yelp_url").in("id",ids),db.from("bathrooms").select("id,venue_id,location,gender").in("venue_id",ids)]);
 if(ve||be) throw ve||be;
 return {reviews,venues:venues!,bathrooms:bathrooms!.filter(b=>reviews.some(r=>r.bathroom_id===b.id))};
}
