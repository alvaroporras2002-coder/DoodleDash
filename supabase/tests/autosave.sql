begin;
insert into auth.users(id,is_anonymous) select ('50000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,true from generate_series(1,3)n;
create function pg_temp.writer(n integer) returns void language plpgsql as $$ begin perform set_config('request.jwt.claims',jsonb_build_object('sub','50000000-0000-0000-0000-'||lpad(n::text,12,'0'),'role','authenticated','is_anonymous',true)::text,true);end $$;
do $$
declare c text;s jsonb;m text;i integer;round_no integer;gid uuid;png text:='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jDgoAAAAASUVORK5CYII=';accepted boolean;denied boolean;
begin
 foreach m in array array['classic','speed','masterpiece','memory','animation','copy','icebreaker'] loop
 perform pg_temp.writer(1);c:=public.game_create(jsonb_build_object('mode',m,'maxPlayers',2,'seconds',180),'Host','🎨');
 perform pg_temp.writer(2);perform public.game_join(c,'Partner','🌙');perform public.game_action(c,'ready','{"ready":true}');
 perform pg_temp.writer(1);perform public.game_action(c,'start');s:=public.game_state(c);gid:=(s->>'gameId')::uuid;
 perform pg_temp.writer(3);denied:=false;
 begin perform public.game_save_draft(c,gid,0,'{"text":"outsider"}');exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Outsider saved draft';end if;
 for round_no in 0..1 loop
  for i in 1..2 loop
   perform pg_temp.writer(i);
   if round_no=0 then
    perform public.game_save_draft(c,gid,round_no,'{"text":"First version"}');
    accepted:=public.game_save_draft(c,gid,round_no,'{"text":"Latest saved phrase"}');
   else accepted:=public.game_save_draft(c,gid,round_no,jsonb_build_object('image',png));end if;
   if not accepted then raise exception 'Draft rejected: %',m;end if;
   s:=public.game_state(c);
   if s->>'status'<>'playing' or s->'albums'<>'[]'::jsonb then raise exception 'Draft ended round or exposed history';end if;
  end loop;
  if (select count(*) from game_private.entries where room_code=c and round=round_no)<>0 then raise exception 'Draft marked as submitted';end if;
  update game_private.rooms set deadline=clock_timestamp()-interval '1 second' where code=c;
  if public.game_save_draft(c,gid,round_no,'{"text":"Too late"}') then raise exception 'Expired draft accepted';end if;
  perform pg_temp.writer(1);perform public.game_action(c,'tick');
 end loop;
 if (select count(*) from game_private.entries where room_code=c and text_value='Latest saved phrase')<>2 then raise exception 'Phrase lost at timeout: %',m;end if;
 if (select count(*) from game_private.entries where room_code=c and image_value=png)<>2 then raise exception 'Drawing lost at timeout: %',m;end if;
 if public.game_state(c)->>'status'<>'reveal' then raise exception 'Timeout game did not reveal';end if;
 if public.game_save_draft(c,gid,0,'{"text":"Old round"}') then raise exception 'Old draft accepted';end if;
 perform pg_temp.writer(2);perform public.game_action(c,'leave');perform pg_temp.writer(1);perform public.game_action(c,'leave');
 end loop;
 if has_table_privilege('authenticated','game_private.drafts','SELECT') or has_function_privilege('anon','public.game_save_draft(text,uuid,integer,jsonb)','EXECUTE') then raise exception 'Draft access leaked';end if;
end $$;
rollback;
