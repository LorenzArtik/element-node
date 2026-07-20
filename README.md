# Element Node

## Installazione rapida

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/LorenzArtik/element-node/main/install.sh)
```

Requisiti: Node.js ≥ 20, MySQL/MariaDB. Lo script clona il repo, installa le dipendenze,
crea `.env` e lo schema DB, compila e ti lascia al wizard `/install` (admin, sito, AI).
Per Plesk vedi [PLESK_DEPLOY.md](PLESK_DEPLOY.md).

**Il CMS è gratuito.** La [licenza](https://elementnode.cloud/it/pricing) attiva
aggiornamenti gestiti, patch di sicurezza e supporto (Impostazioni → Licenza nel pannello).


CMS visuale moderno costruito con **Next.js 15 + MySQL/Prisma** che replica l'editor di **Elementor PRO** con un'interfaccia molto più moderna di WordPress, **AI integrata (Claude di Anthropic)** per generare e modificare contenuti via prompt, e deploy diretto su **Plesk**.

**Setup con un prompt (Claude Code / coding agent):** l'intero percorso —
server, CMS, skill e primo sito — si fa incollando un solo prompt al tuo
agente. Il template completo e sempre aggiornato è qui:
https://elementnode.cloud/it/docs#prompt

## Highlights

- Editor 3-pannelli (widget · canvas · proprietà) **identico a Elementor**
- **Drag & drop** sezioni, colonne, widget (libreria @dnd-kit)
- **15+ widget** pronti: Heading, Text, Button, Image, Video, Spacer, Divider, Icon Box, Image Box, Testimonial, Tabs, Accordion, Counter, Progress, HTML, Contact Form, Posts Grid, Gallery
- **Anteprima responsive** desktop / tablet / mobile
- **Undo / Redo** infiniti, salvataggio revisioni automatico
- **Pannello AI** laterale: chiedi in italiano e l'AI genera sezioni, modifica widget, scrive copy
- **Rich text editor** TipTap per i blocchi di testo
- **Libreria media** con upload locale (compatibile Plesk) + sostituibile con S3/R2
- **SEO**: title, description, OG image per pagina
- **Multi-utente** con ruoli (Admin / Editor / Viewer) via NextAuth v5
- **Form contatti** con submission salvate in DB
- **Frontend pubblico** SSR con metadati dinamici

## Stack

- Next.js 15 (App Router, RSC, Server Actions)
- React 19
- TypeScript 5
- Prisma 5 + MySQL
- NextAuth v5 (credentials + JWT)
- TailwindCSS 3 + Radix UI primitives
- Zustand (state editor)
- @dnd-kit (drag & drop)
- TipTap (rich text)
- @anthropic-ai/sdk (AI generation)

## Setup locale

```bash
# 1. Installa dipendenze
npm install

# 2. Copia env
cp .env.example .env
# poi compila DATABASE_URL e ANTHROPIC_API_KEY

# 3. Push schema su MySQL
npm run db:push

# 4. Seed (crea admin + homepage demo)
npm run db:seed

# 5. Avvia in dev
npm run dev
```

Apri http://localhost:3000 e accedi con `admin@example.com` / `admin1234`.

## Variabili .env

| Variabile | Descrizione |
|---|---|
| `DATABASE_URL` | Connessione MySQL (es. `mysql://user:pass@host:3306/db`) |
| `AUTH_SECRET` | Chiave casuale (`openssl rand -base64 32`) |
| `AUTH_URL` | URL pubblico (es. `https://tuosito.it`) |
| `AUTH_TRUST_HOST` | `true` (necessario dietro proxy/Plesk) |
| `ANTHROPIC_API_KEY` | API key Anthropic per l'AI |
| `ANTHROPIC_MODEL` | default `claude-sonnet-4-6` |
| `UPLOAD_DIR` | Cartella locale upload (default `./public/uploads`) |
| `PORT` | Porta su cui Plesk attende il processo |

## Deploy su Plesk

### Prerequisiti

- Plesk Obsidian con estensione **Node.js** abilitata
- Node.js >= 20
- DB MySQL (creabile dal pannello "Database" di Plesk)

### Step

