create table public.member_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check(length(trim(display_name)) between 2 and 50),
 bio text not null default '' check(length(bio)<=500),
 avatar_key text check(avatar_key ~ '^[0-9a-f-]{36}[.]jpg$'),
 is_public boolean not null default false,
 allow_messages boolean not null default false,
 share_email boolean not null default false,
 contact_email text,
 updated_at timestamptz not null default now(),
 check(not share_email or (is_public and contact_email is not null))
);
create table public.member_follows (
 follower uuid not null references public.member_profiles(user_id) on delete cascade,
 followed uuid not null references public.member_profiles(user_id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(follower,followed),check(follower<>followed)
);
create table public.member_blocks (
 blocker uuid not null references public.member_profiles(user_id) on delete cascade,
 blocked uuid not null references public.member_profiles(user_id) on delete cascade,
 primary key(blocker,blocked),check(blocker<>blocked)
);
alter table public.member_profiles enable row level security;
alter table public.member_follows enable row level security;
alter table public.member_blocks enable row level security;
revoke all on public.member_profiles,public.member_follows,public.member_blocks from public,anon,authenticated;
grant all on public.member_profiles,public.member_follows,public.member_blocks to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('profile-photos','profile-photos',false,2097152,array['image/jpeg']);
create table public.member_messages (
 id uuid primary key default gen_random_uuid(),
 sender uuid not null references public.member_profiles(user_id) on delete cascade,
 recipient uuid not null references public.member_profiles(user_id) on delete cascade,
 body text not null check(length(trim(body)) between 1 and 2000),
 created_at timestamptz not null default now(),read_at timestamptz,
 check(sender<>recipient)
);
create index member_messages_recipient on public.member_messages(recipient,created_at desc);
create index member_messages_sender on public.member_messages(sender,created_at desc);
create table public.member_reports (
 id uuid primary key default gen_random_uuid(),reporter uuid not null references auth.users(id),
 message_id uuid not null references public.member_messages(id),reason text not null check(length(trim(reason)) between 5 and 500),
 created_at timestamptz not null default now(),unique(reporter,message_id)
);
alter table public.member_messages enable row level security;
alter table public.member_reports enable row level security;
revoke all on public.member_messages,public.member_reports from public,anon,authenticated;
grant all on public.member_messages,public.member_reports to service_role;
create function public.send_member_message(p_sender uuid,p_recipient uuid,p_body text) returns uuid language plpgsql security invoker set search_path='' as $$
declare message_id uuid;
begin
 if p_sender=p_recipient or length(trim(p_body)) not between 1 and 2000 then raise exception 'Invalid message';end if;
 if not exists(select 1 from public.member_profiles where user_id=p_sender and is_public and allow_messages) or not exists(select 1 from public.member_profiles where user_id=p_recipient and is_public and allow_messages) then raise exception 'Messaging unavailable';end if;
 if exists(select 1 from public.member_blocks where (blocker=p_sender and blocked=p_recipient) or (blocker=p_recipient and blocked=p_sender)) then raise exception 'Messaging unavailable';end if;
 insert into public.member_messages(sender,recipient,body) values(p_sender,p_recipient,trim(p_body)) returning id into message_id;
 return message_id;
end;$$;
revoke all on function public.send_member_message(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.send_member_message(uuid,uuid,text) to service_role;
