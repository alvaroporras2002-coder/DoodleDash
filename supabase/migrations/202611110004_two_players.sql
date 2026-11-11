-- Allow two players in all seven modes; preserve rooms, entries and RPC permissions.
begin;
create or replace function game_private.clean_settings(p jsonb) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare v_mode text:=coalesce(p->>'mode','classic'); v_seconds integer; v_max integer;
begin
  if v_mode not in ('classic','speed','masterpiece','memory','animation','copy','icebreaker') then
    raise exception 'Modo no válido.';
  end if;
  v_seconds:=coalesce((p->>'seconds')::integer,90);
  v_max:=coalesce((p->>'maxPlayers')::integer,12);
  if v_seconds not between 15 and 180 or v_max not between 2 and 20 then
    raise exception 'Configura entre 15 y 180 segundos y entre 2 y 20 jugadores.';
  end if;
  return jsonb_build_object('mode',v_mode,'seconds',v_seconds,'maxPlayers',v_max);
end $$;

create or replace function public.game_action(code text,action text,payload jsonb default '{}') returns void
language plpgsql security definer set search_path = '' as $$
declare v_id uuid:=game_private.current_user_id(); v_code text:=upper(trim(code)); r game_private.rooms%rowtype;
  v_host boolean; v_order uuid[]; v_target uuid; v_kind text; v_chain uuid; v_settings jsonb; v_name text; v_last timestamptz;
