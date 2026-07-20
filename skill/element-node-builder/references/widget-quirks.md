# Element Node — Widget Rendering Quirks

Reference EMPIRICA di come il `PageRenderer` di Element Node interpreta le settings dei widget. Costruita da:
- Introspezione runtime con `scripts/introspect-cms.mjs` (output in `cms-introspection.json`)
- Analisi statica di `src/components/public/PageRenderer.tsx` + `src/components/editor/widgets/render.tsx`

**Quando scrivi un blueprint, leggi questo prima.** Non c'è altro modo di sapere cosa funziona vs cosa viene ignorato dal CMS.

---

## 1. ⚠️ Il PageRenderer NON usa classi CSS

Tutti i widget renderizzano con `style` inline. **Non esistono** classi come `.en-heading`, `.en-button`, `.en-icon-box`, ecc. — il PageRenderer applica gli stili direttamente come attributo `style="..."`.

**Implicazioni per `customCss`:**

❌ NON funziona:
```css
.en-button { border-radius: 9999px; }
.icon-box .icon { color: red; }
```

✅ Funziona (selettori basati su tag + anchor + gerarchia):
```css
section[data-anchor="vantaggi"] img { border-radius: 12px; }
main > div > section:nth-child(5) h3 { font-weight: 800; }
section[data-anchor="hero"] a[href^="#"] { text-transform: uppercase; }
```

**Pattern raccomandato**: usa `section[data-anchor="<nome>"]` come hook, poi target i tag HTML al suo interno (h1-h6, p, a, img, svg, div).

---

## 2. ⭐ Campo `_styles` nascosto (chiave per personalizzazione)

Alcuni widget supportano un campo speciale `settings._styles` che permette di stilare **parti specifiche** del widget. Non è documentato nel widget catalog ma è la chiave per match fedele al target.

### Widget che supportano `_styles`

| Widget | Keys disponibili |
|---|---|
| `icon-box` | `card`, `icon`, `title`, `text` |
| `testimonial` | `card`, `rating`, `text`, `author`, `role`, `avatar` |

### Campi accettati per ogni key di `_styles`

```jsonc
{
  "fontFamily": "string",
  "fontSize": "string",         // "16px", "1rem"
  "fontWeight": "string|number", // "700", 800
  "lineHeight": "string",
  "letterSpacing": "string",
  "textTransform": "uppercase|lowercase|capitalize|none",
  "textAlign": "left|center|right|justify",
  "color": "string",            // qualsiasi CSS color
  "background": "string",       // colore, gradient, qualsiasi background CSS
  "margin": "string",
  "padding": "string",
  "border": "string",
  "borderRadius": "string",
  "boxShadow": "string"
}
```

### Esempio: icon-box come "card con icona quadrata gradient" (il pattern Smart Agency)

```jsonc
{
  "type": "icon-box",
  "settings": {
    "icon": "Cloud",
    "iconSize": 32,
    "title": "Tutto in Cloud",
    "text": "Accedi ai dati ovunque.",
    "align": "center",
    "_styles": {
      "card": {
        "background": "#ffffff",
        "borderRadius": "16px",
        "padding": "32px 24px",
        "boxShadow": "0 4px 12px rgba(0,0,0,0.08)",
        "border": "1px solid #e5e7eb"
      },
      "icon": {
        "background": "linear-gradient(135deg, #60A5FA, #2563EB)",
        "borderRadius": "12px",
        "padding": "16px",
        "color": "#ffffff"
      },
      "title": {
        "color": "#1b1b1b",
        "fontWeight": 700,
        "fontSize": "20px"
      },
      "text": {
        "color": "#6b7280",
        "fontSize": "14px"
      }
    }
  }
}
```

**⚠️ Nota**: `_styles.icon` setta lo stile del WRAPPER dell'icona, non l'SVG stessa.

**⚠️ GOTCHA CRITICO scoperto empiricamente**: il wrapper dell'icona renderizzato da `icon-box` è `<div style="display:flex; justifyContent: center">` — è **full-width della colonna**. Quindi `_styles.icon` con `background: gradient + padding` produce una **BARRA gradient orizzontale full-width**, NON un quadrato. La funzione `subStyle()` (vedi `widgets/render.tsx:74-94`) non accetta `display`, `width`, `height`, quindi non puoi forzare le dimensioni del wrapper via `_styles`.

**Workaround per "icona in quadrato gradient" (pattern card moderno)**: NON usare `icon-box`. Usa `text` widget con HTML inline che produce esattamente la card desiderata:

```jsonc
{ "type": "text", "settings": { "html":
  "<div style='background:#fff;border-radius:16px;padding:32px 24px;border:1px solid #e5e7eb;box-shadow:0 1px 3px rgba(0,0,0,0.05);'>"
    "<div style='display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;background:linear-gradient(135deg,#3b82f6,#2563EB);border-radius:14px;color:#fff;margin:0 auto 16px;'>"
      "<svg width='28' height='28' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='...lucide path...'/></svg>"
    "</div>"
    "<h3 style='font-size:22px;font-weight:700;color:#1b1b1b;margin:0 0 8px;'>Titolo</h3>"
    "<p style='color:#6b7280;font-size:14px;line-height:1.6;margin:0;'>Testo</p>"
  "</div>"
}}
```

