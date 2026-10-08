import {admin,failure,json,service} from '@/lib/supabase-server';
export async function GET(request:Request){try{await admin(request);const {data,error}=await service().from('member_reports').select('id,reason,created_at,member_messages(body,sender,recipient)').order('created_at',{ascending:false}).limit(100);if(error)throw error;return json({reports:data});}catch(e){return failure(e);}}
