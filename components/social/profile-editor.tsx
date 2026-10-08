"use client";
import {useEffect,useState,type FormEvent} from 'react';
import {memberFetch} from '@/lib/supabase-browser';
import {compress} from '@/lib/compress-photo';
export function ProfileEditor(){
 type Profile={display_name:string;bio:string;is_public:boolean;allow_messages:boolean;share_email:boolean;remove_photo:boolean};
 const [profile,setProfile]=useState({display_name:'',bio:'',is_public:false,allow_messages:false,share_email:false,remove_photo:false});
 const [following,setFollowing]=useState<Array<{user_id:string;display_name:string}>>([]);
 const [id,setId]=useState(''),[avatar,setAvatar]=useState<string|null>(null),[photo,setPhoto]=useState<File|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{void memberFetch('/api/profile').then(async r=>{const d=await r.json() as {error?:string;userId:string;profile:Profile|null;avatarUrl:string|null};if(!r.ok)throw Error(d.error);setId(d.userId);if(d.profile)setProfile({...d.profile,remove_photo:false});setAvatar(d.avatarUrl);void memberFetch('/api/social').then(async r=>{const d=await r.json() as {following?:Array<{user_id:string;display_name:string}>};setFollowing(d.following||[]);});}).catch(e=>setMessage(e.message));},[]);
 async function save(e:FormEvent){e.preventDefault();setBusy(true);setMessage('');try{const body=new FormData();body.set('profile',JSON.stringify(profile));if(photo)body.set('photo',photo);const r=await memberFetch('/api/profile',{method:'POST',body});const d=await r.json() as {error?:string};if(!r.ok)throw Error(d.error);setMessage('Social profile saved.');}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
 return <section className="account-box"><h2>Your community profile</h2><form className="review-form" onSubmit={save}>
 {avatar&&!profile.remove_photo&&<img className="member-avatar" src={avatar} alt="Your profile photo"/>}
 <label>Profile photo<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={async e=>{const file=e.target.files?.[0];if(!file)return;setBusy(true);try{setPhoto(await compress(file));setProfile(p=>({...p,remove_photo:false}));setMessage('New photo selected. Save your profile to publish it.');}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}}/></label>
 <label className="consent"><input type="checkbox" checked={profile.remove_photo} onChange={e=>{setProfile({...profile,remove_photo:e.target.checked});setPhoto(null);}}/>Remove profile photo</label>
 <label>Community display name<input required minLength={2} maxLength={50} value={profile.display_name} onChange={e=>setProfile({...profile,display_name:e.target.value})}/></label>
 <label>About you<textarea maxLength={500} value={profile.bio} onChange={e=>setProfile({...profile,bio:e.target.value})}/></label>
 <label className="consent"><input type="checkbox" checked={profile.is_public} onChange={e=>setProfile({...profile,is_public:e.target.checked,allow_messages:e.target.checked&&profile.allow_messages,share_email:e.target.checked&&profile.share_email})}/>Publish my profile and link my approved reviews</label>
 <label className="consent"><input type="checkbox" disabled={!profile.is_public} checked={profile.allow_messages} onChange={e=>setProfile({...profile,allow_messages:e.target.checked})}/>Allow private messages from signed-in members</label>
 <label className="consent"><input type="checkbox" disabled={!profile.is_public} checked={profile.share_email} onChange={e=>setProfile({...profile,share_email:e.target.checked})}/>Show my verified account email publicly as a contact link</label>
 <p className="photo-rule">Email sharing is optional. Anyone can see and copy your email if you enable it. Private messages stay within PEEVUE; administrators can review messages you report.</p>
 <button className="primary" disabled={busy}>{busy?'Saving…':'Save community profile'}</button><p role="status">{message}</p>
 </form><div className="account-actions">{id&&profile.is_public&&<a className="inline-link" href={'/members/'+id}>View my public profile</a>}<a className="inline-link" href="/members">Find members</a><a className="inline-link" href="/inbox">Messages</a></div><h3>Following</h3>{following.length?following.map(p=><p key={p.user_id}><a className="inline-link" href={"/members/"+p.user_id}>{p.display_name}</a></p>):<p>You’re not following anyone yet.</p>}</section>;
}
