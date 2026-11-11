# Videollamada opcional para hasta 20 jugadores

La partida funciona aunque nadie entre a la llamada. Cada persona elige **Entrar a la llamada**, y empieza escuchando, con cámara y micrófono apagados. Los permisos del navegador se piden únicamente al activar cada dispositivo. Salir de la llamada no abandona la partida.

## Qué está implementado

- LiveKit SFU distribuye los medios: cada equipo publica una cámara, en vez de enviar 19 copias a los otros jugadores.
- Límite de 20 participantes por sala configurado en el servidor de medios. Las salas nuevas del juego admiten 20 por defecto; en una sala anterior el anfitrión puede cambiar Máximo de jugadores a 20 antes de comenzar.
- Cámara inicial de 320×180 a 15 fps, capas simulcast y calidad adaptable. Seis cámaras por página por defecto; Ver a todos permite una galería de hasta 20.
- Solo se suscriben los videos visibles. Al minimizar el panel se dejan de recibir cámaras, pero sigue el audio. Minimizar **no apaga la cámara que tú publicas**: ese control es independiente.
- Panel flotante durante las rondas para ver reacciones al dibujar. Se mueve arrastrando el asa o con las flechas del teclado al enfocarla; también se puede fijar en la página.
- Sin compartir pantalla, chat multimedia ni grabación del juego. Los dibujos no se envían al proveedor de videollamadas.
- Sesiones temporales de acceso, vinculadas al UUID de invitado y la membresía real de la sala. Las credenciales de LiveKit permanecen en Cloudflare.

## 1. Aplicar el nuevo SQL

En el Supabase existente, ejecuta **solo** `supabase/migrations/202611110003_video_access.sql`. Las migraciones 001 y 002 ya aplicadas se conservan. La 003 añade la función de admisión y un límite de frecuencia por jugador, sin borrar partidas.

## 2. Crear un proyecto de LiveKit Cloud gratuito

1. Abre https://cloud.livekit.io/ y crea una cuenta que puedas administrar.
2. Crea un proyecto en el plan **Build ($0)**. No actives planes de pago ni actualizaciones de plan. Si la pantalla ofrece un plan distinto o pide una contratación, detente y revísalo antes de continuar.
3. Obtén la URL WebSocket del proyecto (`wss://…livekit.cloud`), una API key y su API secret desde el panel de API Keys del proyecto.
4. No pegues el secret en GitHub, en el chat ni en una variable que empiece con `VITE_`.

No hacen falta agentes de IA, Google Cloud, grabadores, números de teléfono ni un servidor propio. El proveedor de medios es un servicio externo independiente del hosting de la web.

## 3. Configurar Cloudflare Pages

En tu proyecto DoodleDash → Settings → Variables and Secrets, añade en **Production**:

| Nombre | Tipo / valor |
| --- | --- |
| `LIVEKIT_URL` | Texto: URL `wss://…livekit.cloud` |
| `LIVEKIT_API_KEY` | Secret/encriptado: API key de LiveKit |
| `LIVEKIT_API_SECRET` | Secret/encriptado: API secret de LiveKit |
| `VIDEO_ENABLED` | Texto: `true` |

Conserva `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`: son la conexión pública que la función del servidor también utiliza. No hace falta service_role.

Haz merge del PR y crea un nuevo despliegue de producción con esas variables. Pages detecta `functions/api/video.ts` y publica `/api/video`; el frontend sigue compilando con `npm run build` y la salida sigue siendo `dist`. `_routes.json` limita las invocaciones de Functions a ese endpoint. Los recursos estáticos conservan su ruta habitual.

El código necesita **Pages Functions**, no una simple carga manual de dist. Revisa el resultado de compilación de Functions en Cloudflare. Usar solo `vite preview` local no ejecuta el endpoint: sirve únicamente para probar la interfaz y el juego; para el backend usa Pages Functions en un despliegue de prueba.

Para apagar la función, cambia `VIDEO_ENABLED` a `false` y vuelve a desplegar; impide nuevos accesos y los clientes normales salen tras sus siguientes comprobaciones. Para detener inmediatamente todas las sesiones, usa el panel de LiveKit. La partida no necesita la llamada.

## 4. Cuotas de costo cero (comprobadas el 11 de noviembre de 2026)

LiveKit Build incluye 100 participantes simultáneos **entre todas las salas del proyecto**, 5.000 minutos de participante y 50 GB de transferencia saliente mensuales. En Build son topes, no consumo ilimitado: al agotar cuotas, nuevas solicitudes fallan. Mantén el plan Build para no habilitar cobros por excedentes. Cloudflare y Supabase tienen sus propias cuotas gratuitas.

| Uso de una sala con 20 personas | Minutos de participante |
| --- | ---: |
| 30 minutos | 600 |
| 60 minutos | 1.200 |
| Cuatro sesiones de una hora | 4.800 |

**La transferencia puede agotarse antes que los minutos.** No se garantizan cuatro sesiones: depende de cámaras activas, tamaño de galería, codecs y conexión. Incluso escuchar sin cámara consume minutos mientras la persona esté conectada. Usa páginas de seis cámaras, video ligero y desconecta la llamada cuando termine. Revisa el contador de uso antes de cada encuentro. El código no cambia planes ni contrata recursos automáticamente.

Fuentes oficiales:
- https://docs.livekit.io/deploy/admin/quotas-and-limits/
- https://docs.livekit.io/deploy/admin/billing/
- https://developers.cloudflare.com/pages/functions/bindings/

## 5. Validación real antes de invitar al equipo

Las pruebas automáticas cubren autorización, límite de 20, JWT restringidos, expulsión, configuración ausente y que la interfaz no solicite dispositivos automáticamente. **No equivalen a una videollamada real con 20 cámaras.**

1. Verifica el acceso con 3 personas en navegadores/perfiles distintos, con la web desplegada por HTTPS.
2. Una persona juega sin entrar a la llamada: debe completar todas las rondas. Otra entra solo a escuchar. La tercera activa cámara y micrófono por separado.
3. Comprueba voz, silencio, cámara apagada, permisos denegados y volver a entrar; no debe interrumpirse el juego.
4. Recarga una pestaña: la partida se recupera, pero la llamada requiere pulsar Entrar nuevamente. Los dispositivos no se reactivan automáticamente.
5. Prueba con 10 y luego 20 personas, durante al menos una ronda y una revelación. Comprueba páginas de cámaras, galería y panel flotante mientras dibujan.
6. Prueba una red distinta. La conectividad de LiveKit incluye su infraestructura de retransmisión, pero ninguna integración puede eliminar bloqueos de dispositivos o redes corporativas. Si el navegador impide cámara/micrófono, se puede seguir jugando sin ellos.
7. Verifica una expulsión: el anfitrión solicita limpieza de medios y los clientes conectados revalidan membresías cada 30 segundos. No se promete revocación instantánea. Los tokens de admisión duran 120 segundos; esa expiración limita entrar, no la duración de una llamada ya conectada. La retirada del participante en el servicio de medios controla sesiones existentes.
8. Comprueba consumo del plan Build después de la prueba. Haz la aceptación con el tamaño real de tu equipo antes de anunciar capacidad comprobada.

No se incluyen secretos, credenciales demo ni claves de prueba en producción. Sin configurar el servicio se muestra un mensaje claro; el juego permanece utilizable.
