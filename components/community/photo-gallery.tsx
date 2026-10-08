"use client";
import { useState } from "react";
export function PhotoGallery({photos,label}:{photos:string[];label:string}) {
 const [selected,setSelected]=useState(0);
 if(!photos.length)return null;
 const index=Math.min(selected,photos.length-1);
 const move=(step:number)=>setSelected((index+step+photos.length)%photos.length);
 return <section className="photo-gallery" aria-label={label+" photo gallery"}>
  <img className="gallery-main" src={photos[index]} alt={`${label} — photo ${index+1} of ${photos.length}`}/>
  <div className="gallery-controls">
   <button type="button" className="secondary" aria-label="Previous photo" disabled={photos.length<2} onClick={()=>move(-1)}>‹ Previous</button>
   <span aria-live="polite">{index+1} / {photos.length}</span>
   <button type="button" className="secondary" aria-label="Next photo" disabled={photos.length<2} onClick={()=>move(1)}>Next ›</button>
  </div>
  {photos.length>1 && <div className="gallery-thumbnails">{photos.map((src,i)=><button type="button" key={src+":"+i} aria-label={`Show photo ${i+1}`} aria-pressed={index===i} onClick={()=>setSelected(i)}><img loading="lazy" src={src} alt=""/></button>)}</div>}
 </section>;
}
