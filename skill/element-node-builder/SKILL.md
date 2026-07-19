---
name: element-node-builder
description: Genera/clona/modifica siti completi su Element Node CMS via API. Use when user says "ricrea sito", "clona sito da [URL]", "crea sito per [brand/azienda]", "esporta/importa sito Element Node", "Element Node site builder", "refresh grafico", "redesign", "rendi moderno", "UX moderna", "look contemporaneo", "rifai il design".
---

# Element Node — Site Builder skill

Pipeline per ricreare/clonare/generare interi siti su Element Node CMS via API REST.

## ⚠️ Filosofia: Claude ricostruisce, NON lo script

Le euristiche su classi CSS (es. `[class*=card]`) non funzionano: ogni sito usa nomi di classi diversi (Tailwind, BEM, custom). **Lo script raccoglie solo dati grezzi**: screenshot, audit DOM, asset. **Claude legge gli screenshot + audit e ricostruisce il blueprint a mano**, sezione per sezione.

Non esistono "blueprint draft auto-generati": vengono solo prodotti dati di partenza che Claude usa come base per scrivere il blueprint a mano.

## Workflow (clone da URL) — 2 fasi

### Fase 1 — Prima passata (bootstrap)

```
1. scripts/clone-site.mjs <url>           → audit.json + screenshots/ + assets/
2. Leggi audit-summary.md (TOC)
3. Apri screenshots/desktop.png per panoramica
4. Scrivi blueprint.json a mano (struttura completa, anche con lacune)
5. scripts/upload-assets.mjs <dir>        → asset caricati su CMS
6. scripts/import.mjs blueprint.json --replace   (solo prima volta)
```

### Fase 2 — Refinement loop (visual comparator agent in loop)

