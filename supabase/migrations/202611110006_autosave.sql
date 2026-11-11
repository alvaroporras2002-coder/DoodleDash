-- Save in-progress work without ending rounds. Apply once before deploying the client.
begin;
create table if not exists game_private.drafts (
 room_code text not null references game_private.rooms(code) on delete cascade,
 user_id uuid not null,
 game_id uuid not null,
 round integer not null,
 payload jsonb not null,
 updated_at timestamptz not null default clock_timestamp(),
 primary key(room_code,user_id)
);
alter table game_private.drafts enable row level security;
revoke all on game_private.drafts from public,anon,authenticated;

create or replace function public.game_save_draft(code text,game_id uuid,round_index integer,payload jsonb) returns boolean
language plpgsql security definer set search_path='' as $$
declare v_id uuid:=game_private.current_user_id();v_code text:=upper(trim(code));r game_private.rooms%rowtype;v_kind text;
begin
 select * into r from game_private.rooms x where x.code=v_code for update;
 if not found then raise exception 'Room not found.' using errcode='42501';end if;
 if not exists(select 1 from game_private.players p where p.room_code=v_code and p.user_id=v_id and p.active and not p.blocked) then
  raise exception 'You are not a member of this room.' using errcode='42501';
 end if;
 if r.status<>'playing' or r.game_id<>game_save_draft.game_id or r.round<>round_index or r.deadline<=clock_timestamp() then return false;end if;
 if not v_id=any(r.order_ids) then raise exception 'You are not playing in this game.' using errcode='42501';end if;
 if exists(select 1 from game_private.entries e where e.room_code=v_code and e.player_id=v_id and e.round=r.round) then return false;end if;
 v_kind:=game_private.kind(r.settings->>'mode',r.round);
 if v_kind='draw' then
  if coalesce(octet_length(payload->>'image'),0) not between 30 and 460800 or (payload->>'image') !~ '^data:image/(png|webp);base64,[A-Za-z0-9+/=]+$' then
   raise exception 'The drawing must be a PNG or WebP smaller than 450 KiB.';
  end if;
 else
  if length(coalesce(payload->>'text',''))>240 then raise exception 'Write up to 240 characters.';end if;
 end if;
 insert into game_private.drafts(room_code,user_id,game_id,round,payload)
 values(v_code,v_id,r.game_id,r.round,case when v_kind='draw' then jsonb_build_object('image',payload->>'image') else jsonb_build_object('text',trim(coalesce(payload->>'text',''))) end)
 on conflict(room_code,user_id) do update set game_id=excluded.game_id,round=excluded.round,payload=excluded.payload,updated_at=clock_timestamp();
 return true;
end $$;
revoke all on function public.game_save_draft(text,uuid,integer,jsonb) from public,anon;
grant execute on function public.game_save_draft(text,uuid,integer,jsonb) to authenticated;

create or replace function game_private.advance(p_code text) returns void
language plpgsql security definer set search_path='' as $$
declare r game_private.rooms%rowtype;v_player uuid;v_kind text;v_payload jsonb;
begin
 select * into r from game_private.rooms where code=p_code for update;
 if r.status<>'playing' then return;end if;
 if r.deadline>clock_timestamp() and exists(
  select 1 from game_private.players p where p.room_code=p_code and p.active and p.user_id=any(r.order_ids)
  and not exists(select 1 from game_private.entries e where e.room_code=p_code and e.round=r.round and e.player_id=p.user_id)
 ) then return;end if;
 v_kind:=game_private.kind(r.settings->>'mode',r.round);
 foreach v_player in array r.order_ids loop
  v_payload:=null;
  select d.payload into v_payload from game_private.drafts d where d.room_code=p_code and d.user_id=v_player and d.game_id=r.game_id and d.round=r.round;
  insert into game_private.entries(room_code,chain_id,round,player_id,kind,text_value,image_value)
  values(p_code,game_private.chain_for(r.order_ids,v_player,r.round),r.round,v_player,v_kind,
    case when v_kind<>'draw' then coalesce(nullif(trim(v_payload->>'text'),''),'[No response]') end,
    case when v_kind='draw' then v_payload->>'image' end)
  on conflict do nothing;
 end loop;
 delete from game_private.drafts where room_code=p_code and game_id=r.game_id and round=r.round;
 if r.round+1>=r.total_rounds then
  update game_private.rooms set status='reveal',deadline=null,reveal_index=0 where code=p_code;
 else
  update game_private.rooms set round=r.round+1,deadline=clock_timestamp()+make_interval(secs=>game_private.effective_seconds(r.settings)) where code=p_code;
 end if;
end $$;
revoke all on function game_private.advance(text) from public,anon,authenticated;
commit;
