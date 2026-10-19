import { inVegas, type VenueInput } from "@/lib/community";
import { resolveAddressPin, streetAddress } from "@/lib/address-pin";
import { ApiError, quota, service } from "@/lib/supabase-server";

export async function withAddressPin(venue:VenueInput):Promise<VenueInput> {
 if(venue.latitude!==null && venue.longitude!==null)return venue;
 const db=service(),key="automatic-address-v2:"+streetAddress(venue.address).toLowerCase();
 const {data:cached}=await db.from("geocode_cache").select("result").eq("key",key).gt("expires_at",new Date().toISOString()).maybeSingle();
 let pin=cached?.result;
 if(!pin || !Number.isFinite(pin.latitude) || !Number.isFinite(pin.longitude)){
  await quota("automatic-geocoding-global",30,60);
  pin=await resolveAddressPin(venue.address,fetch,()=>quota("geocoding-global",1,2));
  if(pin)await db.from("geocode_cache").upsert({key,result:pin,expires_at:new Date(Date.now()+30*86400000).toISOString()});
 }
 if(!pin)throw new ApiError(422,"We couldn’t place this address on the map. Check the street number, street and city, use Find this address, or use your current location while at the property, then save again.");
 return {...venue,latitude:pin.latitude,longitude:pin.longitude,area:inVegas(pin.latitude,pin.longitude)?venue.area:"Outside Las Vegas",locationSource:"address"};
}