Inline style vince sempre su qualsiasi customCss (vedi sez. 10). Per gli SVG Lucide inline, copia il `<path>` da `https://lucide.dev/icons/<name>` (es. `ShieldCheck`, `Cloud`, `Rocket`).

---

## 3. CSS Variables `--en-*` del theme (60+ disponibili)

Il PageRenderer espone tutto il theme come CSS variables sul `:root`. Usale liberamente in `customCss` con `var(--en-...)`.

### Colors
```
--en-color-primary, --en-color-primary-hover
--en-color-secondary, --en-color-accent
--en-color-text, --en-color-text-muted, --en-color-text-inverse
--en-color-bg, --en-color-surface, --en-color-border
--en-color-success, --en-color-warning, --en-color-danger, --en-color-info
--en-color-custom1, --en-color-custom2, --en-color-custom3
```

### Typography
```
--en-font-heading        (es. "Inter, system-ui, sans-serif")
--en-font-body           (es. "Inter, system-ui, sans-serif")
--en-font-mono
--en-size-base, --en-size-sm, --en-size-md, --en-size-lg, --en-size-xl, --en-size-2xl…6xl
--en-heading-line-height, --en-line-height
--en-heading-weight, --en-body-weight
--en-heading-transform, --en-body-transform
--en-heading-letter-spacing, --en-body-letter-spacing
```

### Layout / Buttons
```
--en-bp-mobile (768px), --en-bp-tablet (1024px)
--en-container-max, --en-gutter, --en-section-padding
--en-button-radius, --en-button-fw, --en-button-px, --en-button-py
--en-radius-sm, --en-radius-md, --en-radius-lg, --en-radius-xl, --en-radius-full
```

**Per cambiare il theme globale**: NON metterlo nel blueprint (lo schema `themeSchema` richiede tutti i campi). Usa `PATCH /api/settings/site` con body `{ theme: {...full schema...} }` — vedi `api-quickref.md`.

---

## 4. Settings di SEZIONE: rendered vs ignorate

Dal source `PageRenderer.tsx` lines 19-100 (vedi `SectionSettings` type + applicazione style):

### ✅ Rispettate (mappate a CSS reale)

| Settings field | Mapping CSS |
|---|---|
| `padding` (shorthand) | `padding` |
| `paddingTop/Bottom/Left/Right` | accetta numero (→ px) o stringa |
| `marginTop/Bottom` | accetta numero o stringa |
| `background` (string semplice) | `background: <value>` |
| `background` (oggetto BgObj) | composto: overlay + image/gradient + color con layering |
| `background.attachment` | `backgroundAttachment` |
| `color` | `color` |
| `gap` | `gap` (su flex container colonne) |
| `minHeight` | `minHeight` |
| `maxWidth` / `containerWidth` | impostato come max-width |
| `sticky: true` | `position: sticky; top: 0` |
| `position: "fixed"` | applicato |
| `zIndex` | applicato se sticky o fixed |
| `boxShadow` | applicato sulla section |
| `borderRadius` | applicato sulla section |
| `contentAlign` | `textAlign` su contenuto |
| `textAlign` | `textAlign` |
| `anchor` | usato come `id` o `data-anchor` (cruciale per customCss!) |

### ⚠️ Behavior

- Se NESSUNO di `padding`/`paddingTop`/`paddingBottom` è settato → fallback automatico `padding: '60px 20px'`
- Se nessun bg specificato → trasparente
- L'`anchor` non rende il `<section id="anchor">` di default in tutti i casi — verifica nell'introspezione

### `background` come oggetto BgObj

```jsonc
{
  "background": {
    "type": "image",           // color|image|gradient
    "color": "#1a1a1a",        // sotto layer
    "image": "/uploads/X.jpg",
    "overlay": "rgba(0,0,0,0.4)",   // SOPRA image/gradient
    "gradient": "linear-gradient(135deg,#92003b,#1f2937)",
    "size": "cover",           // default per image
    "position": "center",
    "attachment": "scroll",    // scroll|fixed|local
    "repeat": "no-repeat"
  }
}
```

Il layering finale è: `overlay, image|gradient, color` (overlay in cima).

---

## 5. Settings di COLONNA: rendered vs IGNORATE

Dal source `PageRenderer.tsx` lines 114-135:

### ✅ Rispettate

| Settings field | Mapping |
|---|---|
| `padding` (shorthand) | `padding` |
| `paddingLeft/Right` | `paddingLeft/Right` |
| `background` (string o BgObj) | `background` |
| `verticalAlign` | mappato a `alignSelf` (`top→flex-start`, `center→center`, `bottom→flex-end`) |
| `textAlign` | `textAlign` |

