begin;
insert into auth.users(id,is_anonymous) select ('30000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,true from generate_series(1,21)n;
create function pg_temp.as_video_user(n integer) returns void language plpgsql as $$ begin perform set_config('request.jwt.claims',jsonb_build_object('sub','30000000-0000-0000-0000-'||lpad(n::text,12,'0'),'role','authenticated')::text,true);end $$;
do $$
declare c text;v jsonb;i integer;
begin
 perform pg_temp.as_video_user(1);c:=public.game_create('{"maxPlayers":20}','Host','🍕');
 for i in 2..20 loop perform pg_temp.as_video_user(i);perform public.game_join(c,'Invitado '||i,'🥑');end loop;
 v:=public.game_video_access(c,true);
 if jsonb_array_length(v->'members')<>20 or (v->>'capacity')::int<>20 then raise exception 'Video must support exactly twenty members';end if;
 if v?'task' or v?'albums' then raise exception 'Video admission leaked drawings';end if;
 begin perform public.game_video_access(c,true);raise exception 'FAIL: no admission rate limit';exception when raise_exception then if SQLERRM like 'FAIL:%' then raise;end if;end;
 perform pg_temp.as_video_user(21);
 begin perform public.game_join(c,'Extra','🥑');raise exception 'FAIL: twenty-first player admitted';exception when raise_exception then if SQLERRM like 'FAIL:%' then raise;end if;end;
 begin perform public.game_video_access(c);raise exception 'FAIL: outsider admitted to call';exception when insufficient_privilege then null;end;
 perform pg_temp.as_video_user(1);perform public.game_action(c,'kick',jsonb_build_object('playerId','30000000-0000-0000-0000-000000000020'));
 perform pg_temp.as_video_user(20);
 begin perform public.game_video_access(c);raise exception 'FAIL: kicked member got video access';exception when insufficient_privilege then null;end;
 if has_function_privilege('anon','public.game_video_access(text,boolean)','execute') then raise exception 'Public role can get call access';end if;
end $$;
rollback;