1. **Carica i file** in `/var/www/vhosts/DOMAIN.TLD/httpdocs/` via FTP/SSH/Git.
2. **Crea il DB MySQL** dal pannello Plesk e copia le credenziali.
3. Vai su **Plesk → Domini → tuosito.it → Node.js**:
   - **Node.js version**: 20.x o superiore
   - **Application mode**: `production`
   - **Application URL**: il dominio
   - **Application root**: `/httpdocs`
   - **Document root**: `/httpdocs/public` *(così i file statici servono direttamente)*
   - **Application startup file**: `server.js`
4. Sezione **Custom environment variables**, aggiungi:
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `AUTH_URL` = `https://tuosito.it`
   - `AUTH_TRUST_HOST` = `true`
   - `ANTHROPIC_API_KEY`
   - `NODE_ENV` = `production`
5. Clicca **NPM install**.
6. Sezione **Run script**, esegui:
   - `db:push` (crea tabelle MySQL)
   - `db:seed` (crea utente admin)
   - `build` (compila Next.js)
7. Clicca **Restart App**.
8. Accedi a `https://tuosito.it/login` con `admin@example.com` / `admin1234` e cambia subito la password.

> **Nota Phusion Passenger**: il file `server.js` carica automaticamente l'output `standalone` se presente, altrimenti fa fallback a `next start`. Plesk gestisce il restart su modifica file `tmp/restart.txt`.

### Permessi cartelle

Assicurati che `public/uploads/` sia scrivibile dall'utente di sistema (di solito `psaserv` o l'utente del dominio):

```bash
chmod 755 public/uploads
chown DOMAIN_USER:psacln public/uploads
```

### Ottimizzazione consigliata Plesk

- **Apache & nginx settings** → spunta "Smart static files processing" per servire `/uploads/*` direttamente da nginx, bypassando Node.js.
- Abilita **HTTP/2** e **Brotli** in nginx settings.
- Imposta **Schedule task** per backup giornaliero del DB.

## Architettura

```
src/
├── app/
│   ├── (frontend pubblico SSR)
│   │   ├── page.tsx           # homepage dinamica
│   │   ├── [slug]/page.tsx    # tutte le pagine pubbliche
│   │   └── not-found.tsx
│   ├── login/page.tsx         # login moderno split-screen
│   ├── admin/                 # dashboard CMS
│   │   ├── layout.tsx         # sidebar + auth gate
│   │   ├── page.tsx           # dashboard con stats
│   │   ├── pages/             # lista, crea, elimina
│   │   ├── media/             # libreria
│   │   ├── templates/
│   │   └── settings/
│   ├── editor/[pageId]/       # ⚡ EDITOR VISUALE
│   └── api/                   # route handlers
├── components/
│   ├── editor/                # Sidebar, Canvas, PropertyPanel, AIChat, TopBar, RichText, Media
│   │   └── widgets/render.tsx # render unico per tutti i widget
│   ├── public/PageRenderer.tsx
│   └── ui/                    # shadcn-style primitives
├── lib/
│   ├── db.ts                  # Prisma singleton
│   ├── auth.ts                # NextAuth v5
│   ├── ai.ts                  # Anthropic client + system prompt
│   ├── editor-store.ts        # Zustand store con undo/redo
│   └── widgets-schema.ts      # registry widget + factories
└── middleware.ts              # protegge /admin /editor
```

## Schema dati

```
User ─┬─ Page ─┬─ Revision (cronologia)
      │        └─ content: JSON (sections → columns → elements)
      └─ Media

Template, Setting, Form, FormSubmission
```

Il **content** è un JSON tree che descrive l'intera pagina. L'AI riceve e restituisce questo formato.

## Roadmap

Funzionalità non ancora incluse (facili da aggiungere):
- Header/Footer globali (template type HEADER/FOOTER già nello schema)
- Theme builder (single post, archive, popup)
- Custom fields / dynamic content
- Form integrations (Mailchimp, ActiveCampaign, ecc.)
- WooCommerce-like store
- Multilingua (Prisma supporta facilmente la traduzione tramite tabella aggiuntiva)
- Storage S3/R2 per media
- Export/Import sito intero in JSON

## License

MIT — usa, modifica, vendi liberamente.
