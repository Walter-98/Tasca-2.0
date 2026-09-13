-- Tasca 1.0. Run once in a NEW Supabase project, as project administrator.
-- Financial tables are not exposed through the Data API. Only the two checked RPCs below are callable.
begin;
create schema if not exists tasca;
revoke all on schema tasca from public, anon, authenticated;
create table tasca.accounts(id text primary key,owner_id uuid not null references auth.users(id),name text not null check(length(name) between 1 and 50),opening bigint not null check(abs(opening)<=100000000000),opening_date date not null check(opening_date between '2000-01-01' and '2100-12-31'));
create table tasca.members(account_id text references tasca.accounts(id) on delete cascade,user_id uuid references auth.users(id),primary key(account_id,user_id));
create index on tasca.accounts(owner_id);
create index on tasca.members(user_id);
create table tasca.movements(id text primary key,owner_id uuid not null references auth.users(id),type text not null check(type in ('income','expense','transfer')),amount bigint not null check(amount between 1 and 100000000000),category text not null check(length(category) between 1 and 50),description text not null check(length(description) between 1 and 160),date date not null check(date between '2000-01-01' and '2100-12-31'),account_id text references tasca.accounts(id),to_account_id text references tasca.accounts(id),author text not null,updated_by text not null,check((type='transfer' and account_id is not null and to_account_id is not null and account_id<>to_account_id) or (type<>'transfer' and to_account_id is null)));
create index on tasca.movements(account_id,date);
create index on tasca.movements(to_account_id,date);
create index on tasca.movements(owner_id);
create table tasca.budgets(owner_id uuid references auth.users(id),month text check(month ~ '^20[0-9]{2}-(0[1-9]|1[0-2])$|^2100-(0[1-9]|1[0-2])$'),amount bigint not null check(amount between 0 and 100000000000),primary key(owner_id,month));
create table tasca.recurring(id text primary key,owner_id uuid not null references auth.users(id),account_id text not null references tasca.accounts(id),type text not null check(type in ('income','expense')),amount bigint not null check(amount between 1 and 100000000000),category text not null check(length(category) between 1 and 50),description text not null check(length(description) between 1 and 160),start_date date not null check(start_date between '2000-01-01' and '2100-12-31'),end_date date check(end_date>=start_date and end_date<='2100-12-31'),active integer not null check(active in (0,1)));
create index on tasca.recurring(account_id);
create table tasca.occurrences(id text primary key,recurring_id text not null references tasca.recurring(id),date date not null,unique(recurring_id,date));
create table tasca.invites(token_hash text primary key,account_id text not null references tasca.accounts(id) on delete cascade,created_at timestamptz not null default now(),expires_at timestamptz not null,used_by uuid references auth.users(id));
create index on tasca.invites(account_id);
alter table tasca.accounts enable row level security;
alter table tasca.members enable row level security;
alter table tasca.movements enable row level security;
alter table tasca.budgets enable row level security;
alter table tasca.recurring enable row level security;
alter table tasca.occurrences enable row level security;
alter table tasca.invites enable row level security;
revoke all on all tables in schema tasca from public,anon,authenticated;

create function tasca.require_user() returns uuid language plpgsql stable set search_path='' as $$
declare u uuid:=auth.uid();
begin
 if u is null or not exists(select 1 from auth.users where id=u and email_confirmed_at is not null) then raise exception 'Tasca: Accedi e conferma la tua email prima di usare i conti.';end if;
 return u;
end $$;
create function tasca.can_access(a text,u uuid) returns boolean language sql stable set search_path='' as $$
 select exists(select 1 from tasca.accounts where id=a and owner_id=u) or exists(select 1 from tasca.members where account_id=a and user_id=u)
$$;
create function tasca.assert_account(a text,u uuid,owner_only boolean default false) returns void language plpgsql set search_path='' as $$
begin
 if a is null or not tasca.can_access(a,u) or (owner_only and not exists(select 1 from tasca.accounts where id=a and owner_id=u)) then raise exception 'Tasca: Non hai il permesso di modificare questo conto.';end if;
end $$;
create function tasca.assert_movement(m tasca.movements,u uuid) returns void language plpgsql set search_path='' as $$
begin
 if m.id is null then raise exception 'Tasca: Movimento non disponibile.';end if;
 if m.account_id is null then if m.owner_id<>u then raise exception 'Tasca: Movimento non disponibile.';end if;else perform tasca.assert_account(m.account_id,u);end if;
 if m.to_account_id is not null then perform tasca.assert_account(m.to_account_id,u);end if;
end $$;
create function tasca.assert_date(a text,d date) returns void language plpgsql set search_path='' as $$
begin
 if d is null or d<'2000-01-01' or d>'2100-12-31' then raise exception 'Tasca: Data non valida.';end if;
 if a is not null and d<(select opening_date from tasca.accounts where id=a) then raise exception 'Tasca: La data precede il saldo iniziale del conto.';end if;
