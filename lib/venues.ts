export const venues = [
{id:'juniper',name:'Juniper & Stone',area:'The Strip',type:'Restaurant',score:4.9,count:28,tags:['Accessible','Changing table'],access:'Customers only',note:'Spotless counters. A little moment of calm.',tone:'green'},
{id:'paloma',name:'Paloma Social',area:'Arts District',type:'Restaurant',score:4.8,count:19,tags:['All-gender','Accessible'],access:'Customers only',note:'Bright, thoughtfully designed, and well stocked.',tone:'pink'},
{id:'desert',name:'Desert House',area:'Downtown',type:'Hotel & lounge',score:4.7,count:34,tags:['Accessible','Changing table'],access:'Public access',note:'Room to breathe, even on a busy evening.',tone:'blue'},
{id:'copper',name:'Copper Cup Café',area:'Summerlin',type:'Café',score:4.6,count:12,tags:['All-gender'],access:'Customers only',note:'A small space that gets the essentials right.',tone:'orange'},
{id:'mesa',name:'Mesa Kitchen',area:'Henderson',type:'Restaurant',score:4.5,count:16,tags:['Accessible','Changing table'],access:'Customers only',note:'Clean, comfortable, and easy to find.',tone:'blue'},
{id:'nightjar',name:'Nightjar Lounge',area:'The Strip',type:'Hotel & lounge',score:4.3,count:21,tags:['All-gender'],access:'Public access',note:'A good pit stop after a night out.',tone:'pink'},
];
export type Venue = typeof venues[number];
export type Review = {id:string;venueId:string;name:string;rating:number;body:string;visited:string;createdAt:string;photos:string[]};
