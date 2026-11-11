-- CI ONLY: a minimal Supabase auth contract for a disposable PostgreSQL instance.
-- Never run this bootstrap against a real Supabase project.
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users (
  id uuid primary key,
  email text,
  email_confirmed_at timestamptz,
  raw_app_meta_data jsonb not null default '{}',
  raw_user_meta_data jsonb not null default '{}',
  aud text,
  role text
);
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb;
$$;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(auth.jwt()->>'sub','')::uuid;
$$;
grant usage on schema auth to authenticated,anon;
grant execute on function auth.jwt(),auth.uid() to authenticated,anon;
-- Exercise the migration's publication branch too. No replication connection is required.
create publication supabase_realtime;
