# Element Node — API Quick Reference

Endpoint critici, auth richiesta, payload tipici.

## Auth

Due meccanismi:

1. **Bearer token** (`EN_KEY`) per endpoint con `authOrBearer`: import, export, admin actions.
2. **Session cookie** (NextAuth Credentials) per endpoint con `auth()`: settings, media upload, profile.

### Login programmatico (per session cookie)

```js
const baseUrl = 'http://localhost:3000';
const cookieJar = new Map();
const fetchCk = async (url, opts = {}) => {
  const h = new Headers(opts.headers || {});
  if (cookieJar.size > 0) h.set('cookie', [...cookieJar].map(([k,v]) => `${k}=${v}`).join('; '));
  const r = await fetch(url, { ...opts, headers: h, redirect: 'manual' });
  for (const sc of r.headers.getSetCookie?.() || []) {
    const [pair] = sc.split(';');
    const [k, ...v] = pair.split('=');
    if (k && v.length) cookieJar.set(k.trim(), v.join('=').trim());
  }
  return r;
};
const csrf = (await (await fetchCk(`${baseUrl}/api/auth/csrf`)).json()).csrfToken;
await fetchCk(`${baseUrl}/api/auth/callback/credentials`, {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    email: 'admin@example.com', password: '...',
    csrfToken: csrf, callbackUrl: `${baseUrl}/admin`, json: 'true',
  }).toString(),
});
// Adesso fetchCk è autenticato con cookie sessione
```

## Import blueprint

```
POST /api/admin/import
Auth: Bearer EN_KEY (scope: site.import)
Body: { blueprint: {...}, options: { dryRun, strategy: 'merge'|'replace', skipSiteSettings } }
```

Schema body validato con Zod. Top-level: `blueprint` deve passare `siteBlueprintSchema`.

⚠️ **Gotcha**: se metti `blueprint.site.theme` con solo `colors` e `typography` parziali, ricevi `400 validation_error` con 5 "Required" su blueprint. `themeSchema` richiede TUTTI i sotto-oggetti (colors, typography, layout, radius, shadows, spacing). **Soluzione**: ometti `site.theme` dal blueprint, e dopo l'import usa `PATCH /api/settings/site` (vedi sotto).

## Update theme/colors (dopo l'import)

```
PATCH /api/settings/site
Auth: Session cookie (admin login)
Body: { theme: { colors: {...full...}, typography: {...full...}, ... } }
```

Per modificare SOLO i colori brand senza compilare lo schema completo:

```js
// 1. GET current theme
const cur = await (await fetchCk(`${baseUrl}/api/settings/site`)).json();
// 2. Override solo i campi che ti interessano
const newTheme = {
  ...cur.theme,
  colors: {
    ...cur.theme.colors,
    primary: '#2563EB',
    secondary: '#1e40af',
    accent: '#60A5FA',
    text: '#1b1b1b',
    background: '#ffffff',
  },
  typography: { ...cur.theme.typography, fontHeading: 'Inter, system-ui, sans-serif' },
};
// 3. PATCH
await fetchCk(`${baseUrl}/api/settings/site`, {
  method: 'PATCH',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ theme: newTheme }),
});
```

## Upload media

```
POST /api/media/upload
Auth: Session cookie (NextAuth)
Body: multipart/form-data con file (field name "file")
Response: { id, url, mime, size, width, height, ... }
```

`url` ritornato è del tipo `/uploads/<nanoid>.<ext>` → usa quello nel blueprint.

`upload-assets.mjs` fa già login + upload batch. Non riscriverlo a mano.

## Export

```
GET /api/admin/export
Auth: Bearer EN_KEY (scope: site.export)
Response: Site Blueprint JSON completo (per backup o diff)
```

## Crea API key (admin)

```
POST /api/admin/api-keys
Auth: Session cookie (role: ADMIN)
Body: { name: string, scopes: string[], expiresInDays?: number }
Response: { id, name, prefix, tail, scopes, plaintext, message }
```

⚠️ `plaintext` viene mostrato UNA volta. Salvalo subito.

Scopes validi: `*`, `site.read`, `site.write`, `site.import`, `site.export`.

## Pagine singole

```
POST /api/pages        — crea pagina
PATCH /api/pages/:id   — modifica
DELETE /api/pages/:id  — elimina
```

Per ricreare un sito intero, **non** usare endpoint singoli: usa `/api/admin/import` in merge.

## Form, popups, theme-blocks

| Endpoint | Auth |
|---|---|
| `POST /api/forms` | Bearer (site.write) |
| `POST /api/popups` | Bearer |
| `POST /api/theme-blocks` | Bearer |

Anche qui: meglio metterli nel blueprint e fare import bulk.

## Errori comuni

| HTTP | Codice | Significato |
|---|---|---|
| 400 | `validation_error` | Blueprint non rispetta schema Zod. Leggi `details.fieldErrors`. |
| 401 | `invalid_api_key` | Bearer scaduto/sbagliato |
| 401 | `unauthorized` | Session cookie mancante (per endpoint auth() puri) |
| 403 | `insufficient_scope` | La key non ha lo scope richiesto |
| 404 | — | Endpoint o risorsa non esistente |
| 422 | — | Validation a livello business |

## Patterns ricorrenti

### Reset completo del sito (cancella tutto, parti da zero)

```bash
# 1. Backup
node scripts/export.mjs > backup.json
# 2. Import con replace
node scripts/import.mjs new-site.json --replace
# 3. Aggiorna theme (omesso dal blueprint per evitare validation)
node update-theme.mjs   # script ad-hoc che fa PATCH /api/settings/site
```

### Patch incrementale (clone sezione per sezione)

```bash
# Stato del CMS già esistente. Voglio modificare solo home.
node scripts/import.mjs partial-update.json   # merge (default)
# Riapri il browser, vedi solo home cambiata. Le altre pagine intatte.
```

### Diff visivo dopo modifica

```bash
node scripts/diff-clone.mjs https://target.it http://localhost:3000
# Score + gap list
```
