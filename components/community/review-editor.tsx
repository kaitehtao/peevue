"use client";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { todayInVegas, ratingLabels } from "@/lib/community";
import { compress } from "@/lib/compress-photo";
import { memberFetch } from "@/lib/supabase-browser";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type EditableReview = {id:string;updated_at:string;display_name:string;rating:number;body:string;visited:string;passcode:string;photo_keys:string[];photos:string[];status:string};
export function ReviewEditor({review,admin=false,onSaved}:{review:EditableReview;admin?:boolean;onSaved:()=>void}) {
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[preparing,setPreparing]=useState(false),[error,setError]=useState("");
 const [keep,setKeep]=useState(review.photo_keys),[files,setFiles]=useState<File[]>([]);
 const previews=useMemo(()=>files.map(f=>URL.createObjectURL(f)),[files]);
 useEffect(()=>()=>previews.forEach(URL.revokeObjectURL),[previews]);
 async function addPhotos(picked:File[]) {
  if(picked.length+files.length+keep.length>5){setError("Uncheck an existing photo first, or keep up to five photos total.");return;}
  setPreparing(true);setError("");try{const prepared=await Promise.all(picked.map(compress));setFiles(old=>[...old,...prepared]);}catch(e){setError((e as Error).message);}finally{setPreparing(false);}
 }
 async function save(e:FormEvent<HTMLFormElement>) {
  e.preventDefault();setBusy(true);setError("");
  const fields=new FormData(e.currentTarget),body=new FormData();
  body.set("edit",JSON.stringify({id:review.id,updatedAt:review.updated_at,name:fields.get("name"),rating:Number(fields.get("rating")),body:fields.get("body"),visited:fields.get("visited"),passcode:fields.get("passcode"),keepPhotos:keep}));
  files.forEach(f=>body.append("photos",f));
  try { const r=await memberFetch("/api/reviews/edit",{method:"POST",body});const d=await r.json() as {error?:string};if(!r.ok) throw new Error(d.error);setOpen(false);onSaved(); }
  catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 return <><button className="secondary" type="button" onClick={()=>{setKeep(review.photo_keys);setFiles([]);setError("");setOpen(true);}}>Edit review</button>
 <Dialog open={open} onOpenChange={v=>{if(!busy&&!preparing)setOpen(v);}}><DialogContent className="review-dialog" onInteractOutside={e=>e.preventDefault()}><DialogTitle>Edit review</DialogTitle><DialogDescription>{admin ? "Save corrections to the text, rating, visit date, passcode, and photos. The current publication status stays unchanged." : "Your changes return to admin review. An approved post is hidden until the updated version is approved."}</DialogDescription>
 <form className="review-form" onSubmit={save}>
 <label>Public display name<input name="name" required minLength={2} maxLength={50} defaultValue={review.display_name}/></label>
 <label>Cleanliness rating<select name="rating" defaultValue={review.rating}>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n}/5 · {ratingLabels[n]}</option>)}</select></label>
 <label>Date visited<input type="date" name="visited" required min="2000-01-01" max={todayInVegas()} defaultValue={review.visited}/></label>
 <label>Your review<textarea name="body" required minLength={10} maxLength={1500} rows={5} defaultValue={review.body}/></label>
 <label>Bathroom passcode (optional)<input name="passcode" maxLength={40} autoComplete="off" defaultValue={review.passcode}/></label>
 <fieldset><legend>Photos · up to 5 total</legend><div className="moderation-photos">{review.photo_keys.map((key,i)=><label key={key}><img src={review.photos[i]} alt={"Existing photo "+(i+1)}/><span><input type="checkbox" checked={keep.includes(key)} disabled={busy||preparing||(!keep.includes(key)&&keep.length+files.length>=5)} onChange={e=>setKeep(old=>e.target.checked?[...old,key]:old.filter(k=>k!==key))}/> Keep photo {i+1}</span></label>)}</div>
 <label>Choose photos<input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy||preparing||keep.length+files.length>=5} onChange={e=>{const picked=Array.from(e.target.files||[]);e.target.value="";void addPhotos(picked);}}/></label>
 <label>Take a photo<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={busy||preparing||keep.length+files.length>=5} onChange={e=>{const picked=Array.from(e.target.files||[]);e.target.value="";void addPhotos(picked);}}/></label>
 <p role="status">{keep.length+files.length} of 5 photos selected. Select multiple photos or take additional camera shots.</p>
 <div className="upload-previews">{previews.map((src,i)=><div key={src}><img src={src} alt={"New photo "+(i+1)}/><button type="button" aria-label={"Remove new photo "+(i+1)} onClick={()=>setFiles(old=>old.filter((_,j)=>j!==i))}>×</button></div>)}</div>
 <p className="photo-rule">Empty spaces only. No people or private information. Photo metadata is removed.</p></fieldset>
 <label className="consent"><input type="checkbox" required/>{admin ? "I checked the changes and photos for publication." : "These changes reflect my experience and may be published after review."}</label>
 {error&&<p role="alert" className="form-error">{error}</p>}
 <div className="account-actions"><button className="primary" disabled={busy||preparing}>{preparing?"Preparing photos…":busy?"Saving…":admin?"Save changes":"Save and submit changes"}</button><button type="button" className="secondary" disabled={busy||preparing} onClick={()=>setOpen(false)}>Cancel</button></div>
 </form></DialogContent></Dialog></>;
}
