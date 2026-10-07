"use client";
import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import { inVegas, type Venue } from "@/lib/community";

export function ReviewMap({venues,onSelect}:{venues:Venue[];onSelect:(venue:Venue)=>void}) {
 const container=useRef<HTMLDivElement>(null);
 const map=useRef<Leaflet.Map|null>(null);
 const library=useRef<typeof Leaflet|null>(null);
 const markers=useRef<Leaflet.LayerGroup|null>(null);
 const boundsKey=useRef("");
 const [ready,setReady]=useState(false),[error,setError]=useState("");
 const located=venues.filter(v=>v.latitude!==null && v.longitude!==null && inVegas(v.latitude,v.longitude));
 useEffect(()=>{
  let disposed=false;let observer:ResizeObserver|undefined;
  void import("leaflet").then(module=>{
   const L=module.default ?? module;
   if(disposed || !container.current)return;
   library.current=L;
   const instance=L.map(container.current,{scrollWheelZoom:false}).setView([36.14,-115.2],11);
   map.current=instance;
   L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(instance).on("tileerror",()=>{if(!disposed)setError("Map background is unavailable. You can still select toilet pins or use the listings below.");});
   markers.current=L.layerGroup().addTo(instance);
   observer=new ResizeObserver(()=>instance.invalidateSize());observer.observe(container.current);
   setReady(true);
  }).catch(error=>{console.error("Map initialization failed",error);if(!disposed)setError("The map could not load. Please refresh, or use the listings below.");});
  return ()=>{disposed=true;observer?.disconnect();map.current?.remove();map.current=null;markers.current=null;boundsKey.current="";};
 },[]);
 useEffect(()=>{
  const L=library.current,instance=map.current,layer=markers.current;
  if(!ready||!L||!instance||!layer)return;
  layer.clearLayers();
  const icon=L.icon({iconUrl:"/peevue-toilet-pin.png",iconSize:[38,46],iconAnchor:[19,46]});
  for(const venue of located){
   const tooltip=document.createElement("span");tooltip.textContent=`${venue.name} · ${venue.score.toFixed(1)}/5 · ${venue.access}`;
   L.marker([venue.latitude!,venue.longitude!],{icon,title:`View bathrooms at ${venue.name}`,alt:`View bathrooms at ${venue.name}`,keyboard:true}).bindTooltip(tooltip).on("click",()=>onSelect(venue)).addTo(layer);
  }
  const key=located.map(v=>`${v.id}:${v.latitude}:${v.longitude}`).sort().join("|");
  if(key!==boundsKey.current){
   if(located.length)instance.fitBounds(L.latLngBounds(located.map(v=>[v.latitude!,v.longitude!] as [number,number])),{padding:[40,40],maxZoom:15});
   else instance.setView([36.14,-115.2],11);
   boundsKey.current=key;
  }
 },[venues,ready,onSelect]);
 return <section className="review-map-section" aria-label="Map of reviewed bathrooms">
  <div className="section-heading"><h3>Bathrooms on the map</h3><span>{located.length} {located.length===1?"location":"locations"}</span></div>
  <p>Tap a toilet pin to see bathroom reviews, photos, and access details. Address pins show approximate property or plaza locations, not individual bathroom entrances.</p>
  <div ref={container} className="review-map" aria-label="Interactive Las Vegas bathroom map"/>
  {error && <p role="status">{error}</p>}
  {venues.length>located.length && <p className="photo-rule">{venues.length-located.length} {venues.length-located.length===1?"property needs an address pin":"properties need address pins"}. All matching properties are listed below.</p>}
  {!venues.length && <p>No reviewed bathrooms match these filters.</p>}
 </section>;
}
