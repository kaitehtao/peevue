"use client";
import {useState} from 'react';
import {memberFetch} from '@/lib/supabase-browser';
export function MemberActions({id,messages}:{id:string;messages:boolean}){
 const [status,setStatus]=useState(''),[busy,setBusy]=useState(false);
 async function act(action:string){setBusy(true);try{const r=await memberFetch('/api/social',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({target:id,action})});const d=await r.json() as {error?:string};if(!r.ok)throw Error(d.error);setStatus(action==='follow'?'Following this member.':action==='unfollow'?'Unfollowed.':action==='block'?'Member blocked. Messages and follows are disabled.':'Member unblocked.');}catch(e){setStatus((e as Error).message+' Sign in through My account if needed.');}finally{setBusy(false);}}
 return <><div className="account-actions"><button className="primary" disabled={busy} onClick={()=>act('follow')}>Follow</button><button className="secondary" disabled={busy} onClick={()=>act('unfollow')}>Unfollow</button>{messages&&<a className="primary" href={'/inbox?to='+id}>Message</a>}<button className="secondary" disabled={busy} onClick={()=>act('block')}>Block member</button></div><p role="status">{status}</p></>;
}
