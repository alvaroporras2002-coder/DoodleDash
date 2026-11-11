-- DoodleDash: run once in the Supabase SQL editor as project owner.
-- Private game data is accessible only through validated, transactional RPCs.
begin;
create schema if not exists game_private;
revoke all on schema game_private from public, anon, authenticated;

create table public.allowed_domains (
  domain text primary key check (domain = lower(domain) and domain !~ '[@[:space:]]')
);
insert into public.allowed_domains values ('doordash.com'), ('ext.doordash.com');
alter table public.allowed_domains enable row level security;
revoke all on public.allowed_domains from public, anon, authenticated;

create table game_private.rooms (
  code text primary key,
  host_id uuid not null,
  status text not null default 'lobby' check (status in ('lobby','playing','reveal','finished')),
  settings jsonb not null,
  round integer not null default 0,
  total_rounds integer not null default 0,
  deadline timestamptz,
  order_ids uuid[] not null default '{}',
  reveal_index integer not null default 0,
  reactions jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table game_private.players (
  room_code text not null references game_private.rooms(code) on delete cascade,
  user_id uuid not null,
  name text not null,
  avatar text not null,
  ready boolean not null default false,
  active boolean not null default true,
  blocked boolean not null default false,
  joined_at timestamptz not null default clock_timestamp(),
  last_reaction timestamptz,
  last_seen timestamptz not null default clock_timestamp(),
  primary key (room_code,user_id)
);
create table game_private.entries (
  room_code text not null references game_private.rooms(code) on delete cascade,
  chain_id uuid not null,
  round integer not null,
  player_id uuid not null,
  kind text not null check (kind in ('write','draw','describe')),
  text_value text,
  image_value text,
  primary key (room_code,chain_id,round),
  unique (room_code,player_id,round)
);
create table public.room_events (
  code text primary key references game_private.rooms(code) on delete cascade,
  version bigint not null default 0
);
alter table game_private.rooms enable row level security;
alter table game_private.players enable row level security;
alter table game_private.entries enable row level security;
alter table public.room_events enable row level security;
revoke all on all tables in schema game_private from public, anon, authenticated;
revoke all on public.room_events from public, anon, authenticated;
grant select on public.room_events to authenticated;

create function game_private.current_user_id() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare v_id uuid := auth.uid(); v_email text; v_meta jsonb; v_confirmed timestamptz;
begin
  if v_id is null then raise exception 'Inicia sesión con Google.' using errcode='28000'; end if;
  select lower(u.email),u.raw_app_meta_data,u.email_confirmed_at into v_email,v_meta,v_confirmed
    from auth.users u where u.id=v_id;
  if v_email is null or v_confirmed is null or coalesce(v_meta->>'provider','') <> 'google' then
    raise exception 'Se requiere una cuenta verificada de Google.' using errcode='28000';
  end if;
  if not exists (select 1 from public.allowed_domains d where d.domain=split_part(v_email,'@',2)) then
    raise exception 'Tu dominio de correo no está autorizado para este equipo.' using errcode='42501';
  end if;
  return v_id;
end $$;

create function public.game_can_read_event(p_code text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from game_private.players p join auth.users u on u.id=p.user_id
    join public.allowed_domains d on d.domain=split_part(lower(u.email),'@',2)
    where p.room_code=p_code and p.user_id=auth.uid() and p.active
      and u.email_confirmed_at is not null and u.raw_app_meta_data->>'provider'='google'
  );
$$;
create policy members_read_events on public.room_events for select to authenticated
using (public.game_can_read_event(code));

create function game_private.clean_settings(p jsonb) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare v_mode text:=coalesce(p->>'mode','classic'); v_seconds integer; v_max integer;
begin
  if v_mode not in ('classic','speed','masterpiece','memory','animation','copy','icebreaker') then
    raise exception 'Modo no válido.';
  end if;
  v_seconds:=coalesce((p->>'seconds')::integer,90);
  v_max:=coalesce((p->>'maxPlayers')::integer,12);
  if v_seconds not between 15 and 180 or v_max not between 3 and 20 then
    raise exception 'Configura entre 15 y 180 segundos y entre 3 y 20 jugadores.';
  end if;
  return jsonb_build_object('mode',v_mode,'seconds',v_seconds,'maxPlayers',v_max);
end $$;

create function game_private.effective_seconds(p_settings jsonb) returns integer
language sql immutable set search_path = '' as $$
  select greatest(15,least(180,case p_settings->>'mode'
    when 'speed' then (p_settings->>'seconds')::integer/2
    when 'masterpiece' then (p_settings->>'seconds')::integer*2
    else (p_settings->>'seconds')::integer end));
$$;

create function game_private.kind(p_mode text,p_round integer) returns text
language sql immutable set search_path = '' as $$
  select case when p_round=0 then 'write'
    when p_mode in ('memory','animation','copy','icebreaker') or p_round%2=1 then 'draw'
    else 'describe' end;
$$;
create function game_private.chain_for(p_order uuid[],p_player uuid,p_round integer) returns uuid
language sql immutable set search_path = '' as $$
  select p_order[((array_position(p_order,p_player)-1-p_round+cardinality(p_order)*100)%cardinality(p_order))+1];
$$;

-- Caller already owns the room row lock. A deadline and completion are server-owned.
create function game_private.advance(p_code text) returns void
language plpgsql security definer set search_path = '' as $$
declare r game_private.rooms%rowtype; v_player uuid; v_kind text;
begin
  select * into r from game_private.rooms where code=p_code for update;
  if r.status<>'playing' then return; end if;
  if r.deadline>clock_timestamp() and exists (
    select 1 from game_private.players p where p.room_code=p_code and p.active
      and p.user_id=any(r.order_ids) and not exists (
        select 1 from game_private.entries e where e.room_code=p_code and e.round=r.round and e.player_id=p.user_id
      )
  ) then return; end if;
  v_kind:=game_private.kind(r.settings->>'mode',r.round);
  foreach v_player in array r.order_ids loop
    insert into game_private.entries(room_code,chain_id,round,player_id,kind,text_value)
    values(p_code,game_private.chain_for(r.order_ids,v_player,r.round),r.round,v_player,v_kind,
      case when v_kind='draw' then null else '[Sin respuesta]' end)
    on conflict do nothing;
  end loop;
  if r.round+1>=r.total_rounds then
    update game_private.rooms set status='reveal',deadline=null,reveal_index=0 where code=p_code;
  else
    update game_private.rooms set round=r.round+1,
      deadline=clock_timestamp()+make_interval(secs=>game_private.effective_seconds(r.settings)) where code=p_code;
  end if;
end $$;

create function public.game_create(settings jsonb, nickname text, avatar text) returns text
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
    v_code:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
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

create function public.game_join(code text,nickname text,avatar text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_id uuid:=game_private.current_user_id(); v_code text:=upper(trim(code)); r game_private.rooms%rowtype;
begin
  if length(trim(nickname)) not between 1 and 24 or length(avatar)>24 then raise exception 'Usa un apodo de 1 a 24 caracteres.'; end if;
  select * into r from game_private.rooms x where x.code=v_code for update;
  if not found then raise exception 'No encontramos esa sala. Revisa el código.'; end if;
  if exists(select 1 from game_private.players p where p.room_code=v_code and p.user_id=v_id and p.blocked) then
    raise exception 'El anfitrión te retiró de esta sala.' using errcode='42501';
  end if;
  if exists(select 1 from game_private.players p where p.room_code=v_code and p.user_id=v_id and p.active) then return; end if;
  if r.status<>'lobby' and not (r.status='playing' and v_id=any(r.order_ids)) then
    raise exception 'La partida ya comenzó. Espera a la siguiente.';
  end if;
  if (select count(*) from game_private.players p where p.room_code=v_code and p.active)>=(r.settings->>'maxPlayers')::integer then
    raise exception 'La sala está llena.';
  end if;
  insert into game_private.players(room_code,user_id,name,avatar) values(v_code,v_id,trim(nickname),coalesce(avatar,'🎨'))
    on conflict(room_code,user_id) do update set active=true,name=excluded.name,avatar=excluded.avatar,ready=false,last_seen=clock_timestamp();
  update game_private.rooms set updated_at=now() where game_private.rooms.code=v_code;
  update public.room_events set version=version+1 where room_events.code=v_code;
end $$;

create function public.game_state(code text,include_albums boolean default true) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_id uuid:=game_private.current_user_id(); v_code text:=upper(trim(code)); r game_private.rooms%rowtype;
  v_players jsonb; v_task jsonb:=null; v_albums jsonb:='[]'; v_chain uuid; v_kind text; prev game_private.entries%rowtype;
begin
  select * into r from game_private.rooms x where x.code=v_code for share;
  if not found then raise exception 'La sala ya no existe.'; end if;
  if not exists(select 1 from game_private.players p where p.room_code=v_code and p.user_id=v_id and p.active) then
    raise exception 'Ya no estás en esta sala.' using errcode='42501';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',p.user_id,'name',p.name,'avatar',p.avatar,'ready',p.ready,
    'online',p.last_seen>clock_timestamp()-interval '60 seconds','submitted',exists(select 1 from game_private.entries e where e.room_code=v_code and e.player_id=p.user_id and e.round=r.round),'active',p.active) order by p.joined_at),'[]')
    into v_players from game_private.players p where p.room_code=v_code;
  if r.status='playing' and v_id=any(r.order_ids) then
    v_chain:=game_private.chain_for(r.order_ids,v_id,r.round);
    v_kind:=game_private.kind(r.settings->>'mode',r.round);
    select * into prev from game_private.entries e where e.room_code=v_code and e.chain_id=v_chain and e.round=r.round-1;
    v_task:=jsonb_build_object('kind',v_kind,'chainId',v_chain,'prompt',prev.text_value,'image',prev.image_value);
  end if;
  if include_albums and r.status in ('reveal','finished') then
    select coalesce(jsonb_agg(a.album order by a.pos),'[]') into v_albums from (
      select ord.pos,jsonb_build_object('id',ord.id,'author',coalesce(p.name,'Jugador'),
        'entries',coalesce((select jsonb_agg(jsonb_build_object('playerId',e.player_id,'name',ep.name,'kind',e.kind,
          'text',e.text_value,'image',e.image_value,'round',e.round) order by e.round)
          from game_private.entries e left join game_private.players ep on ep.room_code=v_code and ep.user_id=e.player_id
          where e.room_code=v_code and e.chain_id=ord.id),'[]')) as album
      from unnest(r.order_ids) with ordinality as ord(id,pos)
      left join game_private.players p on p.room_code=v_code and p.user_id=ord.id
    ) a;
  end if;
  return jsonb_build_object('code',r.code,'hostId',r.host_id,'status',r.status,'settings',r.settings,
    'players',v_players,'canClaimHost',r.host_id<>v_id and not exists(select 1 from game_private.players hp where hp.room_code=v_code and hp.user_id=r.host_id and hp.last_seen>clock_timestamp()-interval '60 seconds'),'round',r.round,'totalRounds',r.total_rounds,'deadline',r.deadline,
    'task',v_task,'albums',v_albums,'albumsIncluded',include_albums,'revealIndex',r.reveal_index,'reactions',r.reactions,'serverNow',clock_timestamp());
