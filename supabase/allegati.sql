-- Tasca — allegati e scontrini. Da eseguire nel SQL Editor dopo migrazione-1.1.sql.
-- Crea un archivio privato: ogni utente vede solo la propria cartella.
-- Puo' essere eseguito piu' volte senza danno.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('allegati','allegati',false,5242880,
 array['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf'])
on conflict (id) do update set
 public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "allegati propri lettura" on storage.objects;
drop policy if exists "allegati propri scrittura" on storage.objects;
drop policy if exists "allegati propri modifica" on storage.objects;
drop policy if exists "allegati propri cancellazione" on storage.objects;

create policy "allegati propri lettura" on storage.objects for select to authenticated
 using (bucket_id='allegati' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "allegati propri scrittura" on storage.objects for insert to authenticated
 with check (bucket_id='allegati' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "allegati propri modifica" on storage.objects for update to authenticated
 using (bucket_id='allegati' and (storage.foldername(name))[1]=auth.uid()::text)
 with check (bucket_id='allegati' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "allegati propri cancellazione" on storage.objects for delete to authenticated
 using (bucket_id='allegati' and (storage.foldername(name))[1]=auth.uid()::text);
