begin;
insert into auth.users(id,is_anonymous) select ('40000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,true from generate_series(1,3)n;
create function pg_temp.duo(n integer) returns void language plpgsql as $$ begin perform set_config('request.jwt.claims',jsonb_build_object('sub','40000000-0000-0000-0000-'||lpad(n::text,12,'0'),'role','authenticated','is_anonymous',true)::text,true); end $$;
do $$
declare c text;s jsonb;m text;i integer;j integer;rejected boolean;
begin
 foreach m in array array['classic','speed','masterpiece','memory','animation','copy','icebreaker'] loop
 perform pg_temp.duo(1);
 c:=public.game_create(jsonb_build_object('mode',m,'maxPlayers',2,'seconds',180),'Host','🍕');
 rejected:=false;
 begin perform public.game_action(c,'start');exception when others then rejected:=true;end;
 if not rejected then raise exception 'Solo start accepted: %',m;end if;
 perform pg_temp.duo(2);perform public.game_join(c,'Partner','🥑');
 perform pg_temp.duo(1);rejected:=false;
 begin perform public.game_action(c,'start');exception when others then rejected:=true;end;
 if not rejected then raise exception 'Unready partner accepted: %',m;end if;
 perform pg_temp.duo(3);rejected:=false;
 begin perform public.game_join(c,'Third','🎨');exception when others then rejected:=true;end;
 if not rejected then raise exception 'Capacity two not enforced: %',m;end if;
 perform pg_temp.duo(2);perform public.game_action(c,'ready','{"ready":true}');
 perform pg_temp.duo(1);perform public.game_action(c,'start');
 s:=public.game_state(c);
 if s->>'status'<>'playing' or (s->>'totalRounds')::integer<>2 then raise exception 'Duo did not start: %',m;end if;
 for j in 0..1 loop for i in 1..2 loop
 perform pg_temp.duo(i);s:=public.game_state(c);
 if s->'albums'<>'[]'::jsonb then raise exception 'Answers leaked: %',m;end if;
 perform public.game_action(c,'submit',jsonb_build_object('round',j,'gameId',s->>'gameId')||
 case when s->'task'->>'kind'='draw' then jsonb_build_object('image','data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jDgoAAAAASUVORK5CYII=') else jsonb_build_object('text','Una idea para dos') end);
 end loop;end loop;
 s:=public.game_state(c);
 if s->>'status'<>'reveal' or jsonb_array_length(s->'albums')<>2 then raise exception 'Duo reveal failed: %',m;end if;
 perform pg_temp.duo(1);
 for j in 1..4 loop perform public.game_action(c,'reveal_next');end loop;
 if public.game_state(c)->>'status'<>'finished' then raise exception 'Duo finish failed: %',m;end if;
 perform public.game_action(c,'restart');
 if public.game_state(c)->>'status'<>'lobby' then raise exception 'Duo restart failed: %',m;end if;
 perform pg_temp.duo(2);perform public.game_action(c,'leave');
 perform pg_temp.duo(1);perform public.game_action(c,'leave');
 end loop;
 rejected:=false;
 begin perform game_private.clean_settings('{"maxPlayers":1}');exception when others then rejected:=true;end;
 if not rejected then raise exception 'Capacity one accepted';end if;
end $$;
rollback;