end $$;

create function public.game_action(code text,action text,payload jsonb default '{}') returns void
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
    if cardinality(v_order)<3 then raise exception 'Necesitan al menos tres jugadores.'; end if;
    if exists(select 1 from game_private.players p where p.room_code=v_code and p.active and not p.ready and p.user_id<>r.host_id) then
      raise exception 'Espera a que todos estén listos.';
    end if;
    update game_private.rooms set status='playing',round=0,order_ids=v_order,reveal_index=0,reactions='[]',
      total_rounds=case when r.settings->>'mode'='icebreaker' then 2 else cardinality(v_order)+(cardinality(v_order)%2) end,
      deadline=clock_timestamp()+make_interval(secs=>game_private.effective_seconds(r.settings)) where game_private.rooms.code=v_code;
  when 'submit' then
    if r.status<>'playing' then raise exception 'Esta ronda ya terminó.'; end if;
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
    update game_private.rooms set status='lobby',round=0,total_rounds=0,deadline=null,order_ids='{}',reveal_index=0,reactions='[]'
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

-- Public RPC access is explicit. No anonymous multiplayer access and no private helper grants.
revoke all on all functions in schema game_private from public,anon,authenticated;
revoke all on function public.game_can_read_event(text), public.game_create(jsonb,text,text),
  public.game_join(text,text,text),public.game_state(text,boolean),public.game_action(text,text,jsonb) from public,anon;
grant execute on function public.game_can_read_event(text), public.game_create(jsonb,text,text),
  public.game_join(text,text,text),public.game_state(text,boolean),public.game_action(text,text,jsonb) to authenticated;

-- Realtime carries only an invalidation counter, never answers or drawings.
do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    alter publication supabase_realtime add table public.room_events;
  end if;
end $$;
commit;
