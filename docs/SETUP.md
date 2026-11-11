# Activar DoodleDash con el equipo

El repositorio contiene la aplicación y el motor multijugador. Hacer merge publica código, **no crea ni configura los servicios externos**. La práctica local funciona sin cuentas; las salas compartidas requieren completar estos pasos. No se incluyen secretos en el repositorio.

## 1. Crear Supabase Free

1. Crea una cuenta en https://supabase.com/ y un proyecto en el plan **Free**. Guarda la contraseña de la base de datos fuera de GitHub.
2. En **SQL Editor**, ejecuta el contenido completo de `supabase/migrations/202611110001_game.sql` una sola vez. Si falla, la transacción completa se revierte. No ejecutes fragmentos sueltos.
3. En **Project Settings → API**, copia la URL del proyecto y su **publishable key** (o la clave pública `anon` del formato anterior). No uses `service_role`, una secret key o la contraseña de la base de datos en el navegador.
4. Comprueba que `public.room_events` está habilitada en la publicación `supabase_realtime`. La migración la añade cuando la publicación existe.

Por defecto, el servidor permite Google con los dominios **doordash.com** y **ext.doordash.com**. Configura solo los dominios que el equipo realmente utiliza, desde SQL Editor, por ejemplo:

```sql
-- Ejemplo: permitir otro dominio de tu empresa.
insert into public.allowed_domains(domain) values ('miempresa.com');
-- Ejemplo: retirar un dominio que no corresponde.
delete from public.allowed_domains where domain = 'ext.doordash.com';
```

La lista del cliente es una ayuda visual; la lista de la base de datos es la autorización real. No añadas `gmail.com` para una sala restringida a empleados: permitiría todas las cuentas de ese dominio. No hacen falta tablas públicas con nombres, correos, respuestas o dibujos.

## 2. Configurar Google OAuth

1. Abre https://console.cloud.google.com/ y crea/selecciona un proyecto para este juego.
2. Configura **Google Auth Platform / OAuth consent screen**: nombre DoodleDash, correo de soporte y únicamente los permisos básicos `openid`, `email` y `profile`.
3. Si el proyecto pertenece a la organización de Google Workspace y tienes permiso, puedes seleccionar audiencia **Internal**. Con una cuenta personal no se puede asumir que esa opción estará disponible; selecciona el tipo disponible y agrega a los compañeros como usuarios de prueba mientras la app esté en Testing.
4. Crea un cliente OAuth de tipo **Web application**. En **Authorized redirect URIs**, pega exactamente la URL de callback que muestra Supabase en **Authentication → Sign In / Providers → Google**, normalmente `https://TU_PROYECTO.supabase.co/auth/v1/callback`.
5. Activa Google en Supabase y guarda allí el **Client ID** y el **Client secret** de Google. El secreto nunca se pega en el código ni en Cloudflare como variable `VITE_`.
6. En Supabase **Authentication → URL Configuration**, configura el **Site URL** como la futura dirección de Cloudflare y agrega esa dirección a **Redirect URLs**. Para desarrollo local puedes agregar `http://localhost:5173`.
7. Desactiva otros proveedores si no se usarán. El servidor de DoodleDash exige una identidad cuyo proveedor sea Google, correo confirmado y dominio autorizado, aunque alguien intente llamar las RPC directamente.

**Las cuentas corporativas pueden tener bloqueadas las aplicaciones OAuth externas.** Si Google muestra “Access blocked” o requiere aprobación, la persona administradora de Workspace debe aprobar la aplicación. Un correo con dominio DoorDash no concede permisos de administración a este proyecto. La interfaz inspirada en colores rojo/blanco no implica integración oficial ni aprobación de DoorDash.

## 3. Variables públicas del proyecto

Copia `.env.example` a `.env.local` para desarrollo y usa las mismas variables en el despliegue:

```dotenv
VITE_SUPABASE_URL=https://TU_PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_CLAVE_PUBLICA
```

Usa los nombres exactos de `.env.example` si la versión del cliente introduce más opciones. Son datos públicos de conexión; el control de acceso lo aplican las funciones y RLS. No incluyas claves privilegiadas. `.env.local` debe permanecer ignorado por Git.

Para probar localmente:

```sh
npm install
npm run dev
```

Abre el puerto que indique Vite. Las personas que se conecten desde otro equipo necesitan el despliegue web y Supabase, no el `localhost` de otra computadora.

## 4. Publicar gratis en Cloudflare Pages

