# Spostare Tasca su Cloudflare Pages

Perche: indirizzo piu corto e piu bello (`tasca.pages.dev` invece di
`walter-98.github.io/Tasca-2.0/`), traffico illimitato, pubblicazione in un
minuto, e il file `.well-known/assetlinks.json` finisce da solo nella radice del
sito, quindi l'app Android non mostra piu la barra dell'indirizzo.

Resta tutto gratis: Cloudflare Pages non chiede carta, Supabase resta sul piano
Free, GitHub resta dov'e.

**Attenzione: l'indirizzo cambia.** Chi ha gia installato l'app deve reinstallarla
dal nuovo link e rifare l'accesso. Farlo adesso, finche sono due o tre persone.

## 1. Crea il progetto su Cloudflare

1. Vai su [dash.cloudflare.com](https://dash.cloudflare.com) e crea un account gratuito.
2. **Compute (Workers) -> Pages -> Connect to Git**, autorizza GitHub e scegli il
   repository `Tasca-2.0`, ramo `main`.
3. Impostazioni della build:
   - Framework preset: **None** (oppure Vite)
   - Build command: `npm run build`
   - Build output directory: `dist`
4. **Environment variables (Production)** — aggiungile tutte e quattro:

   | Nome | Valore |
   |---|---|
   | `VITE_SUPABASE_URL` | l'indirizzo del progetto Supabase |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | la chiave pubblicabile (mai la `service_role`) |
   | `VITE_GOOGLE_LOGIN` | `true` |
   | `NODE_VERSION` | `24` |

5. **Save and Deploy**. Dopo un paio di minuti il sito e online su
   `nome-progetto.pages.dev`. Il nome del progetto decide l'indirizzo, quindi
   chiamalo `tasca` se e libero.

Da qui in poi ogni `git push` su `main` ripubblica da solo, come prima.

## 2. Dillo a Supabase

**Authentication -> URL Configuration**:

- **Site URL**: il nuovo indirizzo, con la barra finale.
- **Redirect URLs**: aggiungi il nuovo indirizzo con `**` in fondo. Lascia anche
  il vecchio finche non hai finito il trasloco.

## 3. Dillo a Google

Nella [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
sul client OAuth di Tasca, aggiungi il nuovo indirizzo tra le
**Origini JavaScript autorizzate**. Il redirect URI resta quello di Supabase.

## 4. Rifai l'APK

Su [pwabuilder.com](https://www.pwabuilder.com) ripeti la generazione con il nuovo
indirizzo, e nella schermata delle opzioni riusa la chiave esistente
(`signing.keystore`, alias `my-key-alias`) invece di crearne una nuova: cosi
l'app si aggiorna sopra quella gia installata invece di affiancarsi.
L'`assetlinks.json` e gia pubblicato dal sito, non serve toccarlo.

## 5. Non spegnere il vecchio indirizzo

GitHub Pages resta acceso e gratis. Lascialo per qualche mese con un rimando al
nuovo indirizzo: chi ha salvato il vecchio link non trova una pagina morta.

## Se un giorno compri un dominio

In Cloudflare Pages, **Custom domains -> Set up a domain**. Il resto del
trasloco e identico ai punti 2, 3 e 4. Costa circa dodici euro l'anno ed e
l'unica spesa che Tasca abbia mai richiesto.
