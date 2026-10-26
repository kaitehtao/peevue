import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resolveGpsAddress, gpsAddress} from '../lib/gps-location.ts';
import {venueSchema} from '../lib/community.ts';
const latitude=34.8958, longitude=-117.0173;
test('GPS without a reverse address produces a saveable venue',async()=>{
 for(const request of [async()=>{throw Error('offline')},async()=>Response.json({error:'Rate limited'},{status:429}),async()=>Response.json({results:[]})]){
  const address=await resolveGpsAddress(latitude,longitude,request);
  assert.equal(address,'GPS location: 34.89580, -117.01730');
  assert.equal(venueSchema.safeParse({name:'Roadside stop',address,area:'Outside Las Vegas',type:'Public restroom',access:'Public access',tags:[],latitude,longitude,locationSource:'gps'}).success,true);
 }
});
test('GPS uses a valid reverse address and falls back when the label exceeds the save limit',async()=>{
 assert.equal(await resolveGpsAddress(latitude,longitude,async()=>Response.json({results:[{address:'123 Main Street, Barstow, CA'}]})),'123 Main Street, Barstow, CA');
 assert.equal(gpsAddress(latitude,longitude,'a'.repeat(251)),'GPS location: 34.89580, -117.01730');
});