1. Crea una cuenta en https://dash.cloudflare.com/ sin activar servicios de pago.
2. En **Workers & Pages → Create → Pages → Connect to Git**, conecta GitHub y selecciona `DoodleDash`. Si la interfaz cambia, busca la creación de una aplicación Pages desde un repositorio Git.
3. Rama de producción: `main`. Comando de build: `npm run build`. Directorio de salida: `dist`.
4. Añade las variables públicas `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` antes del build. Los cambios de variables necesitan un nuevo despliegue.
5. Publica. Conserva el subdominio gratuito `pages.dev`; comprar un dominio no es necesario.
6. Copia la dirección final a **Site URL** y **Redirect URLs** en Supabase. Evita comodines amplios en producción y no autorices previews ajenas.
7. Prueba iniciar sesión desde esa dirección con una cuenta corporativa autorizada.

El flujo Google → callback Supabase → URL de la aplicación debe completar sin errores. Que funcione la práctica local no verifica OAuth ni multijugador real.

## 5. Prueba de aceptación con tres personas

Usa tres cuentas Google autorizadas, preferiblemente en tres computadoras; tres pestañas con la misma sesión representan a la misma persona.

- Una persona crea una sala; comparte código o enlace.
- Las otras dos entran, marcan Listo y ven la misma lista de participantes.
- El anfitrión configura modo y tiempo; los jugadores vuelven a marcar Listo si cambió la configuración.
- Comienzan juntos: cada jugador escribe una frase distinta, dibuja la que le toca y describe dibujos en el modo clásico.
- Verifica que no se ven historias ajenas durante la partida. La base de datos tampoco debe permitir consultar sus tablas privadas usando la clave pública.
- Deja vencer una ronda sin enviar: la siguiente debe empezar aunque el anfitrión cierre la pestaña.
- Recarga una pestaña: debe recuperar la misma identidad y tarea; un envío ya confirmado no debe duplicarse.
- Haz doble clic al enviar y simula una conexión lenta: la ronda esperada evita que una respuesta vieja se guarde en una nueva ronda.
- El anfitrión revela los pasos de los álbumes; las otras computadoras avanzan juntas. Comprueba las reacciones, descarga y volver a jugar.
- Al salir el anfitrión mediante el botón Salir, el primer participante activo recibe el control. Cerrar la pestaña conserva la sesión para poder reconectarse: no equivale a abandonar explícitamente. Después de 60 segundos sin latidos del anfitrión, otro miembro puede usar Recuperar control; el anfitrión anterior permanece en la partida.
- Una cuenta de otro dominio, un visitante anónimo o una persona fuera de la sala no debe poder consultar ni modificar la partida.

El servidor aplica mínimo de **3 jugadores** y máximo configurable de **20**; estos límites de producto no garantizan rendimiento de un plan gratuito. Haz primero una prueba con el tamaño de tu equipo.

## 6. Modos implementados por el motor

| Modo (`mode`) | Secuencia |
| --- | --- |
| Clásico (`classic`) | Frase → dibujo → descripción → dibujo, alternando |
| Exprés (`speed`) | Secuencia clásica con la mitad del tiempo base (mínimo 15 s) |
| Obra maestra (`masterpiece`) | Secuencia clásica con el doble del tiempo base (máximo 180 s) |
| Memoria (`memory`) | Frase inicial y luego dibujos del dibujo anterior; el cliente oculta la referencia tras la vista previa |
| Animación (`animation`) | Frase inicial y dibujos sucesivos; el cliente puede superponer la referencia anterior |
| Copia (`copy`) | Frase inicial y dibujos sucesivos con la referencia anterior disponible |
| Rompehielo (`icebreaker`) | Una frase por persona y un dibujo, dos rondas |

El tiempo base se fija entre **15 y 180 segundos**. Exprés aplica la mitad (mínimo 15 s) y Obra maestra el doble (máximo 180 s), tanto al iniciar como en las rondas siguientes. En modos de cadena completa, hay tantas rondas como jugadores si son pares, o una más si son impares; así la cadena termina en dibujo. Cada ronda entrega una tarea a cada participante. No se afirma equivalencia uno a uno con todos los modos, recursos, sonidos o funciones comerciales de Gartic Phone.

## 7. Límites gratuitos y mantenimiento

