"use client";
import { bathroomTypes, type BathroomInput } from "@/lib/community";
export function BathroomFields({value,onChange}:{value:BathroomInput;onChange:(v:BathroomInput)=>void}) {
 return <fieldset><legend>Bathroom within this property</legend><label>Floor or location<input required minLength={2} maxLength={120} value={value.location} placeholder="e.g. Lobby, beside reception" onChange={e=>onChange({...value,location:e.target.value})}/></label><label>Bathroom type<select value={value.gender} onChange={e=>onChange({...value,gender:e.target.value as BathroomInput["gender"]})}>{bathroomTypes.map(t=><option key={t}>{t}</option>)}</select></label></fieldset>;
}
