# Tasca · I conti di tutti i giorni

Entrate, spese, budget e conti condivisi tra due persone. Ognuno accede con il proprio account Tasca; chi condivide un conto sceglie chi può usarlo. Non serve ChatGPT.

**Questa cartella contiene la nuova versione indipendente. Per ottenere il link dell’app bisogna prima pubblicarla seguendo [la guida iniziale](docs/PUBBLICARE.md). Nessun servizio online è già collegato a questa copia.**

## Voglio usarla sul telefono

Chiedi a chi ha pubblicato Tasca **il link dell’app**, non il link “Code → Download ZIP”.

1. Apri quel link in **Chrome su Android** o **Safari su iPhone**.
2. Tocca **Installa Tasca** e segui le istruzioni.
3. Crea il tuo account e conferma l’email. Se è stato attivato, puoi usare **Continua con Google**.
4. Riapri Tasca dall’icona nella schermata Home e accedi. Su iPhone potrebbe essere necessario accedere di nuovo dopo l’installazione.

Su Android, l’alternativa è **⋮ → Installa app** o **Aggiungi a schermata Home**. Su iPhone è **Condividi → Aggiungi alla schermata Home → Aggiungi**; attiva “Apri come app web” se compare.

Il link apre subito Tasca; per aggiungere l’icona il telefono richiede alcuni tocchi di conferma. Non è possibile imporre un’installazione automatica con un solo clic su ogni telefono. Non devi scaricare APK o IPA e non serve un account sviluppatore degli store.

Fonti: [Apple, app web su iPhone](https://support.apple.com/it-it/guide/iphone/iphea86e5236/ios), [Google, app web su Android](https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DAndroid&hl=it).

## Marito e moglie: un esempio

1. Anna apre **Conti → Aggiungi conto**, lo chiama “Casa” e indica il saldo iniziale.
2. Tocca **Condividi → Crea link di invito → Copia link** e lo invia a Marco.
3. Marco apre il link, crea il proprio account oppure accede e tocca **Accetta invito**.
4. Anna registra la spesa al supermercato; Marco la vede entro circa 15 secondi mentre Tasca è aperta e online.

Entrambi possono registrare, correggere ed eliminare movimenti del conto condiviso. Si vede chi li ha registrati e chi li ha modificati. Solo il proprietario può cambiare il saldo iniziale, invitare o rimuovere persone. I conti personali restano separati. Un invito dura 48 ore, si usa una volta e può essere annullato prima dell’utilizzo.

I rendiconti mostrano l’intero importo dei conti condivisi a ogni partecipante: non dividono automaticamente le spese a metà e non calcolano rimborsi tra persone.

## Cosa trovi

- Entrate, spese e categorie, con ricerca e rendiconto mensile.
- Saldo del mese, grafico degli ultimi sei mesi e distribuzione delle spese.
- Più conti: banca, contanti, carta, famiglia; trasferimenti senza contarli come nuove entrate o spese.
- Budget personale mensile e indicazione quando viene superato.
- Ricorrenze mensili da confermare: affitto, stipendio, abbonamenti.
- Esportazione CSV del mese, leggibile con Excel e altri fogli di calcolo.
- Accesso personale, uscita, recupero password via email se il servizio email è configurato.

## Perché può fare la differenza

Una spesa registrata in pochi secondi resta visibile nel mese. Il budget mostra quanto spazio rimane; le categorie aiutano a riconoscere le abitudini. In coppia si può controllare lo stesso conto senza chiedersi ogni volta chi ha pagato. Tasca organizza ciò che inserisci: non collega automaticamente la banca e non garantisce un risparmio.

## Cosa serve e quanto costa

**Per usarla:** un telefono con browser aggiornato, Internet e un account Tasca. Nessun account GitHub o Supabase per gli utenti dell’app.

**Per pubblicarla:** un account GitHub e un progetto Supabase. La configurazione è una tantum. GitHub contiene il codice e ospita l’interfaccia statica; Supabase gestisce identità e dati protetti. Le password non vengono inviate a GitHub.

Per i test personali puoi partire con i piani gratuiti, entro i rispettivi limiti. L’app non richiede Play Store, App Store o dominio a pagamento. Supabase può sospendere un progetto gratuito poco utilizzato; il gestore deve riattivarlo. L’invio delle email di registrazione richiede configurazione: la guida propone anche accesso Google per i test senza servizio email. Non è una promessa di gratuità illimitata.

Fonti: [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages), [piani Supabase](https://supabase.com/pricing), [sospensione progetti gratuiti](https://supabase.com/docs/guides/platform/free-project-pausing).

## Guide

- **[Pubblicare e ottenere il link](docs/PUBBLICARE.md)** — passaggi per chi gestisce l’app.
- **[Utilizzo e problemi comuni](docs/UTILIZZO.md)** — guida per chi la installa.
- **[App Android in formato APK](docs/APK-ANDROID.md)** — per installarla come una normale app Android, dopo la pubblicazione.
- **[Dati, sicurezza e verifiche](docs/TECNICA.md)** — limiti, backup e test.

## Scaricare il progetto

Da GitHub: **Code → Download ZIP**, poi estrai la cartella sul computer. Questo scarica i sorgenti per modificare o pubblicare Tasca: non installa direttamente l’app sul telefono.

Per lavorare in locale serve Node.js 24:

```sh
npm ci
cp .env.example .env.local
# Compila .env.local con URL e chiave pubblicabile del TUO progetto Supabase.
npm run dev
```

Lo schema da applicare una volta a un progetto nuovo è [supabase/setup.sql](supabase/setup.sql). Non caricare mai password, chiavi segrete, esportazioni finanziarie o `.env.local` su GitHub.

Questa versione parte con conti vuoti. I dati della precedente copia ospitata su ChatGPT non vengono trasferiti automaticamente: esportali in CSV dalla vecchia app e conservali prima di cambiare servizio. Il CSV è un rendiconto, non un backup ripristinabile nell’app; non esiste ancora un’importazione automatica.
