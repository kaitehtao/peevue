alter table public.community_reviews add column passcode text not null default '' check(length(passcode)<=40);
-- Preserve existing callers while allowing moderators to edit or clear the code atomically.
drop function public.moderate_review(uuid,uuid,timestamptz,text,text,text[],jsonb);
create function public.moderate_review(p_id uuid,p_actor uuid,p_expected timestamptz,p_status text,p_note text,p_photos text[],p_venue jsonb,p_passcode text default null) returns void language plpgsql security invoker set search_path='' as $$
declare r public.community_reviews;v_id uuid;
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
 end if;
 update public.community_reviews set status=p_status,passcode=coalesce(p_passcode,passcode),venue_id=v_id,photo_keys=p_photos,moderation_note=p_note,updated_at=clock_timestamp() where id=p_id;
 insert into public.moderation_events(review_id,actor,decision,note) values(p_id,p_actor,p_status,p_note);
end;$$;
revoke all on function public.moderate_review(uuid,uuid,timestamptz,text,text,text[],jsonb,text) from public,anon,authenticated;
grant execute on function public.moderate_review(uuid,uuid,timestamptz,text,text,text[],jsonb,text) to service_role;
