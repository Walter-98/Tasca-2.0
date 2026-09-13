# Pubblicare Tasca per i primi test

Questi passaggi servono solo a chi mette online l’app. Dopo, alle altre persone invii un link e basta. Usa un computer per la prima configurazione.

## 1. Crea il progetto Supabase

1. Apri [Supabase](https://supabase.com/dashboard) e crea un account.
2. Crea un nuovo progetto nell’organizzazione con piano **Free**. Scegli una regione europea se adatta alle tue esigenze, assegna un nome e conserva la password del database in un posto sicuro.
3. Quando è pronto, apri **SQL Editor → New query**.
4. Apri il file `supabase/setup.sql` di questa cartella, copia tutto il contenuto, incollalo nell’editor e premi **Run**. Va eseguito una sola volta, su un progetto nuovo dedicato a Tasca. Non usare `bootstrap-local.sql`: è esclusivamente per i test locali.
5. In **Settings → API Keys** (o nel pannello **Connect**) copia **Project URL** e **Publishable key**. Se vedi le chiavi precedenti, usa `anon`, mai `service_role`.

La chiave pubblicabile è progettata per stare nel browser. Non concede accesso ai conti senza una sessione autorizzata. Le chiavi `secret`/`service_role` e la password del database non devono essere inserite nell’app o in GitHub.

## 2. Carica la cartella su GitHub

1. Accedi a [GitHub](https://github.com/) e scegli **New repository**.
2. Chiamalo `tasca`. Per GitHub Pages con GitHub Free usa un repository pubblico. Il codice sarà pubblico, i dati finanziari nel progetto Supabase resteranno protetti.
3. Carica **il contenuto** di questa cartella nella radice del repository: `package.json`, `README.md`, `src`, `public`, `supabase`, `docs`, ecc. Non caricare la cartella `node_modules`, `dist` o file `.env.local`.
4. Includi la cartella nascosta **`.github`**, che contiene la pubblicazione automatica. Sul Mac mostra i file nascosti con **⌘ + Maiusc + .**. Per caricare con comodità anche i file nascosti puoi usare GitHub Desktop: clona il repository, copia i contenuti nella cartella, poi **Commit to main → Push origin**. Non pubblicare la cartella del vecchio progetto Sites.
5. Verifica che sul sito GitHub sia presente `.github/workflows/publish.yml`. Se manca, apri **Add file → Create new file**, scrivi quel percorso completo e incolla il contenuto del file incluso nel pacchetto.

## 3. Collega GitHub e Supabase

Nel repository GitHub apri **Settings → Secrets and variables → Actions → Variables → New repository variable**. Crea:

| Nome esatto | Valore |
| --- | --- |
| `VITE_SUPABASE_URL` | Il Project URL copiato da Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | La Publishable key, oppure la precedente chiave anon |
| `VITE_GOOGLE_LOGIN` | `true` solo se completi il passaggio Google qui sotto; altrimenti `false` |

Poi apri **Settings → Pages → Build and deployment → Source → GitHub Actions**.

Apri **Actions → Pubblica Tasca → Run workflow** e scegli `main`. Se la prima esecuzione era fallita perché mancavano le variabili, rilanciala. Quando è verde, trovi il link in **Settings → Pages** e nel riepilogo dell’esecuzione. Copialo nel campo **Website** della sezione **About** del repository: sarà il pulsante d’ingresso per chi arriva da GitHub.

Il link avrà in genere la forma `https://TUO-NOME.github.io/tasca/`. È un esempio: usa sempre quello effettivamente mostrato da GitHub. Non inviare il precedente indirizzo `chatgpt.site`.

## 4. Autorizza il link dell’app

In Supabase vai su **Authentication → URL Configuration**:

- **Site URL**: il link effettivo di Tasca, compresa la barra finale.
- **Redirect URLs**: aggiungi lo stesso link esatto. Per sviluppo locale aggiungi separatamente `http://localhost:5173/` oppure il preciso indirizzo mostrato dal server locale.

In **Authentication → Providers / Sign In** lascia attiva la conferma email e imposta la lunghezza minima password a **12**. Non disattivare la conferma per aggirare problemi di invio email.

## 5. Scegli come far accedere i tester

### Opzione pratica per iniziare: Google

Gli utenti toccano **Continua con Google**; al primo accesso nasce il loro account Tasca. Non serve un servizio per inviare email di conferma o recupero password di Tasca. Serve un account Google personale agli utenti e una configurazione iniziale del gestore.

1. Segui [la guida ufficiale Supabase per Google](https://supabase.com/docs/guides/auth/social-login/auth-google) e crea in Google Cloud un client OAuth di tipo **Web application**.
2. Configura la schermata di consenso con nome e contatto dell’app. Per test circoscritti usa la modalità di test e aggiungi gli indirizzi Google dei tester quando richiesto.
3. Negli **Authorized redirect URIs** del client Google incolla la callback mostrata dal provider Google di Supabase: normalmente `https://ID-PROGETTO.supabase.co/auth/v1/callback`. È diversa dal link dell’app.
4. Negli **Authorized JavaScript origins** usa l’origine del sito GitHub Pages, senza `/tasca/`.
5. Incolla **Client ID e Client secret** nel provider Google di Supabase e abilitalo. Il client secret resta solo in Supabase: non inserirlo in GitHub o nell’app.
6. Imposta `VITE_GOOGLE_LOGIN=true` nelle variabili GitHub e rilancia **Pubblica Tasca**.

### Email e password

Per registrazione autonoma, conferma email e recupero password con indirizzi esterni devi configurare **SMTP personalizzato** in Supabase. Il mittente predefinito invia solo agli indirizzi autorizzati del team e ha limiti ridotti: non basta per distribuire l’app ad amici e familiari.

Segui [la guida SMTP ufficiale](https://supabase.com/docs/guides/auth/auth-smtp): attiva un fornitore di email, verifica il mittente come richiesto, poi inserisci host, porta, utente e password SMTP in Supabase. Eventuali costi e necessità di un dominio dipendono dal fornitore. Non sono necessari per i test che usano Google.

Le schermate email/password sono incluse nell’app, ma i relativi messaggi non possono funzionare finché il servizio email non è configurato. Non promettere il recupero password ai tester prima di averlo verificato.

## 6. Prova con due persone

1. Accedi dal primo telefono, crea il conto “Test famiglia” e registra una spesa fittizia.
2. Crea un link in **Conti → Condividi** e invialo al secondo telefono.
3. Accedi con una seconda identità e accetta l’invito: deve apparire solo il conto condiviso.
4. Registra una seconda spesa. Torna al primo telefono: dopo circa 15 secondi, con l’app aperta e Internet attivo, devono vedersi entrambe.
5. Rimuovi il partecipante e controlla che il conto sparisca dal suo elenco al successivo aggiornamento.
6. Prova installazione, chiusura e riapertura dell’icona su entrambi i telefoni.
7. Se usi email/password, prova registrazione, conferma e recupero anche con un indirizzo esterno al tuo team Supabase.

Solo dopo questi controlli passa dai dati fittizi ai dati personali. Non sono ancora stati eseguiti test sul tuo futuro progetto Supabase o sui tuoi telefoni.

## Aggiornamenti e costi

Ogni modifica caricata nel ramo `main` ricostruisce l’app. I conti rimangono nel database e non vengono cancellati dalla pubblicazione. Dopo un aggiornamento, chiudi e riapri Tasca.

Non attivare piani a pagamento per seguire questa guida. Controlla i limiti dei servizi. GitHub Pages è qui destinato ai test personali: per trasformare Tasca in un servizio commerciale, scegli un hosting compatibile con le sue condizioni. Il progetto statico può essere ospitato anche da altri fornitori, mantenendo Supabase.

Fonti: [limiti GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits), [prezzi Supabase](https://supabase.com/pricing).
