-- Addresses are provisioned separately by the owner, never committed to source.
create table public.administrator_reservations (
 email text primary key check(email=lower(trim(email))),
 created_at timestamptz not null default now()
);
alter table public.administrator_reservations enable row level security;
revoke all on public.administrator_reservations from public,anon,authenticated;
grant all on public.administrator_reservations to service_role;
-- The Worker must verify the user via Auth getUser and email_confirmed_at first.
-- Browser roles cannot call this function. Consuming a reservation prevents a
-- revoked administrator from automatically regaining access on the next login.
create function public.claim_administrator_reservation(p_user_id uuid,p_verified_email text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare reserved_email text;
begin
 select email into reserved_email from public.administrator_reservations
 where email=lower(trim(p_verified_email)) for update;
 if reserved_email is null then return false;end if;
 insert into public.administrators(user_id) values(p_user_id) on conflict do nothing;
 delete from public.administrator_reservations where email=reserved_email;
 return true;
end;$$;
revoke all on function public.claim_administrator_reservation(uuid,text) from public,anon,authenticated;
grant execute on function public.claim_administrator_reservation(uuid,text) to service_role;
