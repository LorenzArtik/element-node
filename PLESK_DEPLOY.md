# Deploy step-by-step su Plesk

Guida pratica testata su Plesk Obsidian 18.x con Node.js 20 e MySQL 8.

## 1. Crea il sito su Plesk

1. **Domains → Add Domain** (oppure subdomain).
2. Nelle **Hosting Settings** scegli:
   - PHP: disabilitato (non ci serve)
   - Document root: `/httpdocs`

## 2. Crea il database

1. Pannello dominio → **Databases → Add Database**
2. Nome DB: `elementor_node`
3. Crea utente DB e segna user/password.
4. Stringa risultante: `mysql://utente:password@localhost:3306/elementor_node`

## 3. Carica il codice

Tre opzioni:

### Opzione A — Git (consigliata)
```
Plesk → Git → Add Repository
Repository URL: <tuo repo>
Deploy mode: Automatic on push (opzionale)
Server path: /httpdocs
```

### Opzione B — FTP/SFTP
Comprimi tutto eccetto `node_modules/`, `.next/`, `.env`, `prisma/migrations/dev.db*` e carica.

### Opzione C — Plesk File Manager
Trascina lo zip e estrai.

## 4. Configura Node.js

Pannello dominio → **Node.js → Enable**

| Campo | Valore |
|---|---|
| Node.js version | 20.x |
| Package manager | npm |
| Application mode | production |
| Application root | `/httpdocs` (o dove hai messo i file) |
| Application URL | `https://tuodominio.it` |
| Application startup file | `server.js` |

### Variabili d'ambiente (Custom env)

Clicca su **Custom environment variables** e aggiungi:

```
DATABASE_URL = mysql://utente:password@localhost:3306/elementor_node
AUTH_SECRET = <generata con openssl rand -base64 32>
AUTH_URL = https://tuodominio.it
AUTH_TRUST_HOST = true
ANTHROPIC_API_KEY = sk-ant-...
ANTHROPIC_MODEL = claude-sonnet-4-6
NODE_ENV = production
PORT = 3000
UPLOAD_DIR = ./public/uploads
PUBLIC_URL = https://tuodominio.it
```

## 5. Installa dipendenze

Pulsante **NPM install** (richiede 2-5 minuti).

## 6. Build produzione

Sezione **Run script** del pannello Node.js, esegui:

- `build` — compila Next.js per produzione

## 7. Riavvia l'app

Clicca **Restart App**.

## 8. Installazione guidata via browser

Apri `https://tuodominio.it` → vieni reindirizzato automaticamente a `/install`.

Wizard a 4 step:
1. **Database** → "Testa connessione" + "Crea tabelle" (esegue `prisma db push`)
2. **Admin** → email, nome, password del primo utente
3. **Sito** → nome, tagline, colore primario
4. **AI** → Anthropic API key (opzionale)

Al termine viene creato `.install.lock` e `/install` non sarà più accessibile. Per re-installare, elimina il file dal filesystem.

## 9. Caricamento file: permessi

Da SSH:
```bash
cd /var/www/vhosts/tuodominio.it/httpdocs
chmod 755 public/uploads
chown utente_dominio:psacln public/uploads
```

Sostituisci `utente_dominio` con quello che vedi in Plesk → Hosting Settings.

## 10. Servizio statici via nginx (opzionale, consigliato)

In **Apache & nginx settings → Additional nginx directives**, aggiungi:

```nginx
location /uploads/ {
  alias /var/www/vhosts/tuodominio.it/httpdocs/public/uploads/;
  expires 30d;
  add_header Cache-Control "public, immutable";
}

location /_next/static/ {
  alias /var/www/vhosts/tuodominio.it/httpdocs/.next/static/;
  expires 365d;
  add_header Cache-Control "public, immutable";
}
```

Riduce il carico Node.js per asset statici.

## Troubleshooting

**App non parte**: verifica i **log** in Plesk Node.js → "Show log". Errori comuni:
- `Can't reach database`: controlla `DATABASE_URL` (host = `localhost` o `127.0.0.1` su Plesk standard).
- `AUTH_SECRET missing`: aggiungilo nelle custom env e riavvia.
- `EACCES uploads`: vedi step 9.

**Hot reload non funziona**: in produzione non c'è hot reload, solo `Restart App` dopo deploy.

**Build fallisce per memoria**: in **Custom env** aggiungi `NODE_OPTIONS = --max-old-space-size=2048`.

**SSL/HTTPS**: usa il pulsante "Let's Encrypt" del dominio per ottenere certificato gratuito.

## Gotchas testati in produzione

Cose che ci hanno bruciato tempo durante deploy reali. Tienili presenti per i prossimi deploy.

### Plesk Passenger cerca `app.js`, non `server.js`

Lo `PassengerStartupFile` di default è **`app.js`**. Se chiami il tuo entry `server.js` (come in questo progetto), crea un wrapper `app.js` in root:

```js
// app.js
require('./server.js');
```

In alternativa cambia lo startup file dal pannello Node.js a `server.js`.

### `.htaccess` con direttive `PassengerNodejs` → 500 Internal Server Error

Plesk non ammette `PassengerNodejs`/`PassengerStartupFile` in `.htaccess` (AllowOverride limitato). Risultato: `[core:alert] /.htaccess: PassengerNodejs not allowed here` e 500 su tutte le route. Plesk gestisce già Passenger via `httpd.conf` autogenerato — **rimuovi `.htaccess`** dalla webroot, non serve.

