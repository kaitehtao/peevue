import { z } from "zod";
import { ApiError,boundedBody,failure,json,sameOrigin,service,user,quota } from "@/lib/supabase-server";
import { sanitizeJpeg } from "@/lib/photo";
const schema=z.object({display_name:z.string().trim().min(2).max(50),bio:z.string().trim().max(500),is_public:z.boolean(),allow_messages:z.boolean(),share_email:z.boolean(),remove_photo:z.boolean().default(false)});
export async function GET(request:Request){try{
 const who=await user(request,true),db=service();
 const {data,error}=await db.from('member_profiles').select('*').eq('user_id',who!.id).maybeSingle();if(error)throw error;
 let avatarUrl=null;if(data?.avatar_key){const result=await db.storage.from('profile-photos').createSignedUrl(data.avatar_key,300);avatarUrl=result.data?.signedUrl;}
 return json({profile:data,avatarUrl,userId:who!.id});
}catch(e){return failure(e);}}
export async function POST(request:Request){let uploaded:string|null=null;let saved=false;try{
 sameOrigin(request);const who=await user(request,true);await quota('profile:'+who!.id,20,3600);
 const form=await(await boundedBody(request,3*1024*1024)).formData();const p=schema.parse(JSON.parse(String(form.get('profile'))));
 if(p.share_email&&(!p.is_public||!who!.email_confirmed_at||!who!.email))throw new ApiError(400,'A public profile and verified account email are required to show an email contact link.');
 const db=service();const {data:old,error:oldError}=await db.from('member_profiles').select('avatar_key').eq('user_id',who!.id).maybeSingle();if(oldError)throw oldError;
 let avatar=old?.avatar_key||null;if(p.remove_photo)avatar=null;
 const photo=form.get('photo');if(photo){if(!(photo instanceof File)||photo.type!=='image/jpeg')throw new ApiError(400,'Choose a JPEG profile photo.');const bytes=sanitizeJpeg(new Uint8Array(await photo.arrayBuffer()));uploaded=crypto.randomUUID()+'.jpg';const {error}=await db.storage.from('profile-photos').upload(uploaded,bytes,{contentType:'image/jpeg'});if(error)throw error;avatar=uploaded;}
 const {error}=await db.from('member_profiles').upsert({user_id:who!.id,display_name:p.display_name,bio:p.bio,is_public:p.is_public,allow_messages:p.is_public&&p.allow_messages,share_email:p.is_public&&p.share_email,contact_email:p.share_email?who!.email:null,avatar_key:avatar,updated_at:new Date().toISOString()});if(error)throw error;saved=true;
 if(old?.avatar_key&&old.avatar_key!==avatar)await db.storage.from('profile-photos').remove([old.avatar_key]);
 return json({ok:true});
}catch(e){if(uploaded&&!saved)await service().storage.from('profile-photos').remove([uploaded]);return failure(e);}}
