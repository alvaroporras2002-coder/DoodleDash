-- English system messages only. Does not translate or change player-created content.
begin;
do $english$
declare
  fn record; original text; translated text; item record;
  messages jsonb := $messages${"Inicia sesión con Google.":"Sign in with Google.","Se requiere una cuenta verificada de Google.":"A verified Google account is required.","Tu dominio de correo no está autorizado para este equipo.":"Your email domain is not authorized for this team.","Modo no válido.":"Invalid mode.","Configura entre 15 y 180 segundos y entre 3 y 20 jugadores.":"Choose 15 to 180 seconds and 3 to 20 players.","[Sin respuesta]":"[No response]","Usa un apodo de 1 a 24 caracteres.":"Use a nickname of 1 to 24 characters.","Ya tienes cinco salas abiertas. Termina o abandona alguna antes de crear otra.":"You already have five open rooms. Finish or leave one before creating another.","No encontramos esa sala. Revisa el código.":"Room not found. Check the code.","El anfitrión te retiró de esta sala.":"The host removed you from this room.","La partida ya comenzó. Espera a la siguiente.":"The game has already started. Wait for the next one.","La sala está llena.":"The room is full.","La sala ya no existe.":"The room no longer exists.","Ya no estás en esta sala.":"You are no longer in this room.","Solo el anfitrión puede hacer esto.":"Only the host can do this.","El anfitrión sigue conectado. Espera un minuto sin actividad antes de recuperar el control.":"The host is still connected. Wait one minute without activity before taking over.","La partida ya comenzó.":"The game has already started.","La configuración está bloqueada durante la partida.":"Settings are locked during the game.","La capacidad no puede ser menor que el número de jugadores.":"Capacity cannot be lower than the current player count.","Necesitan al menos tres jugadores.":"At least three players are required.","Espera a que todos estén listos.":"Wait until everyone is ready.","Esta ronda ya terminó.":"This round has already ended.","Esta partida ya terminó. Actualiza tu sala.":"This game has already ended. Refresh your room.","Esta ronda ya terminó. Actualiza tu partida.":"This round has already ended. Refresh your game.","No participas en esta partida.":"You are not playing in this game.","El dibujo debe ser PNG o WebP y pesar menos de 450 KiB.":"The drawing must be a PNG or WebP smaller than 450 KiB.","Escribe entre 1 y 240 caracteres.":"Write between 1 and 240 characters.","No hay un álbum en presentación.":"There is no album being revealed.","Termina la partida antes de volver a empezar.":"Finish the game before starting again.","Usa salir para abandonar la sala.":"Use leave to exit the room.","Las reacciones se abren al revelar los álbumes.":"Reactions open when albums are revealed.","Reacción no válida.":"Invalid reaction.","Acción no válida.":"Invalid action.","Entra con tu apodo para obtener una sesión de invitado.":"Enter your nickname to create a guest session.","No participas en esta sala.":"You are not a member of this room.","Espera cinco segundos antes de volver a entrar a la llamada.":"Wait five seconds before rejoining the call.","Configura entre 15 y 180 segundos y entre 2 y 20 jugadores.":"Choose 15 to 180 seconds and 2 to 20 players.","Necesitan al menos dos jugadores.":"At least two players are required."}$messages$::jsonb;
begin
  for fn in
    select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where p.prokind='f' and (n.nspname='game_private' or (n.nspname='public' and p.proname like 'game_%'))
  loop
    original := pg_get_functiondef(fn.oid);
    translated := original;
    for item in select key,value from jsonb_each_text(messages) loop
      translated := replace(translated,quote_literal(item.key),quote_literal(item.value));
    end loop;
    if translated <> original then execute translated; end if;
  end loop;
end $english$;
commit;
