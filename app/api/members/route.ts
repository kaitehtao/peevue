import {failure,json,service} from '@/lib/supabase-server';
export async function GET(){try{const {data,error}=await service().from('member_profiles').select('user_id,display_name,allow_messages').eq('is_public',true).order('display_name').limit(100);if(error)throw error;return json({members:data});}catch(e){return failure(e);}}
