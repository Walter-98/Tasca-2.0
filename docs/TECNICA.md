# Architettura e verifica

Questa è una versione statica indipendente del progetto Tasca: React, TypeScript e Vite, distribuibile da GitHub Pages o altro hosting statico HTTPS. Non importa librerie di Sites e non chiama servizi ChatGPT. La precedente app Sites e il suo database non vengono modificati.

## Identità e dati

Supabase Auth gestisce email/password, conferma, recupero, sessioni e OAuth Google. La sessione persistente è salvata dal client Supabase nel browser, quindi va usato **Esci** sui dispositivi condivisi. Le chiavi segrete restano fuori dal frontend.

Lo schema `tasca` è privato: accesso diretto revocato ai ruoli client e RLS attiva su tutte le tabelle, senza policy permissive. Due funzioni pubbliche `SECURITY DEFINER`, con `search_path` vuoto e grant ristretto al ruolo `authenticated`, espongono snapshot e mutazioni. Entrambe richiedono `auth.uid()` e un utente con email confermata. I controlli di accesso stanno nel database, non solo nell’interfaccia.

Le mutazioni usano un lock di transazione comune per rendere atomici controllo dei permessi, scrittura e revoca. È una scelta per piccoli gruppi e test, non per grandi volumi. I trasferimenti richiedono accesso a entrambi i conti; la lettura nasconde gli identificativi del conto non visibile. Autore e proprietario provengono dalla sessione e non dal payload del client.

Gli inviti sono token casuali monouso con hash SHA-256 nel database e scadenza a 48 ore. Il link usa il frammento URL, che non viene inviato al server dell’hosting. Nel browser viene conservato temporaneamente in `sessionStorage` per completare l’accesso, poi rimosso. Il possessore del link può accettare l’invito: inviarlo esclusivamente al destinatario voluto. Non sono inviti vincolati a una specifica email.

Il service worker conserva solo la pagina pubblica di aiuto offline. Non conserva rendiconti o risposte di autenticazione nella Cache API. Serve Internet; nessuna coda di scritture offline. I dati vengono riletti ogni 15 secondi quando l’app è visibile e al ritorno in primo piano.

## Limiti attuali

- Nessun collegamento bancario, pagamento, notifica push o analisi automatica degli estratti conto.
- Nessuna app nativa APK/IPA: installazione come app web dalla schermata Home.
- Nessuna importazione automatica del vecchio database e nessun pulsante di ripristino CSV.
- La UI non include cancellazione autonoma dell’account né registro immutabile di tutte le revisioni. Autore e ultimo modificatore sono mostrati, ma il proprietario del servizio mantiene accesso amministrativo al database. Non è cifratura end-to-end.
- Per molte transazioni, lo snapshot completo e il lock unico andranno sostituiti con paginazione e concorrenza più granulare.
- Prima di aprire registrazioni al pubblico, configurare SMTP, limiti antiabuso/CAPTCHA supportati dal provider e informativa del gestore; questa consegna è destinata ai test iniziali richiesti.

## Backup

Il CSV mensile è utile per controllare le cifre ma non salva identità, condivisioni e ricorrenze. Il gestore deve mantenere un backup del database attraverso gli strumenti Supabase/PostgreSQL e custodirlo fuori da GitHub. Non cancellare utenti direttamente da `auth.users` senza decidere come trasferire o cancellare i conti di cui sono proprietari: le chiavi esterne bloccano cancellazioni accidentali. Non considerare la gratuità del piano una garanzia di backup automatico.

## Test eseguibili

```sh
npm ci
npm test
npm run build
```

`npm test` controlla mesi corti, anni bisestili, date e saldi/trasferimenti. Il controllo TypeScript fa parte della build.

Per i permessi si usa un PostgreSQL **temporaneo locale** sulla porta 55439. Non eseguire il bootstrap su Supabase: crea ruoli e utenti fittizi per simulare il contesto Auth.

```sh
# Su un database locale nuovo dedicato ai test:
psql postgresql://localhost:55439/postgres -v ON_ERROR_STOP=1 \
  -f supabase/tests/bootstrap-local.sql -f supabase/setup.sql
TASCA_TEST_DATABASE_URL=postgresql://localhost:55439/postgres python3 tests/database.py
```

La suite verifica accesso anonimo e non confermato negato, accesso diretto alle tabelle negato, conti privati, condivisione, autore non falsificabile, tentativi di sovrascrittura di record altrui, budget personali, trasferimenti parzialmente visibili, validazione, scadenze bisestili, idempotenza dopo cancellazione/salto e revoca. Il database è PostgreSQL reale; l’identità Auth è una fixture locale. Non sostituisce una prova del servizio Supabase, della consegna email e dell’installazione su telefoni fisici.

Per ripetere la suite usa un nuovo database temporaneo: i nomi delle fixture sono fissi. La configurazione effettiva dei servizi e le prove su Android/iPhone restano da eseguire una volta pubblicata la propria copia.

## Verifiche di questa consegna — 13 settembre 2026

- Tre test automatici di calcolo superati; controllo TypeScript e build statica superati.
- Suite su PostgreSQL 14 locale superata, compresi conferma concorrente, invito scaduto e identificativi riservati alle ricorrenze.
- Interfaccia provata con Chrome in formato 390 × 844 e 1280 × 900: accesso, guida installazione, conti privati/condivisi, creazione link, salvataggio e uscita. Il gateway Auth era simulato, le operazioni finanziarie raggiungevano PostgreSQL locale con identità fittizie. Nessun errore JavaScript osservato e nessuna larghezza eccedente lo schermo nei controlli effettuati.
- Non ancora verificati: login reale Supabase/Google, recapito email, pubblicazione GitHub Pages e installazione su dispositivi Android/iPhone fisici. Richiedono la configurazione del gestore.
