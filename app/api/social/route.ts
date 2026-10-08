import {z} from 'zod';
import {ApiError,boundedBody,failure,json,quota,sameOrigin,service,user} from '@/lib/supabase-server';
const schema=z.object({target:z.string().uuid(),action:z.enum(['follow','unfollow','block','unblock'])});
export async function GET(request:Request){try{const who=await user(request,true),db=service();const {data,error}=await db.from('member_blocks').select('blocked').eq('blocker',who!.id);if(error)throw error;const ids=data.map(r=>r.blocked);const profiles=ids.length?await db.from('member_profiles').select('user_id,display_name').in('user_id',ids):{data:[],error:null};if(profiles.error)throw profiles.error;const follows=await db.from("member_follows").select("followed").eq("follower",who!.id);if(follows.error)throw follows.error;const followIds=follows.data.map(r=>r.followed);const following=followIds.length?await db.from("member_profiles").select("user_id,display_name").eq("is_public",true).in("user_id",followIds):{data:[],error:null};if(following.error)throw following.error;return json({blocked:profiles.data,following:following.data});}catch(e){return failure(e);}}
export async function POST(request:Request){try{
 sameOrigin(request);const who=await user(request,true);await quota('social:'+who!.id,60,3600);const p=schema.parse(await(await boundedBody(request,4000)).json());if(p.target===who!.id)throw new ApiError(400,'Choose another member.');const db=service();
 const {data:own}=await db.from('member_profiles').select('user_id').eq('user_id',who!.id).maybeSingle();if(!own)throw new ApiError(400,'Save your profile first.');
 if(p.action==='follow'){
  const {data:target}=await db.from('member_profiles').select('user_id').eq('user_id',p.target).eq('is_public',true).maybeSingle();if(!target)throw new ApiError(404,'Member unavailable.');
  const {data:blocks,error}=await db.from('member_blocks').select('blocker').or(`and(blocker.eq.${who!.id},blocked.eq.${p.target}),and(blocker.eq.${p.target},blocked.eq.${who!.id})`);if(error)throw error;if(blocks.length)throw new ApiError(403,'Following unavailable.');
 }
 const result=p.action==='follow'?await db.from('member_follows').upsert({follower:who!.id,followed:p.target}):p.action==='unfollow'?await db.from('member_follows').delete().eq('follower',who!.id).eq('followed',p.target):p.action==='block'?await db.from('member_blocks').upsert({blocker:who!.id,blocked:p.target}):await db.from('member_blocks').delete().eq('blocker',who!.id).eq('blocked',p.target);
 if(result.error)throw result.error;
 if(p.action==='block'){const {error}=await db.from('member_follows').delete().or(`and(follower.eq.${who!.id},followed.eq.${p.target}),and(follower.eq.${p.target},followed.eq.${who!.id})`);if(error)throw error;}
 return json({ok:true});
}catch(e){return failure(e);}}
