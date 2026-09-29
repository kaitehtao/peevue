-- Application data is available only through the Cloudflare API. Browser roles
-- have no table privileges; RLS adds defense in depth. Auth remains Supabase-managed.
create table public.administrators (user_id uuid primary key references auth.users(id) on delete cascade, created_at timestamptz not null default now());
create table public.venues (
 id uuid primary key default gen_random_uuid(),name text not null check(length(name) between 2 and 120),address text not null check(length(address) between 8 and 250),
 area text not null,type text not null,access text not null,tags text[] not null default '{}',
 latitude double precision check(latitude between 35.8 and 36.5),longitude double precision check(longitude between -115.6 and -114.8),location_source text not null,
 created_at timestamptz not null default now(),check((latitude is null)=(longitude is null))
);
create table public.community_reviews (
 id uuid primary key,receipt_hash text not null,user_id uuid references auth.users(id) on delete set null,venue_id uuid references public.venues(id),proposed_venue jsonb,
 display_name text not null check(length(display_name) between 2 and 50),rating integer not null check(rating between 1 and 5),body text not null check(length(body) between 10 and 1500),visited date not null,
 photo_keys text[] not null default '{}' check(cardinality(photo_keys)<=3),status text not null default 'pending' check(status in ('pending','approved','rejected')),
 moderation_note text not null default '',created_at timestamptz not null default now(),updated_at timestamptz not null default now(),check(venue_id is not null or proposed_venue is not null)
);
create index community_status_created on public.community_reviews(status,created_at desc);
create index community_owner on public.community_reviews(user_id);
create index community_venue on public.community_reviews(venue_id);
create index community_photos on public.community_reviews using gin(photo_keys);
create table public.moderation_events(id bigint generated always as identity primary key,review_id uuid not null references public.community_reviews(id),actor uuid references auth.users(id) on delete set null,decision text not null,note text not null,created_at timestamptz not null default now());
create index moderation_review on public.moderation_events(review_id);
create index moderation_actor on public.moderation_events(actor);
create table public.request_quotas(key text primary key,hits integer not null,expires_at timestamptz not null);
create index quota_expiry on public.request_quotas(expires_at);
create table public.geocode_cache(key text primary key,result jsonb not null,expires_at timestamptz not null);
alter table public.administrators enable row level security;
alter table public.venues enable row level security;
alter table public.community_reviews enable row level security;
alter table public.moderation_events enable row level security;
alter table public.request_quotas enable row level security;
alter table public.geocode_cache enable row level security;
revoke all on public.administrators,public.venues,public.community_reviews,public.moderation_events,public.request_quotas,public.geocode_cache from public,anon,authenticated;
grant all on public.administrators,public.venues,public.community_reviews,public.moderation_events,public.request_quotas,public.geocode_cache to service_role;
grant usage,select on sequence public.moderation_events_id_seq to service_role;
create function public.consume_quota(p_key text,p_limit integer,p_seconds integer) returns boolean language plpgsql security invoker set search_path='' as $$
declare accepted integer;
begin
 if p_limit<1 or p_seconds<1 then raise exception 'Invalid quota';end if;
 delete from public.request_quotas where expires_at<now()-interval '1 day';
 insert into public.request_quotas as q(key,hits,expires_at) values(p_key,1,clock_timestamp()+make_interval(secs=>p_seconds))
 on conflict(key) do update set hits=case when q.expires_at<=clock_timestamp() then 1 else q.hits+1 end,
 expires_at=case when q.expires_at<=clock_timestamp() then clock_timestamp()+make_interval(secs=>p_seconds) else q.expires_at end
 where q.expires_at<=clock_timestamp() or q.hits<p_limit returning hits into accepted;
 return accepted is not null;
end;$$;
revoke all on function public.consume_quota(text,integer,integer) from public,anon,authenticated;
grant execute on function public.consume_quota(text,integer,integer) to service_role;
create function public.moderate_review(p_id uuid,p_actor uuid,p_expected timestamptz,p_status text,p_note text,p_photos text[],p_venue jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare r public.community_reviews;v_id uuid;
begin
 if not exists(select 1 from public.administrators where user_id=p_actor) then raise exception 'Administrator required';end if;
 if p_status not in ('approved','rejected') or length(p_note)>500 then raise exception 'Invalid decision';end if;
 select * into r from public.community_reviews where id=p_id for update;
 if not found or r.updated_at<>p_expected then raise exception 'Review changed';end if;
 if not p_photos <@ r.photo_keys then raise exception 'Invalid photos';end if;
 v_id:=r.venue_id;
 if p_status='approved' then
  if v_id is null then
   -- Exact normalized name/address matches reuse a venue; all writes serialized
   -- for that pair to avoid duplicate venues from simultaneous approvals.
   perform pg_advisory_xact_lock(hashtextextended(lower(trim(p_venue->>'name'))||'|'||lower(trim(p_venue->>'address')),0));
   select id into v_id from public.venues where lower(trim(name))=lower(trim(p_venue->>'name')) and lower(trim(address))=lower(trim(p_venue->>'address')) limit 1;
  end if;
  if v_id is null then
   insert into public.venues(name,address,area,type,access,tags,latitude,longitude,location_source)
   values(p_venue->>'name',p_venue->>'address',p_venue->>'area',p_venue->>'type',p_venue->>'access',array(select jsonb_array_elements_text(p_venue->'tags')),(p_venue->>'latitude')::double precision,(p_venue->>'longitude')::double precision,p_venue->>'locationSource') returning id into v_id;
  else
   update public.venues set name=p_venue->>'name',address=p_venue->>'address',area=p_venue->>'area',type=p_venue->>'type',access=p_venue->>'access',tags=array(select jsonb_array_elements_text(p_venue->'tags')),latitude=(p_venue->>'latitude')::double precision,longitude=(p_venue->>'longitude')::double precision,location_source=p_venue->>'locationSource' where id=v_id;
  end if;
 end if;
 update public.community_reviews set status=p_status,venue_id=v_id,photo_keys=p_photos,moderation_note=p_note,updated_at=clock_timestamp() where id=p_id;
 insert into public.moderation_events(review_id,actor,decision,note) values(p_id,p_actor,p_status,p_note);
end;$$;
revoke all on function public.moderate_review(uuid,uuid,timestamptz,text,text,text[],jsonb) from public,anon,authenticated;
grant execute on function public.moderate_review(uuid,uuid,timestamptz,text,text,text[],jsonb) to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('review-photos','review-photos',false,2097152,array['image/jpeg']);
-- No browser storage policies: uploads/downloads are authorized by the Worker.
