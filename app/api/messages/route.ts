import {z} from 'zod';
import {ApiError,boundedBody,failure,json,quota,sameOrigin,service,user} from '@/lib/supabase-server';
export async function GET(request:Request){try{
 const who=await user(request,true),db=service();const {data,error}=await db.from('member_messages').select('id,sender,recipient,body,created_at,read_at').or(`sender.eq.${who!.id},recipient.eq.${who!.id}`).order('created_at',{ascending:false}).limit(100);if(error)throw error;
 const ids=[...new Set(data.flatMap(m=>[m.sender,m.recipient]))];const profiles=ids.length?await db.from('member_profiles').select('user_id,display_name,is_public').in('user_id',ids):{data:[],error:null};if(profiles.error)throw profiles.error;
 return json({userId:who!.id,messages:data,profiles:profiles.data});
}catch(e){return failure(e);}}
const action=z.discriminatedUnion('action',[
 z.object({action:z.literal('send'),recipient:z.string().uuid(),body:z.string().trim().min(1).max(2000)}),
 z.object({action:z.literal('report'),id:z.string().uuid(),reason:z.string().trim().min(5).max(500)}),
 z.object({action:z.literal('read'),id:z.string().uuid()})]);
export async function POST(request:Request){try{
 sameOrigin(request);const who=await user(request,true),db=service();const p=action.parse(await(await boundedBody(request,12000)).json());
 if(p.action==='send'){
  if(!who!.email_confirmed_at)throw new ApiError(403,'Verify your account before messaging.');
  await quota('message:'+who!.id,30,3600);await quota('message-pair:'+who!.id+':'+p.recipient,10,3600);
  const {error}=await db.rpc('send_member_message',{p_sender:who!.id,p_recipient:p.recipient,p_body:p.body});if(error)throw new ApiError(400,'Messaging is unavailable. Both members must enable messages on their public profiles.');
 }else{
  const {data,error}=await db.from('member_messages').select('id,recipient').eq('id',p.id).eq('recipient',who!.id).maybeSingle();if(error)throw error;if(!data)throw new ApiError(404,'Message not found.');
  if(p.action==='read'){const {error}=await db.from('member_messages').update({read_at:new Date().toISOString()}).eq('id',p.id).eq('recipient',who!.id);if(error)throw error;}
  else{await quota('message-report:'+who!.id,20,3600);const {error}=await db.from('member_reports').upsert({reporter:who!.id,message_id:p.id,reason:p.reason},{onConflict:'reporter,message_id'});if(error)throw error;}
 }
 return json({ok:true});
}catch(e){return failure(e);}}
