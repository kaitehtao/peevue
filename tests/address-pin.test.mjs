import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resolveAddressPin,streetAddress} from '../lib/address-pin.ts';
const reply=data=>Response.json(data);
test('normalizes saved business and plaza addresses without changing their street numbers',()=>{
 assert.equal(streetAddress('Hachi, 3400, South Jones Boulevard, Chinatown, Las Vegas, Nevada, 89146, United States'),'3400 South Jones Boulevard, Las Vegas, NV 89146');
 assert.equal(streetAddress('4725 spring mountain road Las Vegas NV 89102'),'4725 spring mountain road, Las Vegas, NV 89102');
 assert.equal(streetAddress('123 Main Street, Henderson, NV 89015'),'123 Main Street, Henderson, NV 89015');
});
test('uses Census address coordinates and sends only the address',async()=>{
 let calls=0;
 const pin=await resolveAddressPin('4000 South Eastern Avenue, Las Vegas, NV 89119',async url=>{
  calls++;assert.equal(url.searchParams.get('address'),'4000 South Eastern Avenue, Las Vegas, NV 89119');
  return reply({result:{addressMatches:[{coordinates:{y:36.116576,x:-115.11903}}]}});
 });
 assert.equal(calls,1);assert.deepEqual(pin,{latitude:36.116576,longitude:-115.11903});
});
test('falls back to a shared plaza address while rejecting a street-only centroid',async()=>{
 let calls=0,quota=0;
 const pin=await resolveAddressPin('3400 South Jones Boulevard, Las Vegas, NV 89146',async()=>++calls===1?reply({result:{addressMatches:[]}}):reply([
  {lat:'36.14',lon:'-115.2',address:{road:'Jones'}},
  {lat:'36.12652',lon:'-115.2245395',address:{house_number:'3400'}}
 ]),async()=>{quota++;});
 assert.equal(quota,1);assert.equal(pin.latitude,36.12652);
});
test('unresolved, out-of-area, and unavailable lookups do not invent pins',async()=>{
 assert.equal(await resolveAddressPin('4000 Eastern Ave, Las Vegas',async()=>reply({result:{addressMatches:[{coordinates:{y:40,x:-74}}]}})),null);
 assert.equal(await resolveAddressPin('4000 Eastern Ave, Las Vegas',async()=>{throw Error('offline');}),null);
});
