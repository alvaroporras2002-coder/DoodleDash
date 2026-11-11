# DoodleDash ✦

Una pausa creativa para tu equipo: escribe, dibuja, interpreta y descubre cómo cambia la historia. Web en español con estética cálida, rojo coral, salas privadas y acceso con apodo y avatar. Proyecto independiente, sin afiliación oficial con DoorDash o Gartic.

## Lo que incluye

- Entrada como invitado mediante Supabase Auth, sin correo ni contraseña.
- Salas de 3–20 participantes con código/enlace, apodos, avatares, estado Listo y controles del anfitrión.
- Siete modos: clásico, exprés, obra maestra, memoria, animación, copia y rompehielos.
- Lienzo con lápiz, borrador, relleno, líneas, rectángulos, elipses, colores, grosor, deshacer y rehacer.
- Rondas simultáneas, tiempos del servidor, protección contra envíos atrasados y recuperación de conexión.
- Historias ocultas hasta la revelación, avance compartido, reacciones y reproducción de animaciones.
- Descarga PNG y exportación JSON con dibujos incluidos; práctica individual sin servicios externos.
- Diseño adaptable, navegación con etiquetas accesibles y respeto a movimiento reducido.

## Estado y activación

El código incluye frontend y motor multijugador. **Hacer merge no activa invitados ni crea un servicio Supabase.** Sin variables públicas, la interfaz muestra claramente que falta configuración y permite probar la práctica individual; nunca simula una sesión de invitado ni compañeros conectados.

Consulta [la guía de activación](docs/SETUP.md) para configurar Supabase Free, ejecutar la migración, activar Allow anonymous sign-ins y publicar en Cloudflare Pages Free. No se necesita Google Cloud ni autorización OAuth corporativa. No se necesita dominio comprado ni plan de pago para empezar dentro de sus cuotas.

```sh
npm install
cp .env.example .env.local
npm run dev
```

Variables públicas: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. Nunca incluyas claves secretas o `service_role` en el frontend. Los invitados acceden por enlace/código; no se verifica su empleo. Si ya ejecutaste la migración 001, aplica únicamente la 002.

## Verificación

```sh
npm run build
npx playwright install chromium
npm test
```

[GitHub Actions](.github/workflows/verify.yml) compila TypeScript, prueba el flujo individual en Chromium y ejecuta [las pruebas del motor](supabase/tests/game.sql) con PostgreSQL 16. `supabase/tests/bootstrap.sql` es exclusivo para una base desechable de CI: **no ejecutarlo en Supabase real**.

Las pruebas automáticas no sustituyen una partida de aceptación con tres sesiones de invitado reales después de configurar los servicios. Consulta los checks del PR antes de hacer merge.

## Arquitectura

React + TypeScript + Vite y Canvas en el navegador. Supabase PostgreSQL como autoridad transaccional; Realtime notifica cambios sin publicar respuestas privadas. El cliente solicita solo su tarea. SQL verifica identidad de invitado, membresía, turno y anfitrión, y bloquea cada sala al aplicar acciones concurrentes. Los álbumes se descargan una vez y se conservan en memoria durante la revelación; el respaldo por polling no retransmite sus imágenes.

Las historias se almacenan temporalmente en PostgreSQL y se eliminan después de 24 horas al crear salas o mediante limpieza programada. Revisa las cuotas antes de ampliar el uso. El juego no incluye voz/video integrado, GIF, puntuación competitiva ni todos los modos de Gartic Phone; no se presenta como una copia funcional uno a uno. Las llamadas de Meet/Zoom siguen siendo independientes.

## Llamada opcional para 20 personas

La nueva integración usa LiveKit SFU, con cámara y micrófono apagados inicialmente. Cada jugador decide si entra, solo escucha o activa cada dispositivo. Incluye panel flotante al dibujar, seis cámaras por página y galería de todos. Las nuevas salas admiten 20 jugadores por defecto.

Consulta [la guía de videollamadas](docs/VIDEO.md) para aplicar únicamente la migración 003, crear LiveKit Build gratuito, guardar los secretos en Cloudflare Pages y probar con el equipo. La capacidad configurada es 20; la validación real con 20 cámaras y tus redes queda pendiente de configurar el proveedor y hacer la prueba de aceptación. El plan gratuito tiene cuotas de minutos y transferencia.

El endpoint `/api/video` verifica la sesión y membresía en el servidor. No se exponen credenciales de LiveKit al navegador. La cámara/micrófono requieren consentimiento del jugador. Un error de la llamada no impide seguir jugando.
