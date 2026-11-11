begin;
do $$
declare message text;
begin
 begin perform game_private.clean_settings('{"maxPlayers":1}');exception when others then get stacked diagnostics message = MESSAGE_TEXT;end;
 if message <> 'Choose 15 to 180 seconds and 2 to 20 players.' then raise exception 'Settings error not in English: %',message;end if;
 if pg_get_functiondef('game_private.advance(text)'::regprocedure) like '%[Sin respuesta]%' then raise exception 'Timeout placeholder still in Spanish';end if;
 if not has_function_privilege('authenticated','public.game_action(text,text,jsonb)','EXECUTE') then raise exception 'RPC access changed';end if;
 if has_function_privilege('anon','public.game_action(text,text,jsonb)','EXECUTE') then raise exception 'Anonymous RPC access changed';end if;
end $$;
rollback;
