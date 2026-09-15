-- Tasca · funzione di sveglia (esegui una sola volta, SQL Editor -> New query -> Run)
-- Serve solo a tenere attivo il progetto Supabase sul piano gratuito:
-- una richiesta ogni pochi giorni conta come attivita del database e ferma la pausa
-- automatica dopo sette giorni di inattivita. Non legge e non scrive alcun dato.

create or replace function public.tasca_sveglia()
returns text
language sql
security definer
set search_path = pg_catalog, public
as $$ select 'sveglio'::text $$;

revoke all on function public.tasca_sveglia() from public;
grant execute on function public.tasca_sveglia() to anon, authenticated;