end $$;

create function public.tasca_snapshot() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=tasca.require_user();result jsonb;
begin
 select jsonb_build_object(
 'user',(select jsonb_build_object('id',id,'email',email,'name',coalesce(nullif(left(raw_user_meta_data->>'name',80),''),email)) from auth.users where id=u),
 'accounts',coalesce((select jsonb_agg(to_jsonb(a)||jsonb_build_object('can_share',a.owner_id=u,'shared',exists(select 1 from tasca.members where account_id=a.id))) from tasca.accounts a where tasca.can_access(a.id,u)),'[]'),
 'movements',coalesce((select jsonb_agg(to_jsonb(m)||jsonb_build_object('account_id',case when tasca.can_access(m.account_id,u) then m.account_id end,'to_account_id',case when tasca.can_access(m.to_account_id,u) then m.to_account_id end,'can_edit',(m.account_id is null or tasca.can_access(m.account_id,u)) and (m.to_account_id is null or tasca.can_access(m.to_account_id,u))) order by m.date desc,m.id desc) from tasca.movements m where (m.account_id is null and m.owner_id=u) or tasca.can_access(m.account_id,u) or tasca.can_access(m.to_account_id,u)),'[]'),
 'budgets',coalesce((select jsonb_agg(jsonb_build_object('month',month,'amount',amount)) from tasca.budgets where owner_id=u),'[]'),
 'recurring',coalesce((select jsonb_agg(r) from tasca.recurring r where tasca.can_access(r.account_id,u)),'[]'),
 'occurrences',coalesce((select jsonb_agg(o) from tasca.occurrences o join tasca.recurring r on o.recurring_id=r.id where tasca.can_access(r.account_id,u)),'[]'),
 'members',coalesce((select jsonb_agg(jsonb_build_object('account_id',m.account_id,'user_id',m.user_id,'email',au.email)) from tasca.members m join tasca.accounts a on a.id=m.account_id join auth.users au on au.id=m.user_id where a.owner_id=u),'[]')
 ) into result;
 return result;
end $$;

