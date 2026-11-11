-- Apply AFTER 202611110001_game.sql. Safe to reapply; preserves existing rooms.
begin;
create or replace function game_private.current_user_id() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare v_id uuid := auth.uid();
begin
  if v_id is null or not exists(select 1 from auth.users u where u.id=v_id and u.is_anonymous is true) then
    raise exception 'Entra con tu apodo para obtener una sesión de invitado.' using errcode='28000';
  end if;
  return v_id;
end $$;
create or replace function public.game_can_read_event(p_code text) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from game_private.players p join auth.users u on u.id=p.user_id
 where p.room_code=p_code and p.user_id=auth.uid() and p.active and u.is_anonymous is true);
$$;
create or replace function public.game_create(settings jsonb, nickname text, avatar text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_id uuid:=game_private.current_user_id(); v_code text; v_settings jsonb;
begin
  if length(trim(nickname)) not between 1 and 24 or length(avatar)>24 then raise exception 'Usa un apodo de 1 a 24 caracteres.'; end if;
  v_settings:=game_private.clean_settings(settings);
  -- Expired game history is temporary, never an indefinite employee archive.
  delete from game_private.rooms where updated_at<now()-interval '24 hours';
  if (select count(*) from game_private.rooms where host_id=v_id and status<>'finished')>=5 then
    raise exception 'Ya tienes cinco salas abiertas. Termina o abandona alguna antes de crear otra.';
  end if;
  loop
    v_code:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));
    begin
      insert into game_private.rooms(code,host_id,settings) values(v_code,v_id,v_settings);
      exit;
    exception when unique_violation then null;
    end;
  end loop;
  insert into game_private.players(room_code,user_id,name,avatar,ready) values(v_code,v_id,trim(nickname),coalesce(avatar,'🎨'),true);
  insert into public.room_events(code) values(v_code);
  return v_code;
end $$;


revoke all on function game_private.current_user_id() from public,anon,authenticated;
revoke all on function public.game_can_read_event(text),public.game_create(jsonb,text,text) from public,anon;
grant execute on function public.game_can_read_event(text),public.game_create(jsonb,text,text) to authenticated;
commit;
