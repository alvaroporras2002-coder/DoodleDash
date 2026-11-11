-- Run only in a disposable Supabase project after the migration, as project owner.
-- No real Google accounts or external network requests are made.
begin;
create function pg_temp.check_true(ok boolean,message text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL: %',message; end if; end $$;
create function pg_temp.as_user(n integer) returns void language plpgsql as $$
begin perform set_config('request.jwt.claims',jsonb_build_object('sub',('10000000-0000-0000-0000-'||lpad(n::text,12,'0')),'role','authenticated')::text,true); end $$;
do $$ begin execute format('grant usage on schema %I to authenticated',(select nspname from pg_namespace where oid=pg_my_temp_schema())); end $$;
insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,aud,role)
select ('10000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,
  'doodledash-fixture-'||n||'@'||case when n=5 then 'unapproved.invalid' else 'doordash.com' end,
  now(),case when n=6 then '{"provider":"email"}'::jsonb else '{"provider":"google","providers":["google"]}'::jsonb end,'{}','authenticated','authenticated'
from generate_series(1,6) n;

create temporary table fixture(code text);
do $$
declare c text; s jsonb; i integer; j integer; v_version bigint;
  png text:='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jDgoAAAAASUVORK5CYII=';
begin
  perform pg_temp.as_user(1);
  c:=public.game_create('{"mode":"classic","seconds":15,"maxPlayers":3}','Uno','🎨');
  insert into fixture values(c);
  for i in 2..3 loop
    perform pg_temp.as_user(i);
    perform public.game_join(c,'Persona '||i,'🎨');
    perform public.game_action(c,'ready','{"ready":true}');
  end loop;
  begin
    perform public.game_action(c,'settings','{"seconds":180}');
    raise exception 'FAIL: nonhost changed settings';
  exception when insufficient_privilege then null; end;
  perform pg_temp.as_user(4);
  begin
    perform public.game_state(c); raise exception 'FAIL: outsider read game';
  exception when insufficient_privilege then null; end;
  perform pg_temp.as_user(5);
  begin
    perform public.game_create('{}','Intruso','🎨'); raise exception 'FAIL: foreign domain created game';
  exception when insufficient_privilege then null; end;
  perform pg_temp.as_user(6);
  begin
    perform public.game_create('{}','No Google','🎨'); raise exception 'FAIL: non-Google account created game';
  exception when invalid_authorization_specification then null; end;
  perform pg_temp.as_user(1);
  perform public.game_action(c,'start');
  s:=public.game_state(c);
  perform pg_temp.check_true(s->>'status'='playing','start');
  perform pg_temp.check_true((s->>'totalRounds')::int=4,'odd roster ends with drawing');
  perform pg_temp.check_true(s->'albums'='[]'::jsonb,'histories hidden during game');
  for i in 1..3 loop
    perform pg_temp.as_user(i);
    perform public.game_action(c,'submit',jsonb_build_object('round',0,'text','Frase '||i));
  end loop;
  s:=public.game_state(c);
  perform pg_temp.check_true((s->>'round')::int=1,'all submissions advance');
  perform pg_temp.check_true(s#>>'{task,kind}'='draw','draw follows phrase');
  perform pg_temp.check_true(s#>>'{task,prompt}'='Frase 2','deterministic rotation to previous chain');
  begin
    perform public.game_action(c,'submit','{"round":0,"text":"late"}');
    raise exception 'FAIL: stale submission accepted';
  exception when raise_exception then
    if SQLERRM like 'FAIL:%' then raise; end if;
  end;
  perform pg_temp.check_true(not exists(select 1 from game_private.entries where room_code=c and round=1),'stale submit writes nothing');
  for j in 1..3 loop
    for i in 1..3 loop
      perform pg_temp.as_user(i);
      perform public.game_action(c,'submit',case when j%2=1 then jsonb_build_object('round',j,'image',png)
        else jsonb_build_object('round',j,'text','Descripción '||i) end);
    end loop;
  end loop;
  s:=public.game_state(c);
  perform pg_temp.check_true(s->>'status'='reveal','final round opens reveal');
  perform pg_temp.check_true(jsonb_array_length(s->'albums')=3,'one album per participant');
  perform pg_temp.check_true(jsonb_array_length(s#>'{albums,0,entries}')=4,'all album entries preserved');
  perform pg_temp.check_true(public.game_state(c,false)->'albums'='[]'::jsonb,'lightweight refresh omits cached images');
  perform pg_temp.as_user(1);
  for j in 1..11 loop perform public.game_action(c,'reveal_next'); end loop;
  s:=public.game_state(c);
  perform pg_temp.check_true((s->>'revealIndex')::int=11 and s->>'status'='reveal','flattened reveal index');
  perform public.game_action(c,'reveal_next');
  perform pg_temp.check_true(public.game_state(c)->>'status'='finished','last reveal completes');
  perform public.game_action(c,'restart');
  perform pg_temp.check_true(not exists(select 1 from game_private.entries where room_code=c),'restart clears old answers');
  for i in 2..3 loop perform pg_temp.as_user(i); perform public.game_action(c,'ready','{"ready":true}'); end loop;
  perform pg_temp.as_user(1); perform public.game_action(c,'start');
  update game_private.rooms set deadline=now()-interval '1 second' where code=c;
  perform pg_temp.as_user(2); perform public.game_action(c,'tick');
  perform pg_temp.check_true((public.game_state(c)->>'round')::int=1,'nonhost advances deadline');
  perform pg_temp.check_true((select count(*) from game_private.entries where room_code=c and round=0)=3,'expired tasks get placeholders');
  -- A live host cannot be displaced; an offline host stays in the roster after recovery.
  begin
    perform public.game_action(c,'claim_host'); raise exception 'FAIL: displaced live host';
  exception when raise_exception then if SQLERRM like 'FAIL:%' then raise; end if; end;
  update game_private.players set last_seen=clock_timestamp()-interval '61 seconds' where room_code=c and user_id='10000000-0000-0000-0000-000000000001';
  perform pg_temp.check_true((public.game_state(c)->>'canClaimHost')::boolean,'offline host can be recovered');
  perform public.game_action(c,'claim_host');
  perform pg_temp.check_true(public.game_state(c)->>'hostId'='10000000-0000-0000-0000-000000000002','claim host succeeds');
  perform pg_temp.check_true((select active from game_private.players where room_code=c and user_id='10000000-0000-0000-0000-000000000001'),'old host is not kicked');
  select version into v_version from public.room_events where code=c;
  perform pg_temp.as_user(1); perform public.game_action(c,'heartbeat');
  perform pg_temp.check_true((select version from public.room_events where code=c)=v_version,'heartbeat does not broadcast');
  update game_private.players set last_seen=clock_timestamp()-interval '61 seconds' where room_code=c and user_id='10000000-0000-0000-0000-000000000002';
  perform public.game_action(c,'claim_host');
  perform public.game_action(c,'leave');
  perform pg_temp.as_user(2);
  perform pg_temp.check_true(public.game_state(c)->>'hostId'='10000000-0000-0000-0000-000000000002','leaving host transfers control');
  perform public.game_action(c,'kick','{"playerId":"10000000-0000-0000-0000-000000000003"}');
  perform pg_temp.as_user(3);
  begin
    perform public.game_join(c,'Otra vez','🎨'); raise exception 'FAIL: kicked player rejoined';
  exception when insufficient_privilege then null; end;
  perform pg_temp.as_user(2);
end $$;

select pg_temp.check_true(not has_table_privilege('authenticated','game_private.entries','select'),'no direct answer reads');
select pg_temp.check_true(not has_function_privilege('anon','public.game_state(text,boolean)','execute'),'anonymous RPC blocked');
select pg_temp.check_true(not has_function_privilege('authenticated','game_private.advance(text)','execute'),'private helper blocked');

-- Check real RLS as the browser role, including outsider isolation.
select pg_temp.as_user(2);
set local role authenticated;
select pg_temp.check_true((select count(*) from public.room_events)=1,'member sees their event row');
reset role;
select pg_temp.as_user(4);
set local role authenticated;
select pg_temp.check_true((select count(*) from public.room_events)=0,'outsider sees no event rows');
reset role;

-- Verify mode-specific assignment without leaving rooms behind.
do $$
declare m text; c text; i integer; expected integer; duration integer;
begin
  foreach m in array array['speed','masterpiece','memory','animation','copy','icebreaker'] loop
    perform pg_temp.as_user(1);
    c:=public.game_create(jsonb_build_object('mode',m,'seconds',15,'maxPlayers',3),'Uno','🎨');
    for i in 2..3 loop
      perform pg_temp.as_user(i); perform public.game_join(c,'Persona '||i,'🎨');
      perform public.game_action(c,'ready','{"ready":true}');
    end loop;
    perform pg_temp.as_user(1); perform public.game_action(c,'start');
    expected:=case when m='icebreaker' then 2 else 4 end;
    perform pg_temp.check_true((public.game_state(c)->>'totalRounds')::int=expected,'round count for '||m);
    perform pg_temp.check_true(game_private.kind(m,2)=case when m in ('speed','masterpiece') then 'describe' else 'draw' end,'task kind for '||m);
    duration:=case when m='masterpiece' then 30 else 15 end;
    perform pg_temp.check_true(abs(extract(epoch from ((public.game_state(c)->>'deadline')::timestamptz-clock_timestamp()))-duration)<1,'initial duration for '||m);
    update game_private.rooms set deadline=now()-interval '1 second' where code=c;
    perform public.game_action(c,'tick');
    perform pg_temp.check_true(abs(extract(epoch from ((public.game_state(c)->>'deadline')::timestamptz-clock_timestamp()))-duration)<1,'next round duration for '||m);
    delete from game_private.rooms where code=c;
  end loop;
end $$;
select pg_temp.check_true(game_private.effective_seconds('{"mode":"speed","seconds":90}')=45,'speed halves time');
select pg_temp.check_true(game_private.effective_seconds('{"mode":"masterpiece","seconds":120}')=180,'masterpiece caps time');
rollback;