create function public.tasca_mutate(kind text,v jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=tasca.require_user();act text:=coalesce(v->>'action','movement');ident text:=v->>'id';a text:=nullif(v->>'account_id','');dest text:=nullif(v->>'to_account_id','');d date;who text;old tasca.movements;r tasca.recurring;iv tasca.invites;token text;occ text;original_owner uuid;expected date;
begin
 -- Serialize mutations including membership revocation: authorization and write form one transaction.
 perform pg_catalog.pg_advisory_xact_lock(714283902);
 select coalesce(nullif(left(raw_user_meta_data->>'name',80),''),email) into who from auth.users where id=u;
 if v is null or jsonb_typeof(v)<>'object' then raise exception 'Tasca: Dati non validi.';end if;
 if kind='sharing' then
  if act='accept' then
   token:=v->>'token';
   if token is null or token !~ '^[a-f0-9]{64}$' then raise exception 'Tasca: Invito non valido.';end if;
   select * into iv from tasca.invites where token_hash=encode(sha256(convert_to(token,'UTF8')),'hex') for update;
   if iv.account_id is null or iv.expires_at<=now() or iv.used_by is not null then raise exception 'Tasca: Questo invito è scaduto, annullato o già utilizzato. Chiedi un nuovo link.';end if;
   if exists(select 1 from tasca.accounts where id=iv.account_id and owner_id=u) then raise exception 'Tasca: Questo conto è già tuo. Invia il link all’altra persona.';end if;
   insert into tasca.members values(iv.account_id,u) on conflict do nothing;
   update tasca.invites set used_by=u where token_hash=iv.token_hash;
  else
   perform tasca.assert_account(a,u,true);
   if act='invite' then
    if (select count(*) from tasca.invites where account_id=a and created_at>now()-interval '1 hour')>=20 then raise exception 'Tasca: Hai creato molti inviti. Attendi un’ora.';end if;
    token:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
    insert into tasca.invites(token_hash,account_id,expires_at) values(encode(sha256(convert_to(token,'UTF8')),'hex'),a,now()+interval '48 hours');
    return jsonb_build_object('ok',true,'token',token);
   elsif act='revoke' then delete from tasca.invites where account_id=a and used_by is null;
   elsif act='remove' then delete from tasca.members where account_id=a and user_id in(select id from auth.users where lower(email)=lower(v->>'email'));
   else raise exception 'Tasca: Operazione non valida.';end if;
  end if;
 elsif kind='finance' and act='budget' then
  insert into tasca.budgets values(u,v->>'month',(v->>'amount')::bigint) on conflict(owner_id,month) do update set amount=excluded.amount;
 elsif kind='finance' then
  if ident is null or ident !~ '^[a-zA-Z0-9_:-]{1,120}$' then raise exception 'Tasca: Identificativo non valido.';end if;
  select * into old from tasca.movements where id=ident for update;
  if old.id is not null then perform tasca.assert_movement(old,u);end if;
  if act='delete' then
   perform tasca.assert_movement(old,u);
   delete from tasca.movements where id=ident;
  elsif act='movement' then
   if old.id is null and ident like '%:%' then raise exception 'Tasca: Identificativo riservato alle ricorrenze.';end if;
   if a is not null then perform tasca.assert_account(a,u);end if;
   if v->>'type'='transfer' then perform tasca.assert_account(dest,u);else dest:=null;end if;
   d:=(v->>'date')::date;perform tasca.assert_date(a,d);perform tasca.assert_date(dest,d);
   if old.id is not null and old.owner_id<>u and (old.account_id is distinct from a or old.to_account_id is distinct from dest) then raise exception 'Tasca: Non puoi spostare su un altro conto un movimento di un’altra persona.';end if;
   insert into tasca.movements values(ident,u,v->>'type',(v->>'amount')::bigint,btrim(v->>'category'),btrim(v->>'description'),d,a,dest,who,who)
   on conflict(id) do update set type=excluded.type,amount=excluded.amount,category=excluded.category,description=excluded.description,date=excluded.date,account_id=excluded.account_id,to_account_id=excluded.to_account_id,updated_by=excluded.updated_by;
  else raise exception 'Tasca: Operazione non valida.';end if;
 elsif kind='planning' then
  if ident is null or ident !~ '^[a-zA-Z0-9_-]{1,120}$' then raise exception 'Tasca: Identificativo non valido.';end if;
  if act='account' then
   if exists(select 1 from tasca.accounts where id=ident) then perform tasca.assert_account(ident,u,true);end if;
   d:=(v->>'opening_date')::date;perform tasca.assert_date(null,d);
   if d>(now() at time zone 'Europe/Rome')::date then raise exception 'Tasca: Scegli una data iniziale non futura.';end if;
   if exists(select 1 from tasca.movements where (account_id=ident or to_account_id=ident) and date<d) or exists(select 1 from tasca.recurring where account_id=ident and start_date<d) then raise exception 'Tasca: Il saldo iniziale deve precedere movimenti e ricorrenze del conto.';end if;
   insert into tasca.accounts values(ident,u,btrim(v->>'name'),(v->>'opening')::bigint,d) on conflict(id) do update set name=excluded.name,opening=excluded.opening,opening_date=excluded.opening_date;
  elsif act='recurring' then
   perform tasca.assert_account(a,u);
   select * into r from tasca.recurring where id=ident for update;
   d:=(v->>'start_date')::date;perform tasca.assert_date(a,d);
   if r.id is not null then
    perform tasca.assert_account(r.account_id,u);
    if r.account_id<>a or r.start_date<>d then raise exception 'Tasca: Crea una nuova ricorrenza per cambiare conto o data iniziale.';end if;
   end if;
   insert into tasca.recurring values(ident,u,a,v->>'type',(v->>'amount')::bigint,btrim(v->>'category'),btrim(v->>'description'),d,(v->>'end_date')::date,(v->>'active')::integer)
   on conflict(id) do update set type=excluded.type,amount=excluded.amount,category=excluded.category,description=excluded.description,end_date=excluded.end_date,active=excluded.active;
  elsif act in ('confirm','skip') then
   select * into r from tasca.recurring where id=ident for update;
   perform tasca.assert_account(r.account_id,u);
   d:=(v->>'date')::date;perform tasca.assert_date(r.account_id,d);
   expected:=(date_trunc('month',d)+(least(extract(day from r.start_date)::integer,extract(day from (date_trunc('month',d)+interval '1 month - 1 day'))::integer)-1)*interval '1 day')::date;
   if r.active<>1 or d<r.start_date or d>(now() at time zone 'Europe/Rome')::date or (r.end_date is not null and d>r.end_date) or d<>expected then raise exception 'Tasca: Scadenza non valida o non ancora arrivata.';end if;
   occ:='rec:'||r.id||':'||d::text;
   if not exists(select 1 from tasca.occurrences where id=occ) then
    if act='confirm' then insert into tasca.movements values(occ,u,r.type,r.amount,r.category,r.description,d,r.account_id,null,who,who);end if;
    insert into tasca.occurrences values(occ,r.id,d);
   end if;
  else raise exception 'Tasca: Operazione non valida.';end if;
 else raise exception 'Tasca: Operazione non valida.';end if;
 return '{"ok":true}'::jsonb;
exception when check_violation or not_null_violation or invalid_text_representation or datetime_field_overflow or numeric_value_out_of_range then
 raise exception 'Tasca: Controlla importo, date e campi obbligatori.';
end $$;
revoke all on all functions in schema tasca from public,anon,authenticated;
revoke all on function public.tasca_snapshot(),public.tasca_mutate(text,jsonb) from public,anon,authenticated;
grant execute on function public.tasca_snapshot(),public.tasca_mutate(text,jsonb) to authenticated;
commit;