Dopo la prima passata, parte un **loop automatico di refinement** che gira finché il clone non è 100% uguale al target (o finché l'agente comparatore non identifica più gap actionable):

```
LOOP iteration=1..MAX_ITER:
  1. scripts/visual-diff.mjs <target> <clone> --out diff/iter-NN --per-section
     → diff/iter-NN/{target,clone}-full.png + target-sec-NN.png + clone-sec-NN.png

  2. Invoca subagent `element-node-clone-comparator` con prompt:
     "Confronta diff/iter-NN/target-full.png vs clone-full.png.
      Blueprint corrente: <path>. Audit: <path>. Reference: <paths>.
      Scrivi iter-NN-patches.json con tutte le differenze e patch JSON Pointer.
      Set done=true SOLO se non restano differenze critical/major.
      Se ricicli patch dell'iterazione precedente, set loop_warning."

  3. Leggi iter-NN-patches.json
     - Se done=true → ESCI (clone matcha)
     - Se loop_warning presente → ESCI (intervento manuale richiesto)

  4. Applica i patch:
     node scripts/patch-blueprint.mjs blueprint.json iter-NN-patches.json

  5. Re-import:
     node scripts/import.mjs blueprint.json   (merge, NO replace)

  6. Aspetta render (~2s)

  7. Goto step 1 (next iteration)

Stop conditions:
  - done=true
  - iteration > MAX_ITER (default 8)
  - loop_warning (stesso set di patch da 2 iterazioni di fila)
```

### Criterio di stop ("100% uguale al target")

"100%" significa:
- ✅ Tutti i testi verbatim corrispondenti
- ✅ Tutte le sezioni presenti, ordine corretto
- ✅ Numero corretto di card/colonne per sezione
- ✅ Palette brand allineata
- ✅ Asset (immagini, video, iframe) tutti presenti
- ✅ Le differenze rimanenti sono solo cosmetiche/sub-pixel (rendering font, anti-aliasing, ecc.) — `unfixable` documentate

L'agente comparatore decide lui quando `done=true`. Se sbaglia, l'utente vede il diff finale e può chiedere altra iterazione manualmente.

⚠️ Importante: lavora **sezione per sezione** in Fase 1, ma il refinement loop di Fase 2 può patchare cross-section in parallelo (è l'agente che decide).

## Workflow alternativi

**Genera da brief**: salta clone-site.mjs, vai direttamente a scrivere blueprint da zero (usando `references/example-blueprint.json` come template).

**Apply blueprint pronto**: salta a step 5-6.

## Workflow: Refresh grafico / Redesign

Quando l'utente chiede "rendi moderno", "refresh UX", "redesign", "look contemporaneo", "non la copia esatta", "look premium/agency/magazine":

```
1. Leggi modern-redesign-playbook.md COMPLETO (è la guida operativa)
2. clone-site.mjs <url> per dati grezzi (solo se non già fatto)
3. Analizza il LOGO target (Read del file in assets/) per estrarre brand colors veri
4. AskUserQuestion con 3-4 palette + preview ASCII (vedi playbook sez 4)
5. PATCH /api/settings/site con theme aggiornato (mai theme nel blueprint)
6. Costruisci blueprint applicando pattern moderni:
   - Hero: mesh gradient + animated-headline + glass stats card
   - Servizi: bento layout (1 big + 3-4 small)
   - Card: icon-box con _styles per icona+titolo+testo, image-box se serve immagine
   - Stats: counter widget puro (animato) o html widget (con gradient text)
   - Testimonianze: testimonial-carousel
   - Process/come-lavoriamo: 4 icon-box numerati 01/02/03/04
   - CTA finale: section gradient + button widget nativo
7. REGOLA WIDGET (vedi widget-quirks sez 10b):
   - SEMPRE preferire widget nativi (icon-box, image-box, counter, testimonial, button)
   - Per markup HTML complesso usa widget `html` (textarea editabile)
   - NON usare widget `text` per HTML complesso (TipTap nasconde il codice all'utente)
8. BILANCIAMENTO LAYOUT (vedi playbook sez 5):
   - section.gap = '0' SEMPRE
   - Widths che sommano ESATTAMENTE a 100 per ogni riga
   - "Gap visivo" via padding di column
9. Import --replace + visual-diff per verifica
```

⚠️ **Punto critico**: se l'utente dice "i colori non rispecchiano" o "non è il brand giusto", segui il flusso del playbook sez 7 — non difendere la scelta, vai al logo, ripropone palette via AskUserQuestion.

## Configurazione (una volta)

```bash
export EN_URL="http://localhost:3000"
export EN_KEY="en_live_..."        # genera da /admin/api-keys (scope site.import + site.export)
export EN_EMAIL="admin@example.com" # per upload-assets.mjs (NextAuth credentials)
export EN_PASSWORD="..."
```

Dipendenze degli script (prima volta):
```bash
cd ~/.claude/skills/element-node-builder/scripts && npm install
# scarica Playwright (~150MB) + pixelmatch + pngjs
```

## ⚠️ REGOLA D'ORO: REPLICA FEDELE, MAI RIGENERARE

**Quando cloni un sito esistente, copia i testi VERBATIM. Sempre.**

- ✅ Titoli, paragrafi, CTA, label, voci menu, indirizzi, orari, prezzi, slogan → **testi originali parola per parola**
- ✅ Lista di 8 servizi → riproduci tutti e 8, non 4
- ✅ Stats "2000 MQ DI SPIAGGIA" → la metti com'è
- ✅ Badge "POPOLARE", "NOVITÀ" → fanno parte del design, vanno riprodotti
- ❌ Mai parafrasare "con tono coerente". Il cliente vuole il SUO sito.
- ❌ Mai inventare emoji se l'originale non le ha (usa `icon-box` con Lucide).
- ❌ Mai saltare elementi (video, mappe, price-table, team profile).

Eccezione **unica**: se l'utente chiede esplicitamente "genera da brief" o "rigenera i testi", allora copy nuova. Default = replica fedele.

## ⚠️ Riconoscere strutture senza affidarsi a class CSS

Quando l'audit ti dà una sezione, usa **grids** (rilevamento generico già fatto dallo script: container con >1 figlio della stessa larghezza) per identificare strutture ripetute. Lo script non lo "etichetta" come card/feature/service — sei tu che decidi guardando lo screenshot:

| Cosa vedi nello screenshot | Mappa a |
|---|---|
| 3-6 box con icona + titolo + testo | `icon-box` × N in colonne `width: 100/N` |
| 3-6 box con immagine + titolo + testo | `image-box` o `image` + `heading` + `text` per ogni colonna |
| Griglia di logo partner senza testo | `image` × N |
| 3 box con prezzo + features | `price-table` × N |
| 1-3 quote con autore | `testimonial` o `testimonial-carousel` |
| 3+ video YouTube | `video` widget × N in colonne |
| Stats numerici grandi | `counter` × N |
| Tabs / Accordion / FAQ | `tabs` / `accordion` (1 widget con `items`) |
| Hero con immagine + titolo + CTA | `hero` widget singolo |
| Slider hero (più slide) | `hero-slider` |
| Form contatti inline | `contact-form` |

⚠️ **Se non sei sicuro**: guarda lo screenshot della sezione (`screenshots/section-NN.png`) prima di scrivere. Non ricostruire alla cieca.

## Anti-pattern (le cause del "svogliato")

1. **Lavorare in batch su tutte le sezioni**: quando hai scritto la sezione 8 di 11, sei già stanco e tagli. Patcha **una sezione alla volta, importa, verifica, prossima**.
2. **Saltare gli screenshot per-sezione**: non scrivere blueprint guardando solo `audit.json`. I dati grezzi non ti dicono "questa griglia in realtà ha icone Lucide colorate sopra il titolo" — solo l'occhio lo vede.
3. **Non importare in merge dopo ogni sezione**: senza feedback visivo, lavori al buio. Importa, ricarica, guarda, patcha.
4. **Tutto in `replace`**: il replace è solo per il reset iniziale. Dopo, usa **`merge`** e patcha singole pagine.
5. **`site.theme` nel blueprint senza schema completo**: lo schema `themeSchema` ha 30+ campi obbligatori. Per cambiare solo i colori brand, **omettilo dal blueprint** e usa `PATCH /api/settings/site` dopo l'import (vedi `references/api-quickref.md`).

## Riferimenti (leggere SEMPRE prima di proporre patch)

| File | Per cosa |
|---|---|
| `references/widget-reference.md` | TUTTI i widget con TUTTI i campi del catalogo |
| `references/widget-quirks.md` | **EMPIRICO**: cosa Element Node rende vs ignora. Pattern `_styles`. CSS vars `--en-*`. Selettori reali. **Sez 10b**: text vs html vs widget nativi (regola di scelta). |
| `references/modern-redesign-playbook.md` | **OBBLIGATORIO per refresh grafici**: pattern moderni 2026 (bento, glass, mesh gradient), scelta palette, bilanciamento layout, mapping pattern → widget |
| `references/section-settings.md` | Settings sezione/colonna |
| `references/cms-introspection.json` | Snapshot DOM/CSS reale del CMS (output di `introspect-cms.mjs`) |
| `references/example-blueprint.json` | Esempio completo end-to-end |
| `references/api-quickref.md` | Endpoint API critici (login, theme update, import, media) |

⚠️ **NON improvvisare**. Il PageRenderer di Element Node NON usa classi CSS namespaced — tutti i widget renderizzano con `style` inline. Le settings di colonna `boxShadow`/`borderRadius` vengono ignorate. Pattern `_styles` sui widget `icon-box`/`testimonial` è il modo corretto per card stilate. Vedi `widget-quirks.md` per i dettagli.

## Layout: le sezioni hanno UN solo flex container

Il `PageRenderer` mette tutte le colonne in `display:flex; flex-wrap:wrap` con `flex: 0 0 width%`. Quindi:

- **Colonne con `width: 100`** → vanno a capo da sole.
- **4 colonne in riga**: `[25,25,25,25]`. Per 3: `[33,33,34]`. Per 2: `[50,50]`.
- **Titolo full-width tra righe di card**: aggiungi colonna `width: 100` con heading tra i gruppi.
- **Mai `width: 25` da sola**: lascia 75% vuoto.

Pattern multi-riga:
```js
section({...}, [
  { width: 100, elements: [heading('Titolo')] },          // riga 1
  { width: 25, elements: [iconBox(...)] },                // riga 2: 4 card
  { width: 25, elements: [iconBox(...)] },
  { width: 25, elements: [iconBox(...)] },
  { width: 25, elements: [iconBox(...)] },
  { width: 100, elements: [callToAction(...)] },          // riga 3
])
```

## Sticky header

L'header è un `themeBlock` di tipo `HEADER` reso come `<header>` PRIMA del `<main>`. `sticky: true` su section interna → `position: sticky; top: 0` ma resta nel flow.

❌ **Mai** aggiungere `body { padding-top: 80px }` in `customCss` con header sticky → crea spazio bianco fantasma.

## Line-break

- `text.html` → accetta `<br>` e HTML inline ✅
- `heading.text` / `testimonial.text` / `button.text` → stringa pura, niente `<br>`
- `icon-box.text` → HTML inline OK

Per line-break in stringa pura: usa più widget consecutivi.

## ⚠️ REGOLA (2026-07-16): NATIVE-FIRST SEMPRE — se il widget non copre il caso, ESTENDI IL CMS

Direttiva dell'utente, vincolante: i blueprint usano SEMPRE widget nativi. Se un pattern del target
non è riproducibile coi widget nativi, la mossa corretta è **estendere il CMS** (settings +
renderer in `src/components/editor/widgets/render.tsx`, `src/components/public/PageRenderer.tsx`,
schema in `src/lib/widgets-schema.ts`, pannello in `PropertyPanel.tsx`), deployare, e POI usare il
widget nativo esteso. NON ripiegare su `html`.

Flusso quando manca una capability:
1. Identifica il gap (es. "icona quadrata gradient", "bottoni in riga", "radius su colonna")
2. Estendi: setting retrocompatibile (default = comportamento attuale) + campo nello schema editor
   (⚠️ select Radix: mai `value: ''` — usa sentinel `auto|none|0|inherit`)
3. Se estendi `subStyle`/spread di stili: le chiavi undefined vanno RIMOSSE dall'oggetto
   (`delete out[k]`), altrimenti `{...base, ...sub}` cancella gli stili base
4. Typecheck (`npx tsc --noEmit`) o build server, deploy, poi blueprint nativo
5. Documenta il campo nuovo in `references/widget-reference.md` + quirks

`html` resta legittimo SOLO per: glifi SVG brand non in Lucide (es. logo WhatsApp — o meglio:
`icon-box.customSvg`), iframe di terze parti senza widget (Google Maps), DOM one-off davvero
irripetibile. Ogni nuovo caso `html` è un segnale che manca un'estensione da fare.

Capability già estese (2026-07-16, vedi widget-reference): colonne con
borderRadius/boxShadow/border/overflow + `elementsDirection: 'row'` (bottoni/pill/loghi
affiancati nativi); `_styles` con width/height/display/gap/objectFit; icon-box con quadrato
gradient + `iconStyle: fill` + `customSvg`; image-box con ratio/radius/CTA badge; button con
radius/colori/icona/ombra; accordion `variant: flat`; counter labelColor/Size; heading
letterSpacing/transform; social-icons `variant: button`.

**Regola brand sui colori**: lascia `color`, `size`, `weight` come `""` per ereditare dal brand globale. Specifica solo per contrast esplicito.

## Endpoint API rilevanti

| Endpoint | Auth | Scopo |
|---|---|---|
| `POST /api/admin/import` | Bearer | Applica blueprint (merge/replace) |
| `GET /api/admin/export` | Bearer | Dump completo |
| `PATCH /api/settings/site` | Session cookie | Update theme/colors/typography |
| `POST /api/media/upload` | Session cookie | Upload singolo asset |

Dettagli completi: `references/api-quickref.md`.

## Scripts

### `introspect-cms.mjs [--keep]`
**Una tantum** dopo install del CMS o dopo aggiornamenti widget. Importa pagina test con tutti i widget, dumpa selettori CSS reali, settings rispettate/ignorate, CSS variables `--en-*`. Aggiorna `references/cms-introspection.json` + `cms-introspection.md`. Necessario per dare all'agente comparatore visibilità reale sul PageRenderer.

### `clone-site.mjs <url> [--no-assets] [--no-section-shots]`
Raccoglie dati grezzi. **NON genera blueprint** — produce:
- `audit.json` (sezioni + struttura + stili + grids generici)
- `audit-summary.md` (TOC leggibile)
- `screenshots/desktop.png` + `mobile.png` + `section-NN.png` per ogni sezione
- `assets/` con hash filename + assetMap in audit.json

### `upload-assets.mjs <clone-dir>`
Login NextAuth + upload di tutto `assets/` su `/api/media/upload`. Restituisce mapping URL originale → URL CMS. **Lo applichi tu al blueprint** quando scrivi le sezioni (referenzi i path `/uploads/...` invece di quelli originali).

### `tag-assets.mjs <clone-dir>`
Prima passata euristica (size, aspect ratio, formato, nome) sugli asset scaricati. Produce `assets-labels.json` con classificazione: `logo-candidate | photo | icon | screenshot | favicon | avatar`. Per gli ambigui (`needsVision: true`), l'agente comparatore deve aprire l'immagine con Read e completare il campo `semantic` (es. `{ label: "Allianz logo", kind: "brand-logo" }`). Permette di matchare correttamente "logo Allianz" all'asset giusto invece di usare placeholder.

### `import.mjs <blueprint.json> [--dry-run] [--replace]`
Manda a `/api/admin/import`. Default: merge.

### `diff-clone.mjs <url-orig> <url-clone> [--out report.json]`
Score 0-100 + lista gap concreti (basato su selettori, meno preciso del comparatore agent).

### `visual-diff.mjs <url-target> <url-clone> [--out <dir>] [--per-section]`
Cattura screenshot di target e clone in coppia. Con `--per-section` produce anche slice per sezione alla stessa Y. **Input principale del comparatore agent.**

### `patch-blueprint.mjs <blueprint.json> <patches.json> [--out <file>]`
Applica una lista di operazioni JSON Patch (RFC 6902-like) al blueprint:
- `replace`, `add`, `remove`, `move`, `copy`
- Path JSON Pointer: `/pages/0/content/sections/3/columns/0/elements/1/settings/title`
- Output: blueprint patchato (in-place o `--out`)

### `export.mjs > backup.json` / `blueprint-validate.mjs <file>` / `scrape.mjs <url>`
Già esistenti.

## Subagent: element-node-clone-comparator

In `~/.claude/agents/element-node-clone-comparator.md` c'è un subagent dedicato che fa il visual diff e produce il JSON patch list. Lo invochi con il tool `Agent`:

```
Agent({
  subagent_type: 'element-node-clone-comparator',
  description: 'Iter NN clone comparison',
  prompt: `
    Confronta:
    - target: /clones/.../diff/iter-NN/target-full.png
    - clone:  /clones/.../diff/iter-NN/clone-full.png
    - per-sezione: target-sec-NN.png e clone-sec-NN.png alla stessa Y

    Blueprint corrente: /clones/.../blueprint.json
    Audit: /clones/.../audit.json
    Reference: ~/.claude/skills/element-node-builder/references/widget-reference.md
               ~/.claude/skills/element-node-builder/references/section-settings.md

    Iterazione precedente (per anti-loop): /clones/.../diff/iter-(NN-1)-patches.json (se esiste)

    Scrivi il risultato a: /clones/.../diff/iter-NN-patches.json
    Format: { iteration, summary, score, done, differences[], unfixable[], loop_warning? }

    Set done=true SOLO se non restano differenze critical/major.
  `
})
```

L'agente è specializzato: legge gli screenshot direttamente con Read, conosce lo schema Element Node, produce JSON patch ops verificate. Tornerà un summary; il JSON dettagliato lo trovi nel file scritto.

## Best practices

1. **Backup prima di replace**: `node scripts/export.mjs > backup-$(date +%Y%m%d-%H%M).json`
2. **Replace solo all'inizio** del clone (per resettare). Dopo usa merge.
3. **Dry-run la prima volta**: `import.mjs file.json --dry-run`
4. **Status `DRAFT` di default**, `PUBLISHED` solo a clone confermato.
5. **Diff iterativo**: se score < 90, patcha la sezione specifica e re-importa. Max 3 iterazioni per sezione.

## Errori comuni

- `401 invalid_api_key` → rigenera key
- `403 insufficient_scope` → key senza `site.import`
- `422 validation_error` / `400 validation_error` → leggi il path del campo
- **5 "Required" su `blueprint`** → quasi sempre `site.theme` parziale. Omettilo dal blueprint, usa `PATCH /api/settings/site` per theme.
- `slug already exists` → merge aggiorna, replace cancella
