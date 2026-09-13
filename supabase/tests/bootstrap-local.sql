-- LOCAL TESTS ONLY. These replace Supabase Auth with fixture identities in a disposable database.
do $$begin if not exists(select 1 from pg_roles where rolname='anon') then create role anon;end if; if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated;end if;end$$;
create schema auth;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
insert into auth.users values
('11111111-1111-4111-8111-111111111111','alice@example.test',now(),'{"name":"Alice"}'),
('22222222-2222-4222-8222-222222222222','bob@example.test',now(),'{"name":"Bob"}'),
('33333333-3333-4333-8333-333333333333','carol@example.test',now(),'{"name":"Carol"}'),
('44444444-4444-4444-8444-444444444444','unverified@example.test',null,'{}');
