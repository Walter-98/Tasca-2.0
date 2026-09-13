# Tasca come app Android (file APK)

Questa guida serve a ottenere un **vero file APK**: si installa sul telefono come una normale app Android, compare nell'elenco delle app, ha la sua icona e si apre a schermo intero senza barra del browser.

L'APK non contiene una copia dell'app: è un involucro (Trusted Web Activity) che apre a schermo intero il sito di Tasca dentro il motore di Chrome. **Quindi il primo passo obbligatorio è avere Tasca online su un indirizzo HTTPS**: senza quell'indirizzo non c'è niente da impacchettare. Segui prima [PUBBLICARE.md](PUBBLICARE.md).

Conseguenza utile: quando aggiorni il codice su `main`, l'app sul telefono si aggiorna da sola. L'APK va rigenerato solo se cambi nome, icona o indirizzo dell'app.

Conseguenza da conoscere: serve comunque Internet, esattamente come oggi. L'APK non rende Tasca utilizzabile offline.

**iPhone: non è possibile.** Un file installabile su iPhone (IPA) richiede App Store o TestFlight e un account sviluppatore Apple a pagamento. Su iPhone resta l'installazione dalla schermata Home descritta in [UTILIZZO.md](UTILIZZO.md).

## Ordine dei passaggi

1. Pubblica Tasca e ottieni il link (PUBBLICARE.md).
2. Genera l'APK con uno dei due metodi qui sotto.
3. Pubblica il file `assetlinks.json`, altrimenti l'app mostra la barra con l'indirizzo.
4. Copia l'APK sul telefono e installalo.

## 2. Generare l'APK

### Metodo A — PWABuilder (dal browser, niente da installare)

1. Apri [pwabuilder.com](https://www.pwabuilder.com/) e incolla il link di Tasca.
2. Scegli il pacchetto **Android**, opzione **Google Play** (produce APK e AAB) oppure il pacchetto per installazione diretta.
3. Lascia che generi la chiave di firma e **conserva il file `.keystore`, la password e gli alias**: senza quei file non potrai pubblicare aggiornamenti dell'APK, e chi lo ha installato dovrà disinstallare e reinstallare.
4. Scarica lo zip: dentro trovi l'APK e il file `assetlinks.json` già compilato con l'impronta della tua chiave.

### Metodo B — Bubblewrap (riga di comando, controllo completo)

Bubblewrap è lo strumento ufficiale di Google. Scarica da solo, al primo avvio, il JDK e gli strumenti Android che gli servono.

```
npm install -g @bubblewrap/cli
bubblewrap init --manifest https://TUO-NOME.github.io/tasca/manifest.webmanifest
bubblewrap build
```

Durante `init` rispondi alle domande (nome, colori, package id tipo `it.tasca.app`) e fai creare la chiave di firma. `build` produce `app-release-signed.apk` e stampa l'impronta SHA-256 della chiave, che serve al passaggio successivo.

Custodisci `android.keystore` e le password fuori dal repository GitHub. Sono già esclusi da `.gitignore`? Verificalo prima di fare commit.

## 3. Il file assetlinks.json (togliere la barra dell'indirizzo)

Android mostra la barra con l'indirizzo finché non può verificare che quell'APK e quel sito appartengono alla stessa persona. La verifica avviene leggendo un file che deve stare **alla radice del dominio**, non nella sottocartella dell'app:

```
https://TUO-NOME.github.io/.well-known/assetlinks.json
```

Con GitHub Pages il progetto `tasca` è servito sotto `/tasca/`, quindi quel file **non può stare in questo repository**. Serve un secondo repository pubblico chiamato esattamente `TUO-NOME.github.io`, con dentro la cartella `.well-known` e il file `assetlinks.json`. Il contenuto è quello generato da PWABuilder o da `bubblewrap fingerprint generateAssetLinks`, e contiene il package id e l'impronta SHA-256 della chiave di firma.

Se in futuro userai un dominio tuo per Tasca, il file andrà alla radice di quel dominio.

Dopo aver pubblicato il file, disinstalla e reinstalla l'APK: la verifica avviene all'installazione. Se la barra resta, controlla che il file sia raggiungibile nel browser, che l'impronta sia quella della chiave con cui l'APK è firmato e che il package id coincida.

## 4. Installare sul telefono

1. Manda l'APK al telefono: cavo USB, Google Drive, o caricandolo tra le Release del repository GitHub e aprendo il link dal telefono.
2. Aprilo dal telefono. Android chiede l'autorizzazione a **installare app da questa origine**: concedila all'app da cui stai aprendo il file (File, Chrome, Drive).
3. Play Protect può mostrare un avviso perché l'app non arriva dal Play Store: è normale per un'installazione diretta, si prosegue con **Installa comunque**.
4. Accedi con il tuo account Tasca, come sul sito.

Chi installa in questo modo non riceve aggiornamenti automatici dell'involucro: dovrai mandargli il nuovo APK. Il contenuto dell'app, invece, resta sempre aggiornato.

## Se in futuro vuoi il Play Store

Serve lo stesso pacchetto (formato AAB), un account sviluppatore Google Play (25 $ una tantum), la scheda dell'app, un'informativa privacy raggiungibile pubblicamente e la revisione di Google. Con Play Store spariscono l'avviso di Play Protect e il passaggio manuale del file, e gli aggiornamenti dell'involucro arrivano da soli. Da Google Play la firma è gestita da Google: l'impronta da mettere in `assetlinks.json` è quella che trovi nella console, non quella locale.

Fonti: [Trusted Web Activity, guida Android](https://developer.android.com/develop/ui/views/layout/webapps/guide-trusted-web-activities-version2), [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap), [PWABuilder, asset links](https://github.com/pwa-builder/pwabuilder-google-play/blob/main/Asset-links.md).
