import {failure,service} from '@/lib/supabase-server';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){try{
 const {id}=await params;if(!/^[0-9a-f-]{36}$/i.test(id))return new Response('Not found',{status:404});
 const db=service();const {data,error}=await db.from('member_profiles').select('avatar_key').eq('user_id',id).eq('is_public',true).maybeSingle();if(error)throw error;if(!data?.avatar_key)return new Response('Not found',{status:404});
 const {data:photo,error:photoError}=await db.storage.from('profile-photos').download(data.avatar_key);if(photoError)throw photoError;
 return new Response(photo,{headers:{'Content-Type':'image/jpeg','X-Content-Type-Options':'nosniff','Cache-Control':'no-store'}});
}catch(e){return failure(e);}}