### ❌ IGNORATE (NON renderizzate dal PageRenderer)

⚠️ Queste settings esistono nel TypeScript ColumnSettings type ma NON vengono applicate al CSS:

- `boxShadow` di colonna ← non hai modo di mettere shadow su singola card-colonna via settings
- `borderRadius` di colonna ← idem

**Workaround per card con shadow/radius**:
1. Usa widget `icon-box` con `_styles.card` (vedi sezione 2 sopra) — la card viene dal widget, non dalla colonna
2. Oppure customCss: `section[data-anchor="vantaggi"] > div > div { box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-radius: 16px; }` (selettore: le colonne sono il secondo livello dentro la sezione, di solito)

### Behavior
- Se nessun `padding` specificato → fallback `padding: '20px'`
- `width` è applicato come `flex: 0 0 width%`
- Le colonne sono dentro `display: flex; flex-wrap: wrap; gap: <section.gap>`

---

## 6. Quirks dei singoli widget

### `heading`
- Renderizza `<{tag}>` (h1-h6) con style inline
- `fontFamily` SEMPRE `var(--en-font-heading)` (non sovrascrivibile per widget singolo)
- `lineHeight` default `var(--en-heading-line-height)`
- `margin: 0` (no margine automatico)
- ❌ Niente classe → no `customCss` mirato senza selettore di sezione

### `text`
- Renderizza `<div>` con `dangerouslySetInnerHTML`
- `fontFamily` SEMPRE `var(--en-font-body)`
- Accetta HTML inline completo: `<br>`, `<strong>`, `<a>`, `<span style="...">`, ecc.
- ✅ **Per stilare CTA custom dentro un text widget**: scrivi `<a href="/foo" style="display:inline-block;background:#f97316;color:#fff;padding:10px 24px;border-radius:9999px;text-decoration:none;font-weight:600;">Prova Gratis</a>` — gli style inline NON vengono sanitizzati

### `button`
- Renderizza `<div><a style="..."></a></div>` o `<div><span></span></div>` (no `<button>`)
- `style: primary|secondary|outline|ghost` — mappato a 4 stili predefiniti via CSS vars
- ❌ NON supporta `borderRadius`, `textTransform`, `letterSpacing`, `class` custom
- ✅ **Per CTA con style custom**: usa `text` widget con HTML inline (vedi sopra)
- Le 4 style consumano CSS vars: `--en-color-primary`, `--en-color-secondary`, `--en-color-text-inverse`, `--en-button-radius`, `--en-button-fw`, `--en-button-py`, `--en-button-px`

### `image`
- Renderizza `<figure style="margin:0"><img style="..."/></figure>`
- `width`/`height`: accetta stringa (`"100%"`, `"300px"`, `"auto"`) — solo input text, niente slider
- ❌ NON ha campi: `maxWidth`, `maxHeight`, `objectFit`, `borderRadius`, `boxShadow`, `aspectRatio`
- ⚠️ Per controllo dimensioni preciso (sizing su griglia, object-fit cover, aspect ratio fisso): l'utente non può configurarlo dal widget editor
- ✅ Workaround: usa `html` widget con `<img style="width:100%;height:240px;object-fit:cover;border-radius:12px;box-shadow:...">` invece di widget `image`. L'editor `html` mostra il codice raw modificabile.
- ✅ Alternativa per `borderRadius`: `customCss` con selettore `section[data-anchor="..."] figure img { border-radius: 12px; }`

### `video`
- YouTube/Vimeo: renderizza `<div style="position:relative;padding-bottom:56.25%"><iframe.../></div>` (16:9 forzato)
- mp4: `<video src="..." controls.../>`
- ❌ Niente `borderRadius` su iframe → workaround customCss

### `icon`
- Renderizza `<svg>` Lucide direttamente (no wrapper div)
- `size`, `color`, `align` (di un wrapper centrato), `link` (wrappa in `<a>`)

### `icon-box` ⭐
- Vedi sezione 2 (`_styles` supportato: `card`, `icon`, `title`, `text`)
- Layout: `<div align>{<div icon-wrapper>{icon}}{<h3>title}{<p>text}</div>`
- Default text color del paragrafo: `#64748b`
- L'icon-wrapper è display:flex, justifyContent auto in base ad `align`
- ⚠️ `iconColor` (top-level) usato solo se `_styles.icon.color` non è settato
- `text` field accetta HTML inline (renderizza con `dangerouslySetInnerHTML`)

### `image-box`
- Layout: `<img full-width borderRadius:8 marginBottom:12><h3><p>` opzionalmente wrappato in `<a>` se `link` settato
- `borderRadius` immagine: HARDCODED 8px — non configurabile
- ⚠️ Niente `_styles` supportato

