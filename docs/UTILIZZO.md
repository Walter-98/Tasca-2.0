# Usare Tasca senza essere esperti

## Primo giorno

Apri il link pubblicato da chi gestisce Tasca. Crea un account, conferma l’email e accedi; oppure scegli **Continua con Google** se presente. Ogni persona usa il proprio account.

In **Conti** crea il primo conto. Il saldo iniziale è il denaro disponibile all’inizio della data scelta, prima dei movimenti di quel giorno. Esempio: all’inizio del 1 settembre hai 800 €. Imposta 800 € al 1 settembre, poi registra le spese e le entrate dal 1 settembre in poi.

Tocca **Nuovo movimento**, scegli Spesa o Entrata, inserisci importo, descrizione, conto, categoria e data, poi **Salva movimento**. Un movimento senza conto compare nei totali mensili ma non nel saldo dei conti.

## Ogni mese

- Cambia mese con le frecce o il selettore.
- **Saldo del mese** significa entrate meno spese del mese. Il **disponibile nei conti** include anche il saldo iniziale e i movimenti precedenti fino a oggi.
- Imposta un budget e controlla quanto rimane. Il budget è personale e comprende tutte le spese che puoi vedere, incluse quelle dei conti condivisi.
- Usa **Esporta CSV** per conservare il rendiconto del mese. Il file non contiene password e non è un backup completo ripristinabile.

## Ricorrenze e trasferimenti

In **Conti → Nuova ricorrenza** puoi inserire affitto, stipendio o abbonamenti. Alla scadenza tocchi **Registra** per creare il movimento; **Salta** esclude quella data. Nei mesi corti una scadenza del 31 cade all’ultimo giorno del mese. Non vengono inviati promemoria in background.

**Trasferisci tra conti** serve per spostare denaro, per esempio dalla banca ai contanti. Non aumenta entrate e spese. Per modificare un trasferimento devi avere accesso a entrambi i conti. Un partecipante che vede solo un lato legge “Conto esterno” per l’altro e non può modificarlo.

## Condividere un conto

Apri **Conti → Condividi → Crea link di invito**. Copia il link e invialo alla persona scelta. Il pulsante non invia messaggi da solo. Chi riceve il link accede a Tasca e tocca **Accetta invito**. Il link si può usare una volta entro 48 ore.

Il proprietario può rimuovere una persona. Le nuove richieste vengono bloccate subito; l’elenco già aperto sull’altro telefono si aggiorna al controllo successivo, normalmente entro 15 secondi mentre l’app è visibile. Una revoca non può cancellare file o schermate che la persona aveva già salvato.

## Installarla

**Android:** apri il link in Chrome → menu ⋮ → Installa app / Aggiungi a schermata Home. Se compare il pulsante **Installa Tasca**, puoi usarlo.

**iPhone:** apri il link in Safari → Condividi → Aggiungi alla schermata Home → Aggiungi. Se compare “Apri come app web”, attivalo.

Se il link si apre dentro WhatsApp, un’email o un social, scegli **Apri in Safari/Chrome**. Da un computer invia a te stesso il link e aprilo sul telefono. Non scaricare lo ZIP GitHub sul telefono per installare Tasca.

## Problemi comuni

| Cosa succede | Cosa fare |
| --- | --- |
| Compare “Tasca è quasi pronta” | Il gestore deve completare le variabili e ripubblicare l’app. |
| Vedo codice o uno ZIP | Hai aperto il progetto, non l’app. Chiedi il link GitHub Pages indicato in Settings → Pages. |
| Non arriva l’email | Controlla lo spam. Se continua, il gestore deve verificare SMTP. Per i test puoi usare Google se attivato. |
| Google non fa accedere | Il gestore deve controllare callback, provider e lista dei tester Google. |
| Invito scaduto o già usato | Chiedi al proprietario un nuovo link. |
| Non vedo l’invito dopo l’installazione | Apri di nuovo il link ricevuto e accedi. L’invito può essere rimasto nel browser anziché nell’app Home. |
| Ho dimenticato la password | Usa “Password dimenticata?” se usi email/password. Per Google recupera l’account con Google. |
| Ho cambiato telefono | Apri lo stesso link e accedi con la stessa identità: i conti sono online. |
| Nessuna connessione | Riconnettiti prima di salvare. Tasca non accoda modifiche offline. |
| I dati non si aggiornano | Torna all’app, attendi 15 secondi o premi Riprova. Il gestore deve controllare se Supabase è in pausa. |
| Voglio uscire | Tocca **Esci** nella barra in alto. |

Se disinstalli l’icona non cancelli i dati online. Per la cancellazione definitiva dell’account e dei dati contatta chi gestisce il progetto: non è ancora disponibile un comando autonomo nell’app.
