# DoodleDash ✦

Una pausa creativa para tu equipo: escribe, dibuja, interpreta y descubre cómo cambia la historia. Web en español con estética cálida, rojo coral, salas privadas y acceso Google para correos corporativos autorizados. Proyecto independiente, sin afiliación oficial con DoorDash o Gartic.

## Lo que incluye

- Inicio con Google mediante Supabase Auth; autorización de dominios en el servidor.
- Salas de 3–20 participantes con código/enlace, apodos, avatares, estado Listo y controles del anfitrión.
- Siete modos: clásico, exprés, obra maestra, memoria, animación, copia y rompehielos.
- Lienzo con lápiz, borrador, relleno, líneas, rectángulos, elipses, colores, grosor, deshacer y rehacer.
- Rondas simultáneas, tiempos del servidor, protección contra envíos atrasados y recuperación de conexión.
- Historias ocultas hasta la revelación, avance compartido, reacciones y reproducción de animaciones.
- Descarga PNG y exportación JSON con dibujos incluidos; práctica individual sin servicios externos.
- Diseño adaptable, navegación con etiquetas accesibles y respeto a movimiento reducido.

## Estado y activación

El código incluye frontend y motor multijugador. **Hacer merge no activa Google ni crea un servicio Supabase.** Sin variables públicas, la interfaz muestra claramente que falta configuración y permite probar la práctica individual; nunca simula una sesión Google ni compañeros conectados.

Consulta [la guía de activación](docs/SETUP.md) para configurar Supabase Free, ejecutar la migración, crear el cliente Google OAuth y publicar en Cloudflare Pages Free. El administrador de Google Workspace podría necesitar autorizar el acceso corporativo. No se necesita dominio comprado ni plan de pago para empezar dentro de sus cuotas.

```sh
npm install
cp .env.example .env.local
npm run dev
```

Variables públicas: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. Nunca incluyas claves secretas o `service_role` en el frontend. El servidor autoriza inicialmente `doordash.com` y `ext.doordash.com`; la lista se cambia en SQL.

## Verificación

```sh
npm run build
npx playwright install chromium
npm test
```

[GitHub Actions](.github/workflows/verify.yml) compila TypeScript, prueba el flujo individual en Chromium y ejecuta [las pruebas del motor](supabase/tests/game.sql) con PostgreSQL 16. `supabase/tests/bootstrap.sql` es exclusivo para una base desechable de CI: **no ejecutarlo en Supabase real**.

Las pruebas automáticas no sustituyen una partida de aceptación con tres cuentas Google reales después de configurar los servicios. Consulta los checks del PR antes de hacer merge.

## Arquitectura

React + TypeScript + Vite y Canvas en el navegador. Supabase PostgreSQL como autoridad transaccional; Realtime notifica cambios sin publicar respuestas privadas. El cliente solicita solo su tarea. SQL verifica identidad Google, dominio, membresía, turno y anfitrión, y bloquea cada sala al aplicar acciones concurrentes. Los álbumes se descargan una vez y se conservan en memoria durante la revelación; el respaldo por polling no retransmite sus imágenes.

Las historias se almacenan temporalmente en PostgreSQL y se eliminan después de 24 horas al crear salas o mediante limpieza programada. Revisa las cuotas antes de ampliar el uso. El juego no incluye voz/video integrado, GIF, puntuación competitiva ni todos los modos de Gartic Phone; no se presenta como una copia funcional uno a uno. Las llamadas de Meet/Zoom siguen siendo independientes.