### `testimonial` ⭐
- `_styles` supportato: `card`, `rating`, `text`, `author`, `role`, `avatar`
- Layout: card con padding 24, border, borderRadius 12, background white default
- Rating: stelle ★ (filled #fbbf24, empty #e5e7eb)
- Avatar: round 44x44 con object-fit cover
- Quote text wrappato in `&quot;...&quot;`
- ✅ Per stilare la card del testimonial come "trasparente" o "scuro": `_styles.card = { background: 'transparent', border: 'none', padding: 0 }`

### `tabs`/`accordion`/`toggle`
- Componenti separati (`TabsWidget`, `AccordionWidget`, `ToggleWidget`)
- Items array con `{title, content}`. Content accetta HTML
- ⚠️ No `_styles` documentato — per personalizzazione usa customCss su selettore di sezione

### `alert`
- Variant info|success|warning|danger → 4 colori predefiniti
- ⚠️ No `_styles`

### `html`
- Renderizza il `code` field con `dangerouslySetInnerHTML`
- **Usabile per QUALSIASI markup custom**, inclusi iframe maps, script embed, layouts custom
- ⚠️ Lo script wrapping minimale: il PageRenderer NON sanitizza l'HTML, ma `<script>` tags potrebbero non eseguire per CSP (test in produzione)

### `counter`
- Componente separato (`CounterWidget`)
- Anima da `from` a `to` in `duration`ms quando entra in viewport
- ⚠️ Negli screenshot Playwright può apparire mid-animation se il timing non è giusto (vedi `visual-diff.mjs` con waitTimeout esteso post-scroll)

### `hero`
- Componente separato. Renderizza un wrapper full-section con bg gradient/image/video
- Supporta: title, subtitle, ctaText, ctaUrl, ctaSecondaryText, ctaSecondaryUrl, bgType, bgImage, bgVideo, bgGradient, bgOverlay, align, height, titleColor, subtitleColor, titleSize
- ⚠️ ATTENZIONE: il widget hero **occupa tutta la sezione**. Se vuoi controllo fine (es. kicker sopra il titolo, pill badges sotto), **NON usare il widget hero** — costruisci una sezione manuale con:
  - `section.settings.background` (gradient/image)
  - colonna 100% con heading kicker + heading title + text subtitle + button + button + html widget per pill

### `hero-slider`
- Slider con frecce/dots/autoplay
- Slides array con `{title, subtitle, ctaText, ctaUrl, bgImage, bgGradient, bgOverlay}`

### `social-icons`
- Render `<a>` con icone per network specificati
- Default size 24, gap 12

### `site-logo`
- Componente che recupera `logoLight`/`logoDark` dalle site settings
- ⚠️ Per cambiare il logo, modifica `site.logoLight` via `PATCH /api/settings/site`

### `nav-menu`
- Items array con `{label, url}`
- Render inline `<nav>` con `<a>` per ogni item

---

## 7. Footer / Header (themeBlock)

I theme block sono pagine speciali renderizzate prima/dopo `<main>`. Stesso schema content `{sections: [...]}` come pagine.

- **Header**: `kind: 'HEADER'`. Renderizzato prima di `<main>`. Per sticky: la PRIMA sezione del header deve avere `settings.sticky: true`.
- **Footer**: `kind: 'FOOTER'`. Dopo `<main>`.
- ⚠️ **Merge import duplica i theme block**: ogni `POST /api/admin/import` con merge crea NUOVI theme block invece di aggiornare gli esistenti (manca matching per `name`). Workaround: usa `replace` strategy OPPURE includere lo stesso `name`+`kind` aggiorna se già esiste. Verifica empiricamente.

---

## 8. Pattern raccomandati per gap noti

### "Card con shadow + radius" senza customCss
Usa `icon-box` con `_styles.card` (vedi sezione 2). Non affidarti a `column.boxShadow`.

### "Immagini con border-radius"
Opzione 1: `customCss` mirato:
```css
section[data-anchor="strumenti"] figure img { border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
```
Opzione 2: widget `html` con `<img style="...">` invece di widget `image`.

### "CTA con stile custom (border-radius pill, uppercase, colore brand)"
Widget `text` con HTML inline:
```jsonc
{ "type": "text", "settings": {
  "html": "<a href=\"/start\" style=\"display:inline-block;background:#f97316;color:#fff;padding:12px 28px;border-radius:9999px;text-decoration:none;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;\">Prova Gratis</a>",
  "align": "center"
}}
```

### "Cambio theme globale colors"
NON nel blueprint. Usa `PATCH /api/settings/site` con theme COMPLETO (vedi `api-quickref.md`).

### "Hero con kicker sopra + pill badges sotto"
NON usare widget `hero`. Costruisci sezione manuale:
```jsonc
{
  "type": "section",
  "settings": { "minHeight": "85vh", "paddingTop": 120, "paddingBottom": 120, "background": {...}, "contentAlign": "center" },
  "columns": [
    { "width": 100, "settings": { "textAlign": "center" }, "elements": [
      { "type": "text", "settings": { "html": "<p style='color:#2563EB;font-weight:600;font-size:14px;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 16px;'>SMART AGENCY</p>", "align": "center" } },
      { "type": "heading", "settings": { "text": "Titolo principale", "tag": "h1", "align": "center", "size": "64px", "weight": "700" } },
      { "type": "text", "settings": { "html": "<p style='max-width:680px;margin:0 auto;'>Sottotitolo...</p>", "align": "center" } },
      { "type": "spacer", "settings": { "height": 32 } },
      { "type": "text", "settings": { "html": "<a href='#' style='display:inline-block;background:#2563EB;color:#fff;padding:12px 24px;border-radius:8px;margin:0 8px;text-decoration:none;font-weight:600;'>Esplora i Servizi</a><a href='#' style='display:inline-block;background:#f97316;color:#fff;padding:12px 24px;border-radius:8px;margin:0 8px;text-decoration:none;font-weight:600;'>Prova Gratis</a>", "align": "center" } },
      { "type": "spacer", "settings": { "height": 24 } },
      { "type": "text", "settings": { "html": "<span style='display:inline-block;padding:6px 16px;background:rgba(96,165,250,0.15);color:#2563EB;border-radius:9999px;font-size:13px;margin:0 4px;'>● Servizi Cloud</span><span style='...'>● AI per Consulenza</span><span style='...'>● Partner Certificati</span>", "align": "center" } }
    ]}
  ]
}
```

### "Footer multi-colonna con lista link"
NON ci sono widget "footer column header" pronti. Costruisci ogni colonna del footer con:
- 1× `heading` (h4, size 18-20px, weight 700)
- 1× widget `text` con `html` contenente `<ul><li><a href="...">Link 1</a></li>...</ul>` con stile inline appropriato

---

## 9. Note finali su customCss

`site.customCss` viene iniettato in `<style>` nella pagina pubblica. Limite ~50.000 chars.

**Tips:**
- Scope tutto sotto `.en-frontend` per evitare contaminazioni admin
- Usa `section[data-anchor="X"]` come hook anchor (verifica nell'introspezione che `data-anchor` venga effettivamente reso, altrimenti usa il `id`)
- Per hover/focus/transition: scrivi qui (i widget non hanno settings hover)
- Per breakpoint mobile: usa `@media (max-width: var(--en-bp-mobile))`

---

## 10b. Editor UX: text vs html vs widget nativi (CRUCIALE per maintainability)

Il widget `text` di Element Node usa **TipTap rich-text editor** — l'utente che modifica una pagina dall'admin vede SOLO il rendering visivo, non l'HTML inline. Se metti `<a style="...">` o `<div style="...background:gradient...">` dentro un `text` widget, **l'utente non può modificarlo dall'editor**: deve aprire il blueprint JSON e cambiarlo a mano.

Il widget `html` invece ha un solo campo `code` con **textarea raw** — l'utente vede esattamente il codice e lo modifica come testo. Trasparente.

### Regola di scelta

| Cosa stai creando | Widget da usare | Perché |
|---|---|---|
| Heading / titolo | `heading` | nativo, editor mostra campo text |
| Paragrafo testuale puro (max 1-2 inline tag) | `text` | TipTap WYSIWYG OK per testo formattato semplice |
| **Card icona + titolo + descrizione** | `icon-box` con `_styles.card/icon/title/text` | nativo, editabile, riusabile |
| **Card immagine + titolo + testo + link** | `image-box` | nativo, struttura fissa ma editabile |
| Numero animato + label | `counter` | nativo |
| Quote autore | `testimonial` con `_styles` | nativo |
| Bottone | `button` | nativo (per stile custom: vedi sotto) |
| **CTA con stile custom** (pill, colore non-theme, uppercase) | `html` con `<a style="...">...</a>` | textarea editabile, NON `text` |
| **Card bento complessa** (gradient bg + immagine overlay + badge + h + p + cta) | `html` widget | textarea editabile, vedi codice |
| **Glass card** (backdrop-filter, layered backgrounds) | `html` widget | textarea editabile |
| Lista link footer | `icon-list` | nativo, ogni voce un campo |
| Logo sito | `site-logo` | usa logo dalle site settings |
| Menu nav | `nav-menu` | items array editabile |

### ❌ Anti-pattern: mai usare `text` per markup HTML complesso

Se stai per scrivere un blocco HTML con `<div style="display:flex;gap:...;">...<svg>...</svg>...<h3>...</h3>...</div>` → **usa `html` widget, NON `text` widget**. L'editor di TipTap di `text` mostra solo il rendering, l'utente non vedrà il codice quando vorrà modificarlo.

### ✅ Pattern decision tree

```
Vuoi inserire un blocco visivo nella pagina?
│
├─ È testo puro o con poca formattazione (bold, italic, link)?
│   → widget `text`
│
├─ È un titolo?
│   → widget `heading`
│
├─ Esiste un widget nativo che corrisponde (icon-box, image-box, counter, testimonial, ecc.)?
│   → USA QUELLO, anche se costringe a layout meno "wow"
│
└─ Serve markup HTML custom (gradient, layout asimmetrico, glass, ecc.)?
    → widget `html` (textarea raw, NON `text` TipTap)
```

### Eccezione: piccolo HTML inline dentro `text`

Va bene mettere dentro `text` cose come `<a href='...' style='color:#0EA5E9;'>link</a>` o `<strong>bold</strong>` — TipTap le rispetta e l'utente può comunque selezionare il testo per applicare formattazione. È il markup STRUTTURALE (div con background, SVG inline, layout flex/grid) che NON va in `text`.

---

## 10d. ⚠️ Trappola Radix UI Select: `value=""` proibito

Quando aggiungi un nuovo campo `control: 'select'` al widget catalog (`widgets-schema.ts`), **NON usare `value: ''` (stringa vuota)** in nessuna opzione. Radix UI Select riserva la stringa vuota per "nessuna selezione → mostra placeholder", e lancia runtime error:

```
A <Select.Item /> must have a value prop that is not an empty string.
```

**Sentinel pattern**: usa un valore non-vuoto che rappresenta "default/nessuno":

| Concetto | Sentinel suggerito |
|---|---|
| "Nessuna scelta", "Originale" (per aspectRatio, objectFit) | `'auto'` |
| "Nessun bordo", "Niente" (per borderRadius) | `'0'` |
| "Nessuna ombra" (per boxShadow) | `'none'` |
| "Default theme" (per color override) | `'inherit'` o `'default'` |

E nel render.tsx, interpreta il sentinel come "non applicare":
```tsx
borderRadius: (val && val !== '0') ? val : undefined
```

Vale anche per altre librerie UI (shadcn Select, headless UI Combobox).

---

## 10c. Limiti UX editor Element Node (al 2026-05)

Limiti noti dell'editor visuale del CMS che condizionano le scelte della skill:

1. **No Copy/Paste Style**: a differenza di Elementor, non esiste un menu contestuale per copiare/incollare lo stile di un elemento su un altro. Conseguenza: layouts ripetuti (es. 3 card icon-box identici) devono essere creati copiando il JSON dal blueprint o riempiendo manualmente settings ogni volta. Per la skill: produrre già blueprint completi con tutte le card configurate, non lasciare "card 1 stilata e card 2-3 da configurare".

2. **Widget `image` con controlli scarsi**: solo `src/alt/width/height/align/caption`. No `maxWidth`, `objectFit`, `borderRadius`, `boxShadow`. Vedi sez. 6 "image" per workaround.

3. **No undo/redo cross-page**: undo funziona dentro la stessa sessione editor, ma se l'utente esce e rientra perde la history.

4. **No grid/flex visual builder**: la disposizione delle colonne è esclusivamente via `width` numerico. Niente drag-to-resize tra colonne.

5. **No responsive preview switcher**: l'editor mostra solo la vista desktop. Per testare mobile l'utente deve aprire la URL pubblica in browser e ridurre viewport.

Queste limitazioni IMPLICANO scelte progettuali per la skill:
- **Generare blueprint completi e ricchi**: meglio "tutto pronto da copiare" che "scheletro da riempire"
- **Pre-applicare `_styles` ovunque serva**: l'utente non potrà replicarli con copy/paste
- **Usare `html` widget per blocchi complessi**: textarea raw è più facile da clonare/modificare manualmente che configurare 10 campi widget separati
- **Documentare nei `customCss` del site le scelte responsive**: l'utente deve poter modificare le media-queries da un solo posto

---

## 11. Pattern moderni per UX redesign (link a playbook)

Per refresh grafici / modernizzazione UX, consulta **`references/modern-redesign-playbook.md`** che documenta:
- Pattern 2026 implementabili in Element Node (bento, glass, mesh gradient, asymmetric)
- Bilanciamento layout (gap=0, widths che sommano a 100)
- Scelta palette (brand-loyal vs tematica, processo per estrarre colori dal logo)
- Tipografia moderna (letter-spacing, font-features OpenType)
- Animazioni disponibili (animated-headline, counter)

---

## 10. Cheatsheet del workflow customCss

Quando l'agente comparatore propone una patch su customCss, deve **verificare**:

1. Il selettore aggancia un elemento reale? Apri Playwright sul clone, `document.querySelector('<selettore>')` deve ritornare non-null.
2. La regola CSS non è override-ata da `style` inline del widget (vince inline > customCss perché stesso peso ma più tardi).
3. Per battere uno style inline serve `!important`:
   ```css
   section[data-anchor="hero"] h1 { font-weight: 800 !important; }
   ```

In dubbio: usa il pattern "html widget con style inline" invece di customCss — quello vince sempre.

---

## 12. Scoperte empiriche — clone di un sito aziendale reale (2026-07-16)

### ⚠️ `data-anchor` viene PERSO alla hydration React
Il SSR emette `data-anchor` solo su alcune sezioni e la hydration client lo rimuove/omette. **Qualsiasi customCss basato su `section[data-anchor=...]` smette di funzionare dopo la hydration.** Usare invece:
- `header.en-site-header` (classe stabile del wrapper header)
- `main section:nth-of-type(N)` (1-based, contando le sezioni della pagina)
- classi custom messe dentro il markup dei widget `html` (es. `<details class="sa-acc">`)

### Header sticky: la section sticky NON basta
`sticky: true` sulla prima section del themeBlock HEADER applica `position:sticky` alla **section**, ma questa è confinata dentro il wrapper `<header>` (alto quanto lei) → non sticka mai. Fix che funziona:
```css
header.en-site-header { position: sticky; top: 0; z-index: 100; }
```

### Merge import DUPLICA i themeBlocks (verificato)
Ogni `POST /api/admin/import` merge con `themeBlocks` presenti CREA nuovi block (nessun matching name+kind). Workflow: importare, poi dedupe SQL tenendo i più recenti:
```sql
DELETE FROM ThemeBlock WHERE id IN (SELECT id FROM (SELECT id FROM ThemeBlock ORDER BY createdAt ASC LIMIT 2) x);
```
Oppure: escludere `themeBlocks` dai merge successivi se non cambiano.

### Uploads su Plesk + Next standalone: 404 senza alias nginx
A runtime l'app scrive in `.next/standalone/public/uploads/` (cwd = standalone) e Next standalone NON serve `public/`. Serve l'alias nginx nel vhost (`/var/www/vhosts/system/<dominio>/conf/vhost_nginx.conf`):
```nginx
location /uploads/ { alias /var/www/vhosts/<sub>/<dominio>/.next/standalone/public/uploads/; expires 30d; }
```
poi `httpdmng --reconfigure-domain <dominio>` (l'include compare solo dopo la rigenerazione) + reload nginx.

### ✅ RISOLTO (16/07 sera): gruppi annidati → widget `box`
Il gap "nessun contenitore annidato" è chiuso: widget `box` (vedi widget-reference) con children ricorsivi, layout row/column, bg/radius/padding/shadow/sticky. I gruppi one-off non richiedono più `html`.

### Widget `accordion` = card bordata, non minimale
Il widget accordion renderizza una card con bordo/bg/triangoli pieni ▲▼. Per accordion "flat" da landing (righe con hairline + chevron colorato) usare widget `html` con `<details>`:
```html
<details open class="sa-acc" style="border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;">
  <summary style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;list-style:none;padding:26px 0;font-size:18px;font-weight:600;">Titolo<svg ...chevron.../></summary>
  <div style="padding:0 0 24px;">Contenuto</div>
</details>
```
customCss: `details.sa-acc summary::-webkit-details-marker{display:none} details.sa-acc[open]>summary svg{transform:rotate(180deg)}`

### Sub-nav sticky del target: verificare che stichi DAVVERO
Un elemento con `position:sticky` nel target può NON stickare mai (parent confinante). Prova del nove: negli screenshot per-sezione scrollati del target, l'elemento appare pinnato? Se no, nel clone va lasciato in-flow (niente sticky), altrimenti copre i titoli.

---

## 13. Estensioni native-first (2026-07-16) — gotcha superati e nuovi

### ✅ SUPERATI (dal deploy 2026-07-16 il CMS supporta nativamente)
- Icona quadrata gradient in icon-box (sez 2): `_styles.icon` con width/height ora funziona (frame interno dedicato)
- boxShadow/borderRadius/border/overflow di COLONNA: rispettati dal PageRenderer
- Bottoni/pill/loghi in riga: `column.elementsDirection: 'row'` (+ elementsJustify/Gap/Align/Wrap)
- Accordion flat, button custom (radius/colori/icona), counter label, heading letterSpacing/transform, social-icons a bottone, image-box con CTA badge: vedi widget-reference "ESTENSIONI"
- La sez. 1 ("PageRenderer NON usa classi") è superata per i wrapper: `en-w en-w-<type>` + `en-site-header` esistono

### ⚠️ NUOVO GOTCHA: spread di stili con chiavi undefined
`{...base, ...subStyle(s,'x')}` con subStyle che ritorna chiavi undefined CANCELLA gli stili base
(React omette la prop). `subStyle()` ora fa `delete` delle chiavi undefined — se aggiungi chiavi
al tipo, mantieni il cleanup. Stesso pattern da rispettare in ogni nuovo widget.

### ⚠️ Import merge duplica SEMPRE i themeBlocks
Confermato sistematico. Se il patch non tocca header/footer: importare SENZA `themeBlocks`.
Se li tocca: importare e poi dedupe SQL (tenere i più recenti):
`DELETE FROM ThemeBlock WHERE id IN (SELECT id FROM (SELECT id FROM ThemeBlock ORDER BY createdAt ASC LIMIT 2) x);`

### ⚠️ scroll-padding con header sticky
Con header sticky via customCss servono anche le regole scroll del target, altrimenti gli anchor
(#servizi ecc.) nascondono i titoli sotto la barra:
`html { scroll-behavior: smooth; scroll-padding-top: 160px; } :target { scroll-margin-top: 160px; }`

### ⚠️ UPLOAD_DIR fuori da .next/standalone
`npm run build` RIGENERA `.next/standalone` cancellando gli uploads se vivono lì. In produzione:
`UPLOAD_DIR` assoluto verso `<vhost>/public/uploads` + alias nginx su quel path. Mai dentro standalone.

## 14. Lezioni empiriche — restyle completo di un sito reale (2026-07-18/19)

### Campi che tradiscono (errori silenziosi)
1. **html widget: il campo è `code`, NON `html`** — con la chiave sbagliata l'SSR sembra ok
   nel curl (il markup appare nel payload RSC!) ma il DOM reale è vuoto. Verificare col DOM,
   non con curl.
2. **social-icons: items `{network: 'facebook', url}` minuscolo** — NON `{icon: 'Facebook'}`.
   Con la chiave sbagliata niente icone, nessun errore.
3. **import: `version` è la stringa `"1.0"`**, non un numero.
4. **contact-form checkbox**: label con HTML inline ok (link informativa); l'etichetta
   esterna è soppressa per i checkbox (era duplicata).

### Layout
5. **Colonne `elementsDirection: row`: justify default = CENTER** — per topbar/righe
   allineate a sinistra specificare SEMPRE `elementsJustify: 'flex-start'`.
6. **Footer multi-colonna: MAI gap flex** (34+22+22+22 + gap sfora il 100% → wrap);
   spaziare con padding di colonna.
7. **Card orizzontali (foto+testo)**: box row + `_flex` per-figlio + `overflow: 'hidden'`
   sul box (il vecchio `_style.overflow` finiva sul wrapper sbagliato e non clippava).
8. **Sezione hero con overlay**: background object `{type:'image', image, overlay}` — il
   renderer ora avvolge i colori puri in linear-gradient (un colore nei layer intermedi
   del background shorthand è CSS INVALIDO e il browser scartava tutto: hero bianco).
   Bug fixato sia in PageRenderer che nel Canvas editor (aveva una COPIA del builder).

### Import / theme blocks
9. **Il merge import DUPLICA sempre i themeBlocks** → import senza themeBlocks se invariati;
   altrimenti dedupe SQL per **(kind, name)** — MAI solo per kind: con l'header/footer EN
   i 4 blocchi sono tutti legittimi.
10. **PATCH /api/settings/site con integrations: SEMPRE GET+merge dell'oggetto completo**
    — lo schema zod riempie i default: un PATCH parziale azzera licenseKey e tutto il resto.
11. Import fallito silenziosamente in un comando concatenato: leggere SEMPRE la risposta
    JSON del curl (created/updated/errors).

### Versioni & update
12. **Bump di package.json a OGNI release** — senza bump le installazioni non vedono
    "aggiornamento disponibile" (il check confronta le versioni, non i commit).
13. Il tarball GitHub (codeload) può restare in cache ~30s dopo il push: se il self-update
    porta la versione precedente, riaspettare e rilanciare.
14. Modifiche allo script self-update: valgono dal *prossimo* update (quello corrente gira
    con lo script vecchio su disco).

### Workflow visual
15. Playwright senza DNS: `--host-resolver-rules=MAP dominio IP`; curl: `--resolve`.
    In zsh le opzioni curl in variabile NON si word-splittano: inline o `${=VAR}`.
16. I counter animano on-scroll e Google Maps non dipinge i tile nel fullPage headless:
    warm-up con scroll + clip mirati, e mai fidarsi del fullPage per gli iframe.
17. Foto sorgente scadenti (dittici con gap): PIL per crop determinstico (scan della
    colonna più chiara) + riupload — meglio di objectPosition alla cieca.

18. **Widget con contenuto max-content (marquee & simili): il wrapper DEVE avere
    `width: 0; minWidth: '100%'`** — la ScrollArea dell'editor (display table) si adatta
    al min-content dei figli: un track da 3600px allarga l'intero canvas e "sposta" il
    layout a destra. `contain: inline-size` NON basta. Il frontend non lo mostra perché
    la catena flex con minWidth:0 lo contiene — testare l'editor su una pagina CHE
    CONTIENE il widget incriminato (il bug non si vede sulle altre).

19. **Form unificati (v1.5.0)**: i widget contact-form con campi inline vengono
    MATERIALIZZATI automaticamente in entità Form ("Form — <pagina>") all'import e al
    salvataggio editor: il widget riceve formId, i campi inline vengono rimossi dal widget
    e il destinatario vive sull'entità (modificabile in /admin/forms, submission raggruppate
    per form). Nei blueprint si continuano a scrivere i campi inline: la conversione è
    trasparente. Il vecchio bucket "Default (legacy)" non si crea più.
20. **Email dei form**: emailProvider in integrations (console = NON invia, solo log).
    Per Brevo: l'API richiede sender registrato; il relay SMTP accetta domini DKIM-autenticati
    → in pratica configurare emailProvider 'smtp' con smtp-relay.brevo.com. nodemailer è
    dipendenza dal v1.4.5.
