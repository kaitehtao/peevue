import {env} from 'cloudflare:workers';
import {database,bucket} from '@/lib/storage';
import {venues} from '@/lib/venues';
const MAX=7*1024*1024;
const json=(error:string,status=400)=>Response.json({error},{status});
export async function GET(){try{
 const rows=await database().prepare('SELECT id,venue_id AS venueId,name,rating,body,visited,created_at AS createdAt,photos FROM reviews ORDER BY created_at DESC LIMIT 1000').all();
 return Response.json({contributionsEnabled:env.CONTRIBUTIONS_ENABLED === "true",reviews:rows.results.map(r=>({...r,photos:JSON.parse(String(r.photos))}))},{headers:{'Cache-Control':'no-store'}});
}catch(e){console.error(e);return json('Reviews could not be loaded. Please try again.',503)}}
export async function POST(request:Request){
 if(env.CONTRIBUTIONS_ENABLED !== "true")return json("Community submissions will open after account and moderation setup.",403);
 try{
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return json('Please submit your review from PEEVUE.',403);
 if(Number(request.headers.get('content-length')||0)>MAX)return json('Please keep your photos under 6 MB combined.',413);
 const reader=request.body?.getReader();if(!reader)return json('A review is required.');const chunks:Uint8Array[]=[];let size=0;
 while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>MAX){await reader.cancel();return json('Please keep your photos under 6 MB combined.',413)}chunks.push(value)}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
 const form=await new Request(request.url,{method:'POST',headers:{'Content-Type':request.headers.get('content-type')||''},body:bytes}).formData();
 const str=(k:string)=>typeof form.get(k)==='string'?String(form.get(k)).trim():'';
 const id=str('id'),venueId=str('venueId'),name=str('name'),body=str('body'),visited=str('visited'),rating=Number(str('rating'));
 if(!/^[0-9a-f-]{36}$/.test(id)||!venues.some(v=>v.id===venueId))return json('Choose a bathroom to review.');
 if(name.length<2||name.length>50||body.length<10||body.length>1500||!Number.isInteger(rating)||rating<1||rating>5)return json('Add your name, a 1–5 rating, and a review of 10–1,500 characters.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(visited)||!Number.isFinite(Date.parse(visited))||new Date(visited).toISOString().slice(0,10)!==visited||visited>new Date().toISOString().slice(0,10))return json('Choose a valid visit date that is not in the future.');
 const db=database();const old=await db.prepare('SELECT id FROM reviews WHERE id=?').bind(id).first();if(old)return Response.json({id},{status:200});
 const files=form.getAll('photos').filter((f):f is File=>f instanceof File&&f.size>0);if(files.length>3)return json('Choose up to 3 photos.');
 const images=[];for(const f of files){if(f.size>2*1024*1024)return json('Each photo must be smaller than 2 MB.');const buffer=await f.arrayBuffer();const b=new Uint8Array(buffer);if(f.type!=='image/jpeg'||b[0]!==255||b[1]!==216||b[2]!==255)return json('Please upload JPEG photos using the photo picker.');images.push(buffer)}
 const keys=images.map((_,i)=>id+'-'+i+'.jpg');for(let i=0;i<images.length;i++)await bucket().put(keys[i],images[i],{httpMetadata:{contentType:'image/jpeg'}});
 await db.prepare('INSERT INTO reviews (id,venue_id,name,rating,body,visited,created_at,photos) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(id,venueId,name,rating,body,visited,new Date().toISOString(),JSON.stringify(keys)).run();
 return Response.json({id},{status:201});
 }catch(e){console.error(e);return json('Your review could not be saved. Your draft is still here; please try again.',503)}
}