### Standalone Next.js ha un suo `.env` interno

`output: 'standalone'` copia il `.env` della root dentro `.next/standalone/.env` al momento del **build**. A runtime Next.js legge quel file, non quello esterno. Se aggiungi/modifichi una env var **dopo il build**:

```bash
# Sincronizza i due .env e riavvia
cp /httpdocs/.env /httpdocs/.next/standalone/.env
chown <utente>:psacln /httpdocs/.next/standalone/.env
touch /httpdocs/tmp/restart.txt
```

In alternativa ricompila (`npm run build`) — il build rigenera `.next/standalone/.env` partendo da `.env`.

### Build standalone richiede copia manuale di `static/` e `public/`

Next.js standalone NON copia automaticamente `.next/static/` e `public/` dentro `.next/standalone/`. Senza queste copie l'app risponde 200 sulla home ma 404 su tutti gli asset (JS, CSS, immagini).

Dopo ogni build:
```bash
cp -r /httpdocs/.next/static /httpdocs/.next/standalone/.next/static
cp -r /httpdocs/public      /httpdocs/.next/standalone/public
chown -R <utente>:psacln    /httpdocs/.next
```

### Race condition `prisma.site.upsert` durante prerender

Durante `npm run build` Next.js prerendera in parallelo. Se più worker chiamano `prisma.X.upsert({ where: { id: 1 }, ... })` insieme la prima volta, possono fallire con `Unique constraint failed on the constraint: PRIMARY`. Pre-seedare il singleton **prima** del build risolve solo in parte (residua una race tra worker che leggono cache stale).

Pattern race-safe:
```ts
let row = await prisma.site.findUnique({ where: { id: 1 } });
if (!row) {
  try {
    row = await prisma.site.create({ data: { id: 1, ... } });
  } catch {
    row = await prisma.site.findUnique({ where: { id: 1 } });
    if (!row) throw new Error('Site singleton unavailable');
  }
}
```

### Rsync e file con `-` iniziale negli uploads

`public/uploads/` può contenere file generati con nomi che iniziano per `-` (es. `-lvOTkwx6c39.png`). rsync li interpreta come opzioni e si blocca senza errori espliciti. Sintomo: rsync gira indefinitamente trasferendo pochi MB. Usa **tar + ssh** come fallback, oppure rsync con `--protect-args` (`-s`):

```bash
cd /Users/you/Desktop
tar czf /tmp/deploy.tar.gz \
  --exclude='project/node_modules' \
  --exclude='project/.next' \
  --exclude='project/.git' \
  --exclude='project/.env' \
  --exclude='project/__clones__' \
  --exclude='project/__refinement__' \
  --exclude='project/__tmp__' \
  --exclude='project/__sites__' \
  --exclude='project/tmp' \
  project
scp /tmp/deploy.tar.gz root@server:/tmp/
ssh root@server 'tar xzf /tmp/deploy.tar.gz -C /var/www/vhosts/dominio/httpdocs/ --strip-components=1'
```

### Cleanup necessario per cartelle di sviluppo

Da escludere SEMPRE in rsync/tar verso produzione:
- `node_modules/`, `.next/`, `.git/`, `.env`
- `__clones__/`, `__refinement__/`, `__tmp__/`, `__sites__/`, `tmp/` — generate da skill `element-node-builder`, possono pesare GB.

### Licenza Plesk: verificare prima di creare il dominio

Plesk Web Admin Edition limita il numero di domini (es. 10). Comando per scoprire l'errore:
```
plesk bin domain --create ...
→ There are no available resources of this type (domains) left.
```
Conta i domini attivi: `plesk db -e "SELECT COUNT(*) FROM domains WHERE htype='vrt_hst'"`. Limite nella chiave: `grep "plesk-unified:domains" /etc/sw/keys/keys/key*`. Soluzioni: upgrade licenza oppure rimuovi un dominio inutilizzato.

### Reset password admin via Node + bcrypt

Se hai importato un DB da locale senza conoscere la password, resetta così (sul server):
```bash
cd /var/www/vhosts/dominio/httpdocs
sudo -u <utente> -H node -e "
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const h = await bcrypt.hash('NuovaPwd!', 10);
  await p.user.update({ where: { email: 'admin@example.com' }, data: { passwordHash: h } });
  console.log('Reset OK');
  await p.\$disconnect();
})();
"
```

### Migrazione contenuti da locale (DB)

Il rsync/tar trasferisce solo **codice + uploads**. I contenuti del CMS (pagine, theme blocks, post, settings) vivono nel DB. Dump+import:
```bash
# Locale (Docker)
docker exec elementor-node-mysql mysqldump \
  -u elementor -pelementor_pass_2026 \
  --default-character-set=utf8mb4 \
  --single-transaction --no-tablespaces \
  --column-statistics=0 \
  elementor_node > /tmp/db.sql

# Upload
scp /tmp/db.sql root@server:/tmp/

# Server
ssh root@server 'mysql -u<dbuser> -p<dbpass> <dbname> < /tmp/db.sql'
```
Poi reset password admin (vedi sopra), perché gli hash bcrypt del locale non saranno noti.
