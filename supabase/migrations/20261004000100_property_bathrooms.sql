-- Properties contain individually reviewed bathrooms. Existing records keep their history.
create table public.bathrooms (
 id uuid primary key default gen_random_uuid(),
 venue_id uuid not null references public.venues(id),
 location text not null check(length(trim(location)) between 2 and 120),
 gender text not null check(gender in ('Men’s','Women’s','Unisex','Family','Not specified')),
 created_at timestamptz not null default now(),
 unique(id,venue_id)
);
create unique index bathrooms_property_location_type on public.bathrooms(venue_id,lower(trim(location)),gender);
alter table public.bathrooms enable row level security;
revoke all on public.bathrooms from public,anon,authenticated;
grant all on public.bathrooms to service_role;
alter table public.community_reviews add column bathroom_id uuid,add column proposed_bathroom jsonb;
alter table public.community_reviews add constraint review_bathroom_property foreign key(bathroom_id,venue_id) references public.bathrooms(id,venue_id);
alter table public.community_reviews add constraint bathroom_requires_property check(bathroom_id is null or venue_id is not null);
create index community_bathroom on public.community_reviews(bathroom_id);
insert into public.bathrooms(venue_id,location,gender) select id,'Location not specified','Not specified' from public.venues;
update public.community_reviews r set bathroom_id=b.id from public.bathrooms b where r.venue_id=b.venue_id;
update public.community_reviews set proposed_bathroom='{"location":"Location not specified","gender":"Not specified"}' where bathroom_id is null;
drop function public.moderate_review(uuid,uuid,timestamptz,text,text,text[],jsonb,text);
create function public.moderate_review(p_id uuid,p_actor uuid,p_expected timestamptz,p_status text,p_note text,p_photos text[],p_venue jsonb,p_passcode text default null,p_bathroom jsonb default null) returns void language plpgsql security invoker set search_path='' as $$
declare r public.community_reviews;v_id uuid;b_id uuid;b jsonb;
begin
 if not exists(select 1 from public.administrators where user_id=p_actor) then raise exception 'Administrator required';end if;
 if p_status not in ('approved','rejected') or length(p_note)>500 or length(p_passcode)>40 then raise exception 'Invalid decision';end if;
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
  b:=coalesce(p_bathroom,r.proposed_bathroom,(select jsonb_build_object('location',location,'gender',gender) from public.bathrooms where id=r.bathroom_id),'{"location":"Location not specified","gender":"Not specified"}'::jsonb);
  if b->>'location' is null or length(trim(b->>'location')) not between 2 and 120 or b->>'gender' is null or b->>'gender' not in ('Men’s','Women’s','Unisex','Family','Not specified') then raise exception 'Invalid bathroom';end if;
  -- Reuse a bathroom within this property by normalized location and type.
  perform pg_advisory_xact_lock(hashtextextended(v_id::text||'|'||lower(trim(b->>'location'))||'|'||(b->>'gender'),0));
  b_id:=r.bathroom_id;
  if b_id is null then
   select id into b_id from public.bathrooms where venue_id=v_id and lower(trim(location))=lower(trim(b->>'location')) and gender=b->>'gender';
  end if;
  if b_id is null then
   insert into public.bathrooms(venue_id,location,gender) values(v_id,trim(b->>'location'),b->>'gender') returning id into b_id;
  else
   update public.bathrooms set location=trim(b->>'location'),gender=b->>'gender' where id=b_id and venue_id=v_id;
   if not found then raise exception 'Bathroom does not belong to property';end if;
  end if;
 else
  b_id:=r.bathroom_id;
 end if;
 update public.community_reviews set bathroom_id=b_id,proposed_bathroom=coalesce(p_bathroom,proposed_bathroom),status=p_status,passcode=coalesce(p_passcode,passcode),venue_id=v_id,photo_keys=p_photos,moderation_note=p_note,updated_at=clock_timestamp() where id=p_id;
 insert into public.moderation_events(review_id,actor,decision,note) values(p_id,p_actor,p_status,p_note);
end;$$;
revoke all on function public.moderate_review(uuid,uuid,timestamptz,text,text,text[],jsonb,text,jsonb) from public,anon,authenticated;
grant execute on function public.moderate_review(uuid,uuid,timestamptz,text,text,text[],jsonb,text,jsonb) to service_role;
