begin;
insert into auth.users(id,is_anonymous) select ('20000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,true from generate_series(1,4)n;
create function pg_temp.guest(n integer) returns void language plpgsql as $$ begin perform set_config('request.jwt.claims',jsonb_build_object('sub','20000000-0000-0000-0000-'||lpad(n::text,12,'0'),'role','authenticated','is_anonymous',true)::text,true); end $$;
do $$
declare c text;s jsonb;i integer;j integer;
begin
 perform pg_temp.guest(1);c:=public.game_create('{"maxPlayers":3,"seconds":30}','Host','🍕');
 if length(c)<>12 then raise exception 'Expected strong invitation code';end if;
 for i in 2..3 loop perform pg_temp.guest(i);perform public.game_join(c,'Guest '||i,'🥑');perform public.game_action(c,'ready','{"ready":true}');end loop;
 perform pg_temp.guest(4);
 if public.game_can_read_event(c) then raise exception 'Outsider read event';end if;
 begin perform public.game_state(c);raise exception 'Outsider read state';exception when insufficient_privilege then null;end;
 perform pg_temp.guest(1);perform public.game_action(c,'start');
 for j in 0..3 loop for i in 1..3 loop
 perform pg_temp.guest(i);s:=public.game_state(c);
 if s->'albums'<>'[]'::jsonb then raise exception 'Answers leaked';end if;
 perform public.game_action(c,'submit',jsonb_build_object('round',j,'gameId',s->>'gameId')||case when j%2=0 then jsonb_build_object('text','Una idea') else jsonb_build_object('image','data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jDgoAAAAASUVORK5CYII=') end);
 end loop;end loop;
 if public.game_state(c)->>'status'<>'reveal' then raise exception 'Guest chain failed';end if;
 perform set_config('request.jwt.claims','{}',true);
 begin perform public.game_state(c);raise exception 'Missing session accepted';exception when invalid_authorization_specification then null;end;
end $$;
rollback;