begin
  select * into r from game_private.rooms x where x.code=v_code for update;
  if not found then raise exception 'La sala ya no existe.'; end if;
  if not exists(select 1 from game_private.players p where p.room_code=v_code and p.user_id=v_id and p.active) then
    raise exception 'Ya no estás en esta sala.' using errcode='42501';
  end if;
  update game_private.players set last_seen=clock_timestamp() where room_code=v_code and user_id=v_id;
  if action='heartbeat' then return; end if;
  v_host:=r.host_id=v_id;
  if action in ('settings','start','reveal_next','restart','kick') and not v_host then
    raise exception 'Solo el anfitrión puede hacer esto.' using errcode='42501';
  end if;
  case action
  when 'claim_host' then
    if v_host then return; end if;
    if exists(select 1 from game_private.players hp where hp.room_code=v_code and hp.user_id=r.host_id and hp.last_seen>clock_timestamp()-interval '60 seconds') then
      raise exception 'El anfitrión sigue conectado. Espera un minuto sin actividad antes de recuperar el control.';
    end if;
    update game_private.rooms set host_id=v_id where game_private.rooms.code=v_code;
    update game_private.players set ready=true where room_code=v_code and user_id=v_id;
  when 'ready' then
    if r.status<>'lobby' then raise exception 'La partida ya comenzó.'; end if;
    update game_private.players set ready=coalesce((payload->>'ready')::boolean,true) where room_code=v_code and user_id=v_id;
  when 'settings' then
    if r.status<>'lobby' then raise exception 'La configuración está bloqueada durante la partida.'; end if;
    v_settings:=game_private.clean_settings(payload);
    if (v_settings->>'maxPlayers')::integer<(select count(*) from game_private.players p where p.room_code=v_code and p.active) then
      raise exception 'La capacidad no puede ser menor que el número de jugadores.';
    end if;
    update game_private.rooms set settings=v_settings where game_private.rooms.code=v_code;
    update game_private.players set ready=(user_id=r.host_id) where room_code=v_code and active;
  when 'start' then
    if r.status<>'lobby' then raise exception 'La partida ya comenzó.'; end if;
    select array_agg(p.user_id order by p.joined_at) into v_order from game_private.players p where p.room_code=v_code and p.active;
    if cardinality(v_order)<2 then raise exception 'Necesitan al menos dos jugadores.'; end if;
    if exists(select 1 from game_private.players p where p.room_code=v_code and p.active and not p.ready and p.user_id<>r.host_id) then
      raise exception 'Espera a que todos estén listos.';
    end if;
    update game_private.rooms set status='playing',game_id=gen_random_uuid(),round=0,order_ids=v_order,reveal_index=0,reactions='[]',
      total_rounds=case when r.settings->>'mode'='icebreaker' then 2 else cardinality(v_order)+(cardinality(v_order)%2) end,
      deadline=clock_timestamp()+make_interval(secs=>game_private.effective_seconds(r.settings)) where game_private.rooms.code=v_code;
  when 'submit' then
    if r.status<>'playing' then raise exception 'Esta ronda ya terminó.'; end if;
    if coalesce(payload->>'gameId','')<>r.game_id::text then raise exception 'Esta partida ya terminó. Actualiza tu sala.'; end if;
    if coalesce((payload->>'round')::integer,-1)<>r.round then raise exception 'Esta ronda ya terminó. Actualiza tu partida.'; end if;
    if r.deadline<=clock_timestamp() then
      perform game_private.advance(v_code);
    else
      if not v_id=any(r.order_ids) then raise exception 'No participas en esta partida.'; end if;
      v_chain:=game_private.chain_for(r.order_ids,v_id,r.round);
      v_kind:=game_private.kind(r.settings->>'mode',r.round);
      if v_kind='draw' then
        if coalesce(octet_length(payload->>'image'),0) not between 30 and 460800
          or (payload->>'image') !~ '^data:image/(png|webp);base64,[A-Za-z0-9+/=]+$' then
          raise exception 'El dibujo debe ser PNG o WebP y pesar menos de 450 KiB.';
        end if;
      elsif coalesce(length(trim(payload->>'text')),0) not between 1 and 240 then
        raise exception 'Escribe entre 1 y 240 caracteres.';
      end if;
      insert into game_private.entries(room_code,chain_id,round,player_id,kind,text_value,image_value)
      values(v_code,v_chain,r.round,v_id,v_kind,case when v_kind<>'draw' then trim(payload->>'text') end,
        case when v_kind='draw' then payload->>'image' end)
      on conflict do nothing;
      perform game_private.advance(v_code);
    end if;
  when 'tick' then
    if r.status<>'playing' or r.deadline>clock_timestamp() then return; end if;
    perform game_private.advance(v_code);
  when 'reveal_next' then
    if r.status<>'reveal' then raise exception 'No hay un álbum en presentación.'; end if;
    if r.reveal_index+1>=cardinality(r.order_ids)*r.total_rounds then
      update game_private.rooms set status='finished' where game_private.rooms.code=v_code;
    else
      update game_private.rooms set reveal_index=reveal_index+1,reactions='[]' where game_private.rooms.code=v_code;
    end if;
  when 'restart' then
    if r.status not in ('reveal','finished') then raise exception 'Termina la partida antes de volver a empezar.'; end if;
    delete from game_private.entries where room_code=v_code;
    update game_private.rooms set status='lobby',game_id=gen_random_uuid(),round=0,total_rounds=0,deadline=null,order_ids='{}',reveal_index=0,reactions='[]'
      where game_private.rooms.code=v_code;
    update game_private.players set ready=(user_id=r.host_id) where room_code=v_code and active;
  when 'leave','kick' then
    v_target:=case when action='leave' then v_id else (payload->>'playerId')::uuid end;
    if action='kick' and v_target=v_id then raise exception 'Usa salir para abandonar la sala.'; end if;
    update game_private.players set active=false,ready=false,blocked=(action='kick') where room_code=v_code and user_id=v_target;
    if v_target=r.host_id then
      select p.user_id into v_target from game_private.players p where p.room_code=v_code and p.active order by p.joined_at limit 1;
      if v_target is null then
        update game_private.rooms set status='finished',deadline=null where game_private.rooms.code=v_code;
      else
        update game_private.rooms set host_id=v_target where game_private.rooms.code=v_code;
        update game_private.players set ready=true where room_code=v_code and user_id=v_target;
      end if;
    end if;
    perform game_private.advance(v_code);
  when 'react' then
    if r.status not in ('reveal','finished') then raise exception 'Las reacciones se abren al revelar los álbumes.'; end if;
    if coalesce(payload->>'emoji','') not in ('😂','❤️','👏','🔥','🎨','🤯') then raise exception 'Reacción no válida.'; end if;
    select p.name,p.last_reaction into v_name,v_last from game_private.players p where p.room_code=v_code and p.user_id=v_id;
    if v_last>clock_timestamp()-interval '1 second' then return; end if;
    update game_private.players set last_reaction=clock_timestamp() where room_code=v_code and user_id=v_id;
    update game_private.rooms set reactions=(select coalesce(jsonb_agg(x.value order by x.ordinality),'[]') from
      jsonb_array_elements(r.reactions||jsonb_build_array(jsonb_build_object('name',v_name,'emoji',payload->>'emoji')))
      with ordinality x(value,ordinality) where x.ordinality>greatest(0,jsonb_array_length(r.reactions)+1-20))
      where game_private.rooms.code=v_code;
  else raise exception 'Acción no válida.';
  end case;
  update game_private.rooms set updated_at=now() where game_private.rooms.code=v_code;
  update public.room_events set version=version+1 where room_events.code=v_code;
end $$;

commit;
