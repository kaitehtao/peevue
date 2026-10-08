// Geocoders receive only the property address, never review or account details.
export type AddressPin = {latitude:number;longitude:number};
export function streetAddress(address:string) {
 const start=address.search(/\b\d{1,6}\b/);
 if(start<0)return address;
 const street=address.slice(start).replace(/^(\d+)\s*,\s*/,"$1 ").split(/,|\s+(?:North Las Vegas|Las Vegas|Henderson)\b/i)[0];
 const city=/\bNorth Las Vegas\b/i.test(address)?"North Las Vegas":/\bHenderson\b/i.test(address)?"Henderson":"Las Vegas";
 const zip=address.match(/\b89\d{3}\b/)?.[0] || "";
 return `${street}, ${city}, NV ${zip}`.trim();
}
function validPin(latitude:unknown,longitude:unknown):AddressPin|null {
 if(latitude==null||longitude==null)return null;
 const lat=Number(latitude),lng=Number(longitude);
 return Number.isFinite(lat)&&Number.isFinite(lng)&&lat>=35.8&&lat<=36.5&&lng>=-115.6&&lng<=-114.8?{latitude:lat,longitude:lng}:null;
}
export async function resolveAddressPin(address:string,request:typeof fetch=fetch,beforeOsm:()=>Promise<void>=async()=>{}):Promise<AddressPin|null> {
 const normalized=streetAddress(address);
 const census=new URL("https://geocoding.geo.census.gov/geocoder/locations/onelineaddress");
 census.search=new URLSearchParams({address:normalized,benchmark:"Public_AR_Current",format:"json"}).toString();
 try {
  const r=await request(census,{signal:AbortSignal.timeout(7000)});
  if(r.ok){const d=await r.json() as {result?:{addressMatches?:Array<{coordinates?:{x:unknown;y:unknown}}>}};for(const match of d.result?.addressMatches || []){const pin=validPin(match.coordinates?.y,match.coordinates?.x);if(pin)return pin;}}
 }catch{/* A second provider can still resolve this address. */}
 try {
  await beforeOsm();
  const osm=new URL("https://nominatim.openstreetmap.org/search");
  osm.search=new URLSearchParams({q:normalized,format:"jsonv2",addressdetails:"1",countrycodes:"us",viewbox:"-115.6,36.5,-114.8,35.8",bounded:"1",limit:"3"}).toString();
  const r=await request(osm,{headers:{"User-Agent":"PEEVUE/1.0 (https://peevue.com; bathroom address lookup)"},signal:AbortSignal.timeout(7000)});
  if(r.ok){const results=await r.json() as Array<{lat:unknown;lon:unknown;address?:{house_number?:string}}>;const house=normalized.match(/^\d+[A-Za-z]?\b/)?.[0];
   for(const result of results){
    // A whole-street centroid is not an address pin. Shared plaza addresses are fine.
    if(!house||String(result.address?.house_number||"").toLowerCase()!==house.toLowerCase())continue;
    const pin=validPin(result.lat,result.lon);if(pin)return pin;
   }
  }
 }catch{/* Caller can ask for an address correction instead of dropping the entry silently. */}
 return null;
}
