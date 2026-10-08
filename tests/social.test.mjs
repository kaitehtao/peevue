import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);grant usage on schema public to anon,authenticated,service_role;`);
await db.exec(await readFile(new URL('../supabase/migrations/20261008000100_member_profiles.sql',import.meta.url),'utf8'));
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
await db.query('insert into auth.users values($1),($2)',[a,b]);
await db.query("insert into member_profiles(user_id,display_name) values($1,'Alice'),($2,'Bob')",[a,b]);
after(()=>db.close());
test('profiles and emails default private; clients cannot bypass messaging routes',async()=>{
 const rows=(await db.query('select is_public,allow_messages,share_email,contact_email from member_profiles')).rows;
 for(const p of rows)assert.deepEqual(p,{is_public:false,allow_messages:false,share_email:false,contact_email:null});
 for(const role of ['anon','authenticated']){await db.exec('set role '+role);try{for(const table of ['member_profiles','member_messages','member_reports','member_blocks','member_follows'])await assert.rejects(db.query('select * from '+table),/permission denied/);await assert.rejects(db.query('select send_member_message($1,$2,$3)',[a,b,'test']),/permission denied/);}finally{await db.exec('reset role');}}
});
test('messaging requires both opt-ins and blocks prevent delivery in both directions',async()=>{
 const send=()=>db.query('select send_member_message($1,$2,$3)',[a,b,'Hello from PEEVUE']);
 await assert.rejects(send(),/Messaging unavailable/);
 await db.query('update member_profiles set is_public=true,allow_messages=true');await send();
 assert.equal((await db.query('select body from member_messages')).rows[0].body,'Hello from PEEVUE');
 await db.query('insert into member_blocks values($1,$2)',[b,a]);await assert.rejects(send(),/Messaging unavailable/);await assert.rejects(db.query('select send_member_message($1,$2,$3)',[b,a,'Reply']),/Messaging unavailable/);
 assert.equal((await db.query('select * from member_messages')).rows.length,1);
 await db.query('delete from member_blocks');await db.query('update member_profiles set allow_messages=false where user_id=$1',[b]);await assert.rejects(send(),/Messaging unavailable/);
});
test('email cannot be shared on a private profile and message text is bounded',async()=>{
 await assert.rejects(db.query("update member_profiles set share_email=true,is_public=false,contact_email='test@example.com' where user_id=$1",[a]),/check constraint/);
 await assert.rejects(db.query('select send_member_message($1,$2,$3)',[a,b,'x'.repeat(2001)]),/Invalid message/);
});