Supabase Free tiene cuotas de mensajes, conexiones, base de datos y transferencia; consulta los límites actuales en https://supabase.com/pricing antes de abrir el juego a grupos grandes. La implementación envía el dibujo terminado, **no cada movimiento del cursor**. Realtime anuncia cambios de sala y el cliente vuelve a consultar su estado autorizado. Las imágenes se limitan a 450 KiB por envío. Eliminar salas antiguas reduce almacenamiento, pero no devuelve transferencia consumida.

Las salas se eliminan tras 24 horas sin actividad cuando alguien crea otra sala. Para una eliminación periódica aunque nadie cree salas, programa desde Supabase (como dueño del proyecto) una tarea diaria de limpieza:

```sql
-- Opción manual desde SQL Editor; también sirve como comando de una tarea pg_cron.
delete from game_private.rooms where updated_at < now() - interval '24 hours';
```

Si activas `pg_cron`, agenda ese SQL como administrador. No expongas una función pública que permita borrar salas activas. Las tablas secundarias se eliminan en cascada. Reiniciar una sala elimina las respuestas de la partida anterior. Los jugadores pueden descargar los resultados antes de reiniciar. Evita compartir datos de clientes, información interna o credenciales en frases y dibujos.

Los proyectos gratuitos pueden pausarse por poca actividad. Antes de una actividad del equipo comprueba que Supabase esté activo y que el acceso corporativo siga autorizado. Mantén el proyecto en Free y revisa el consumo en el panel; no se puede garantizar servicio gratuito ilimitado o ininterrumpido.

## 8. Seguridad y contrato RPC

- Solo `game_create`, `game_join`, `game_state` y `game_action` cambian o devuelven estado de juego. Todas validan identidad y dominio en el servidor.
- Una fila bloqueada por sala serializa inicios, envíos, temporizadores y salidas. El cliente no decide asignaciones, autorías ni horas límite.
- `game_action('submit')` exige `payload.round` y `payload.gameId` para rechazar respuestas de rondas o partidas antiguas, incluso si la sala se reinició con el mismo código. Un segundo envío de la misma ronda no sobrescribe el primero.
- El esquema `game_private` no concede acceso a `anon` ni `authenticated`. Los permisos de anfitrión se verifican en cada operación.
- RLS de `room_events` solo permite leer el contador de una sala a sus miembros activos autorizados. Los eventos no contienen frases ni dibujos.
- `game_state(code, include_albums)` permite pedir metadatos con `include_albums=false` después de guardar los álbumes en caché. El snapshot incluye `gameId`, que cambia al reiniciar e iniciar otra partida: la caché debe usar esa identidad, no solo el código de sala. Si cambia `gameId` al reconectar directamente a una revelación, vuelve a consultar con `include_albums=true`. Descarga las imágenes una sola vez por partida; las reacciones y los pasos de revelación no necesitan retransmitirlas.
- Las respuestas completas solo se devuelven en estados `reveal` y `finished`; la presentación gradual es una experiencia compartida y no un mecanismo adicional de confidencialidad entre miembros durante la revelación.
- El cliente envía `game_action` con `action: 'heartbeat'` cada 15 segundos mientras está en una sala. Actualiza la presencia sin emitir eventos. El snapshot incluye `players[].online` y `canClaimHost`; `claim_host` solo permite tomar el control cuando han pasado 60 segundos sin actividad del anfitrión.
- Los temporizadores usan la hora del servidor. Cualquier miembro puede enviar `tick` tras vencer el plazo. Quien abandona no bloquea futuras rondas.
- No hay transcripción de voz ni IA; no requieren claves de pago. Las llamadas de voz pueden hacerse en la herramienta que ya utiliza el equipo.

Ejemplo de envío (cliente Supabase):

```ts
await supabase.rpc('game_action', {
  code: 'ABC123',
  action: 'submit',
  payload: { round: 1, gameId: estado.gameId, image: 'data:image/webp;base64,...' }
});
```

## 9. Verificar el motor en una base de datos de pruebas

`supabase/tests/game.sql` contiene pruebas transaccionales del flujo, los permisos, el aislamiento de tareas, la expiración y los envíos antiguos. Ejecútalo **solo en un proyecto de pruebas** como dueño del proyecto después de aplicar la migración. Se revierte al terminar. El archivo crea usuarios ficticios en `auth.users` para las pruebas, no cuentas Google utilizables.

```sh
psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/game.sql
```

No pongas `TEST_DATABASE_URL` en el código del navegador ni lo subas a GitHub. Estas pruebas no sustituyen la prueba real del proveedor Google, de las políticas de Workspace o de conexiones WebSocket entre equipos.
