"use client";
export function YelpField({value,onChange}:{value:string;onChange:(v:string)=>void}) {
 return <label>Yelp business profile <small>(optional)</small><input type="url" maxLength={500} value={value} onChange={e=>onChange(e.target.value)} placeholder="https://www.yelp.com/biz/business-name"/><small className="photo-rule">Link to this property’s exact Yelp listing. Check the name and address. One link is shared by all bathrooms in the property.</small>{value.startsWith("https://www.yelp.com/biz/") && <a href={value} target="_blank" rel="noopener noreferrer">Check Yelp listing ↗</a>}</label>;
}
