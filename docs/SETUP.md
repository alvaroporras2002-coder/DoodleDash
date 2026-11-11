# Activar DoodleDash con apodos

El juego utiliza sesiones de invitado de Supabase. Cada persona elige apodo y avatar. No necesita Google, correo, contraseña ni Google Cloud. La identidad técnica permanece en el navegador y las RPC siguen exigiendo membresía y permisos de anfitrión.

## Si ya ejecutaste el primer SQL

Ejecuta **únicamente** `supabase/migrations/202611110002_guest_access.sql` en SQL Editor. Conserva las tablas, partidas y permisos existentes. No vuelvas a ejecutar la migración 001.

## Proyecto nuevo

Crea Supabase Free y ejecuta las migraciones 001 y 002, en ese orden. La 001 es la base histórica y la 002 reemplaza el acceso Google por invitados.

## Activar invitados

En Authentication → Sign In / Providers, activa **Allow anonymous sign-ins** y guarda los cambios. Mantén **Allow new users to sign up** activado. Google puede permanecer desactivado. No hacen falta credenciales OAuth ni URLs callback.

Una sesión de invitado tiene un UUID propio y el rol `authenticated`. No equivale al rol público `anon`: una petición sin sesión no puede jugar ni consultar historias. El servidor comprueba `auth.users.is_anonymous`; el apodo no es una contraseña ni permite suplantar a otro participante.

## Publicar en Cloudflare Pages Free

Conecta el repositorio GitHub. Rama main, comando `npm run build`, salida `dist`. Configura estas variables públicas antes de desplegar:

- `VITE_SUPABASE_URL`: URL del proyecto Supabase.
- `VITE_SUPABASE_ANON_KEY`: publishable key o clave pública anon. Nunca service_role ni secret key.

El subdominio gratuito pages.dev basta. Para desarrollo usa `npm install` y `npm run dev`; copia `.env.example` a `.env.local` con los valores públicos.

## Probar con el equipo

Usa tres navegadores o perfiles distintos para tres identidades. Crear sala, copiar enlace, unirse, marcar Listo y comenzar. Comprueba una cadena completa, revelación, reconexión y recuperación del anfitrión. Varias pestañas del mismo perfil comparten identidad.

Recargar conserva la sesión; cerrar sesión, usar incógnito o borrar datos puede impedir recuperar ese jugador. Conserva el enlace y ese navegador mientras dure la partida. Los cambios de apodo/avatar se aplican al entrar a una nueva sala.

Los enlaces/códigos conceden acceso como invitado: no hay verificación de empleo ni restricción por dominio. Comparte las invitaciones solo con quienes jugarán. Las nuevas salas usan códigos aleatorios de 12 caracteres; los códigos anteriores continúan funcionando.

Supabase Free tiene cuotas y puede pausar proyectos inactivos. Las identidades invitadas cuentan para sus cuotas de usuarios. Mantén sus límites de autenticación y considera Turnstile si publicas ampliamente el enlace de la web (requiere su configuración real). No se promete alojamiento ilimitado. Las historias antiguas se eliminan después de 24 horas al crear salas; para limpieza programada, el propietario puede programar el borrado de salas por updated_at.

La práctica individual no necesita servicios. Las partidas compartidas sí requieren las variables públicas y activar invitados. Hacer merge no cambia el panel Supabase automáticamente.
