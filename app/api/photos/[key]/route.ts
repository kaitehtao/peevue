import {bucket} from '@/lib/storage';
export async function GET(_request:Request,{params}:{params:Promise<{key:string}>}){
 const {key}=await params;if(!/^[0-9a-f-]{36}-[0-2]\.jpg$/.test(key))return new Response('Not found',{status:404});
 try{const object=await bucket().get(key);if(!object)return new Response('Not found',{status:404});return new Response(object.body,{headers:{'Content-Type':'image/jpeg','X-Content-Type-Options':'nosniff','Cache-Control':'private, max-age=3600'}})}catch{return new Response('Photo temporarily unavailable',{status:503})}
}
