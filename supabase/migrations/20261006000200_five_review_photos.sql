alter table public.community_reviews drop constraint community_reviews_photo_keys_check;
alter table public.community_reviews add constraint community_reviews_photo_keys_check check(cardinality(photo_keys)<=5);
create or replace function public.edit_review(p_id uuid,p_actor uuid,p_expected timestamptz,p_content jsonb,p_keep text[],p_added text[]) returns text language plpgsql security invoker set search_path='' as $$
declare r public.community_reviews;is_admin boolean;new_status text;
begin
 select * into r from public.community_reviews where id=p_id for update;
 if not found or p_actor is null then raise exception 'Not allowed';end if;
 is_admin:=exists(select 1 from public.administrators where user_id=p_actor);
 if not is_admin and r.user_id is distinct from p_actor then raise exception 'Not allowed';end if;
 if p_expected is null or r.updated_at<>p_expected then raise exception 'Review changed';end if;
 if p_keep is null or p_added is null or not p_keep <@ r.photo_keys or cardinality(p_keep)+cardinality(p_added)>5
 or exists(select 1 from unnest(p_keep||p_added) k where k is null or k !~ '^[0-9a-f-]{36}[.]jpg$')
 or (select count(distinct k) from unnest(p_keep||p_added) k)<>cardinality(p_keep)+cardinality(p_added)
 then raise exception 'Invalid photos';end if;
 if p_content is null or p_content->>'name' is null or length(trim(p_content->>'name')) not between 2 and 50
 or p_content->>'body' is null or length(trim(p_content->>'body')) not between 10 and 1500
 or p_content->>'rating' is null or p_content->>'rating' !~ '^[1-5]$'
 or p_content->>'visited' is null or (p_content->>'visited')::date not between date '2000-01-01' and (now() at time zone 'America/Los_Angeles')::date
 or length(coalesce(p_content->>'passcode',''))>40 then raise exception 'Invalid review';end if;
 insert into public.review_revisions(review_id,actor,previous_content) values(p_id,p_actor,jsonb_build_object('display_name',r.display_name,'rating',r.rating,'body',r.body,'visited',r.visited,'passcode',r.passcode,'photo_keys',r.photo_keys,'status',r.status));
 new_status:=case when is_admin then r.status else 'pending' end;
 update public.community_reviews set display_name=trim(p_content->>'name'),rating=(p_content->>'rating')::integer,body=trim(p_content->>'body'),visited=(p_content->>'visited')::date,passcode=coalesce(p_content->>'passcode',''),photo_keys=p_keep||p_added,status=new_status,updated_at=clock_timestamp() where id=p_id;
 insert into public.moderation_events(review_id,actor,decision,note) values(p_id,p_actor,case when is_admin then 'admin_edited' else 'author_edited' end,case when is_admin then 'Administrator saved review changes' else 'Author changes require moderation' end);
 return new_status;
end;$$;
revoke all on function public.edit_review(uuid,uuid,timestamptz,jsonb,text[],text[]) from public,anon,authenticated;
grant execute on function public.edit_review(uuid,uuid,timestamptz,jsonb,text[],text[]) to service_role;
