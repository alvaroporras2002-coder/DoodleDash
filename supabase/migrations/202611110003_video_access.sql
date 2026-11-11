-- Run after 001 and 002. Adds optional video admission without changing game rules.
begin;
alter table game_private.players add column if not exists last_video_token timestamptz;
create or replace function public.game_video_access(code text,issue_token boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_id uuid:=game_private.current_user_id();v_code text:=upper(trim(code));r game_private.rooms%rowtype;p game_private.players%rowtype;
begin
 select * into r from game_private.rooms x where x.code=v_code for share;
 if not found then raise exception 'La sala ya no existe.' using errcode='42501';end if;
 select * into p from game_private.players x where x.room_code=v_code and x.user_id=v_id for update;
 if not found or not p.active or p.blocked then raise exception 'No participas en esta sala.' using errcode='42501';end if;
 if issue_token then
  if p.last_video_token>clock_timestamp()-interval '5 seconds' then raise exception 'Espera cinco segundos antes de volver a entrar a la llamada.' using errcode='P0001';end if;
  update game_private.players set last_video_token=clock_timestamp() where room_code=v_code and user_id=v_id;
 end if;
 return jsonb_build_object('roomName','doodledash-'||r.code,'identity',v_id,'name',p.name,'avatar',p.avatar,'capacity',20,
 'members',(select coalesce(jsonb_agg(x.user_id),'[]') from game_private.players x where x.room_code=v_code and x.active and not x.blocked));
end $$;
revoke all on function public.game_video_access(text,boolean) from public,anon;
grant execute on function public.game_video_access(text,boolean) to authenticated;
commit;
