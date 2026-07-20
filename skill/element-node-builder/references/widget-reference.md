# Element Node — Widget Reference

Reference completa dei widget supportati con TUTTI i campi accettati. Estratto da `src/lib/widgets-schema.ts` del CMS.

Ogni widget ha:
- **type** — string nel campo `type` dell'elemento
- **defaults** — i valori predefiniti (puoi ometterli se vuoi il default)
- **fields** — tutti i campi accettati in `settings`

**Convenzione**: lascia `color`, `size`, `weight` come `""` per ereditare dal brand globale. Specifica solo per contrast esplicito.

## Indice

**Basic**: heading, image, text, video, button, divider, spacer, icon, image-box, icon-box, icon-list, counter, progress, testimonial, tabs, accordion, toggle, alert, html

**Pro**: hero, hero-slider, posts-grid, contact-form, gallery, countdown, price-table, call-to-action, social-icons, animated-headline, image-carousel, testimonial-carousel, flip-box, share-buttons, reviews, lottie, mailchimp

**General/Theme** (per header/footer/post template): site-logo, site-title, nav-menu, search-form, page-title, breadcrumbs, post-content, post-excerpt, featured-image, post-meta, author-box, posts-list

---

## BASIC

### heading
```jsonc
{ "type": "heading", "settings": {
  "text": "Il mio titolo",       // string. NO <br> (mostrato letterale). Per line-break usa più heading.
  "tag": "h2",                    // h1|h2|h3|h4|h5|h6
  "align": "left",                // left|center|right
  "color": "",                    // hex o "" per brand
  "size": "",                     // CSS size es. "48px" o "" per default
  "weight": ""                    // 300|400|500|600|700|800|900 o ""
}}
```

### image
```jsonc
{ "type": "image", "settings": {
  "src": "https://...",
  "alt": "Descrizione",
  "width": "auto",                // o "300px", "100%"
  "height": "auto",
  "align": "center",              // left|center|right
  "caption": ""
}}
```

### text
```jsonc
{ "type": "text", "settings": {
  "html": "<p>Paragrafo con <strong>HTML inline</strong>.<br/>Anche br.</p>",
  "color": "",
  "size": "",
  "lineHeight": "",
  "align": "left"                 // left|center|right|justify
}}
```

### video
```jsonc
{ "type": "video", "settings": {
  "src": "https://www.youtube.com/watch?v=XXX",
  "type": "youtube",              // youtube|vimeo|mp4
  "autoplay": false,
  "loop": false,
  "controls": true
}}
```

### button
```jsonc
{ "type": "button", "settings": {
  "text": "Clicca qui",           // stringa pura, no HTML
  "url": "/contatti",
  "target": "_self",              // _self|_blank
  "align": "left",
  "style": "primary",             // primary|secondary|outline|ghost
  "size": "md",                   // sm|md|lg
  "fullWidth": false
}}
```

### divider
```jsonc
{ "type": "divider", "settings": {
  "color": "#e2e8f0",
  "weight": 1,                    // 1-20 px
  "style": "solid"                // solid|dashed|dotted|double
}}
```

### spacer
```jsonc
{ "type": "spacer", "settings": { "height": 50 } }   // px
```

### icon
```jsonc
{ "type": "icon", "settings": {
  "icon": "Star",                 // nome icona Lucide (es. Heart, MapPin, Phone)
  "size": 64,
  "color": "",
  "align": "center",
  "link": ""
}}
```

### image-box
```jsonc
{ "type": "image-box", "settings": {
  "image": "https://...",
  "title": "Titolo box",
  "text": "Descrizione",
  "align": "center",
  "link": ""
}}
```

### icon-box
```jsonc
{ "type": "icon-box", "settings": {
  "icon": "Sparkles",             // Lucide
  "iconSize": 56,
  "iconColor": "",
  "title": "Servizio premium",
  "text": "Descrizione (HTML inline supportato).",
  "align": "center"
}}
```

### icon-list
```jsonc
{ "type": "icon-list", "settings": {
  "align": "left",
  "iconColor": "",
  "spacing": 12,
  "items": [
    { "icon": "Check", "text": "Punto 1", "link": "" },
    { "icon": "Check", "text": "Punto 2", "link": "" }
  ]
}}
```

### counter
```jsonc
{ "type": "counter", "settings": {
  "from": 0, "to": 2000,
  "duration": 2000,
  "prefix": "", "suffix": "+",
  "label": "Clienti soddisfatti",
  "size": "64px",
  "color": ""
}}
```

### progress
```jsonc
{ "type": "progress", "settings": {
  "label": "Soddisfazione clienti",
  "percent": 95,
  "color": "",
  "height": 12,
  "showPercent": true
}}
```

### testimonial
```jsonc
{ "type": "testimonial", "settings": {
  "text": "Lavoro fantastico.",   // stringa pura, no <br>
  "author": "Mario Rossi",
  "role": "CEO, Acme",
  "avatar": "https://...",
  "rating": 5                     // 0-5
}}
```

### tabs / accordion / toggle (stessa struttura)
```jsonc
{ "type": "tabs", "settings": {
  "align": "left",                // solo per tabs
  "items": [
    { "title": "Tab 1", "content": "<p>HTML</p>" },
    { "title": "Tab 2", "content": "<p>HTML</p>" }
  ]
}}
```

### alert
```jsonc
{ "type": "alert", "settings": {
  "variant": "info",              // info|success|warning|danger
  "title": "Attenzione",
  "text": "Descrizione",
  "dismissible": false
}}
```

### html
```jsonc
{ "type": "html", "settings": { "code": "<iframe src=\"...\"></iframe>" } }
```

⚠️ Usa solo se NESSUN widget nativo copre il caso (es. iframe Google Maps).

---

## PRO

### hero (singola slide)
```jsonc
{ "type": "hero", "settings": {
  "title": "Costruisci il tuo<br/>brand",       // HTML ammesso (textarea)
  "subtitle": "Piattaforma all-in-one.",
  "ctaText": "Inizia ora",
  "ctaUrl": "#",
  "ctaSecondaryText": "Scopri di più",
  "ctaSecondaryUrl": "#",
  "bgType": "gradient",                          // gradient|image|video|color
  "bgImage": "https://...",
  "bgVideo": "https://.../bg.mp4",
  "bgGradient": "linear-gradient(135deg,#92003b 0%,#1f2937 100%)",
  "bgOverlay": "rgba(0,0,0,0.4)",
  "align": "center",
  "height": "600px",                             // o "100vh"
  "titleColor": "#ffffff",
  "titleSize": "64px",
  "subtitleColor": "rgba(255,255,255,0.85)"
}}
```

### hero-slider
```jsonc
{ "type": "hero-slider", "settings": {
  "slides": [
    { "title": "...", "subtitle": "...", "ctaText": "...", "ctaUrl": "#",
      "bgImage": "https://...", "bgGradient": "...", "bgOverlay": "rgba(0,0,0,0.4)" }
  ],
  "height": "600px",
  "align": "center",
  "autoplay": true, "autoplayMs": 5000,
  "showArrows": true, "showDots": true
}}
```

### posts-grid
```jsonc
{ "type": "posts-grid", "settings": {
  "columns": 3, "count": 6,
  "showImage": true, "showExcerpt": true
}}
```

### contact-form
Due modalità: con `formId` esistente (creato in `/admin/forms`) oppure inline fields.

```jsonc
{ "type": "contact-form", "settings": {
  "formId": "",                                  // se valorizzato ignora il resto
  "submitText": "Invia",
  "recipient": "info@dominio.it",
  "fields": [
    { "name": "name", "label": "Nome", "type": "text", "required": true },
    { "name": "email", "label": "Email", "type": "email", "required": true },
    { "name": "phone", "label": "Telefono", "type": "tel", "required": false },
    { "name": "message", "label": "Messaggio", "type": "textarea", "required": true }
  ]
}}
```
Tipi campo: `text|email|tel|textarea|checkbox`.

### gallery
```jsonc
{ "type": "gallery", "settings": {
  "columns": 3, "gap": 8,
  "images": [
    { "src": "https://...", "alt": "..." }
  ]
}}
```

### countdown
```jsonc
{ "type": "countdown", "settings": {
  "dueDate": "2026-12-31T23:59:59",
  "color": "#0f172a"
}}
```

### price-table
```jsonc
{ "type": "price-table", "settings": {
  "title": "Pro",
  "subtitle": "Per professionisti",
  "currency": "€",
  "price": "29",
  "period": "/mese",
  "featured": false,                            // true = card evidenziata
  "ctaText": "Inizia ora",
  "ctaUrl": "#",
  "features": [
    { "text": "10 progetti" },
    { "text": "Storage 100GB" }
  ]
}}
```

### call-to-action
```jsonc
{ "type": "call-to-action", "settings": {
  "title": "Pronto a iniziare?",
  "text": "Unisciti a noi.",
  "ctaText": "Inizia gratis",
  "ctaUrl": "#",
  "background": "linear-gradient(135deg,#92003b,#a4286a)",
  "color": "#ffffff",
  "align": "center"
}}
```

### social-icons
```jsonc
{ "type": "social-icons", "settings": {
  "align": "center", "size": 24, "gap": 12, "color": "#0f172a",
  "items": [
    { "network": "facebook", "url": "https://facebook.com/..." },
    { "network": "instagram", "url": "..." }
  ]
}}
```
Network: `facebook|instagram|twitter|linkedin|youtube|tiktok|whatsapp|github`.

### animated-headline
```jsonc
{ "type": "animated-headline", "settings": {
  "before": "Costruisci il tuo",
  "animated": [{"value":"sito"},{"value":"brand"},{"value":"futuro"}],
  "after": "con noi",
  "animation": "rotate",                         // rotate|fade|slide-up|typing
  "durationMs": 2200,
  "tag": "h2",
  "size": "48px",
  "weight": "800",
  "color": "",
  "animatedColor": "",
  "align": "center"
}}
```

### image-carousel
```jsonc
{ "type": "image-carousel", "settings": {
  "images": [{ "src": "...", "alt": "...", "link": "" }],
  "slidesPerView": 3,
  "gap": 16,
  "ratio": "4/3",                                // 16/9|4/3|1/1|21/9
  "autoplay": true, "autoplayMs": 4000,
  "loop": true,
  "showArrows": true, "showDots": true
}}
```

### testimonial-carousel
```jsonc
{ "type": "testimonial-carousel", "settings": {
  "items": [
    { "text": "...", "author": "...", "role": "...", "avatar": "...", "rating": 5 }
  ],
  "slidesPerView": 1,                            // 1-3
  "autoplay": true, "autoplayMs": 5000,
  "showDots": true, "showArrows": false
}}
```

### flip-box
```jsonc
{ "type": "flip-box", "settings": {
  "direction": "horizontal",                     // horizontal|vertical
  "height": "320px",
  "front": { "title": "...", "text": "...", "icon": "Sparkles", "background": "#92003b", "color": "#ffffff" },
  "back":  { "title": "...", "text": "...", "ctaText": "Scopri", "ctaUrl": "#", "background": "#1f2937", "color": "#ffffff" }
}}
```

### share-buttons
```jsonc
{ "type": "share-buttons", "settings": {
  "networks": [{"value":"facebook"},{"value":"twitter"},{"value":"linkedin"},{"value":"whatsapp"},{"value":"email"}],
  "align": "left",
  "size": 36, "gap": 8,
  "color": "#fff",
  "radius": "8px"
}}
```

### reviews
```jsonc
{ "type": "reviews", "settings": {
  "title": "Recensioni dei clienti",
  "averageRating": 4.8,
  "totalCount": 247,
  "columns": 3,
  "items": [
    { "author": "Anna F.", "rating": 5, "date": "2026-01-15", "text": "Esperienza fantastica." }
  ]
}}
```

### lottie
```jsonc
{ "type": "lottie", "settings": {
  "src": "https://lottie.host/.../animation.json",
  "width": "100%",
  "height": "300px",
  "loop": true,
  "autoplay": true
}}
```

### mailchimp
```jsonc
{ "type": "mailchimp", "settings": {
  "title": "Iscriviti alla newsletter",
  "text": "Aggiornamenti settimanali.",
  "action": "https://....mailchimp.com/post",
  "placeholder": "La tua email",
  "buttonText": "Iscriviti",
  "successText": "Grazie!",
  "align": "center"
}}
```

---

## GENERAL / THEME ELEMENTS (header, footer, post template)

### site-logo
```jsonc
{ "type": "site-logo", "settings": {
  "variant": "auto",                             // auto|light|dark
  "maxHeight": 48,
  "link": "/",
  "align": "left"
}}
```

### site-title
```jsonc
{ "type": "site-title", "settings": {
  "tag": "span",                                 // h1|h2|h3|span|div
  "size": "24px", "weight": "700",
  "color": "", "link": "/", "align": "left"
}}
```

### nav-menu
```jsonc
{ "type": "nav-menu", "settings": {
  "align": "left", "gap": 24, "color": "",
  "items": [
    { "label": "Home", "url": "/" },
    { "label": "Chi siamo", "url": "/chi-siamo" }
  ]
}}
```

### search-form
```jsonc
{ "type": "search-form", "settings": {
  "placeholder": "Cerca...", "buttonText": "Cerca",
  "action": "/search", "width": "300px"
}}
```

### page-title
```jsonc
{ "type": "page-title", "settings": {
  "tag": "h1", "align": "left",
  "color": "", "size": "40px", "weight": "700"
}}
```

### breadcrumbs
```jsonc
{ "type": "breadcrumbs", "settings": {
  "homeLabel": "Home", "separator": "/", "color": ""
}}
```

### post-content
```jsonc
{ "type": "post-content", "settings": { "proseSize": "md" } }   // sm|md|lg
```

### post-excerpt
```jsonc
{ "type": "post-excerpt", "settings": { "color": "", "size": "18px", "lineHeight": "1.6" } }
```

### featured-image
```jsonc
{ "type": "featured-image", "settings": {
  "ratio": "16/9",                               // 16/9|4/3|1/1|21/9|auto
  "radius": "12px",
  "fallback": "https://..."
}}
```

### post-meta
```jsonc
{ "type": "post-meta", "settings": {
  "showDate": true, "showAuthor": true,
  "showCategories": true, "showReadTime": false,
  "separator": "·", "color": ""
}}
```

### author-box
```jsonc
{ "type": "author-box", "settings": {
  "showAvatar": true, "showBio": true,
  "layout": "card"                               // card|inline
}}
```

### posts-list
```jsonc
{ "type": "posts-list", "settings": {
  "postType": "post",
  "count": 5,
  "layout": "list",                              // list|grid
  "columns": 1,                                  // se grid
  "showImage": true, "showExcerpt": true, "showMeta": true
}}
```

---

## Pattern di mapping da DOM live

Cattura dal sito da clonare:

| CSS computed | Va in |
|---|---|
| `borderRadius` su button | `button.settings` non lo accetta — usa `customCss` con classe wrapper |
| `borderRadius` su card | `column.settings.borderRadius` (settings di colonna) |
| `boxShadow` | `column.settings.boxShadow` |
| `backgroundColor` di section | `section.settings.background` (string o object) |
| `backgroundImage` URL | `section.settings.background.image` + `.size` + `.position` + `.overlay` |
| `padding-top/bottom` | `section.settings.paddingTop/Bottom` (numero o "Npx") |
| `text-transform: uppercase` | non c'è campo nativo — fallback `customCss` con classe |
| `letterSpacing` | non c'è campo nativo — fallback `customCss` |
| `font-weight 700` | `heading.settings.weight: "700"` |

Per stili non coperti dai campi widget (tracking, text-transform, hover effects, animazioni), aggiungili a `site.customCss` con classi mirate.

---

# ESTENSIONI 2026-07-16 (native-first)

## Settings di COLONNA (nuovi, rispettati dal PageRenderer)
```jsonc
{
  "borderRadius": "16px",          // card native
  "boxShadow": "0 2px 12px rgba(0,0,0,0.08)",
  "border": "1px solid #e6f4ff",
  "overflow": "hidden",            // per card con media flush (video/immagini)
  "elementsDirection": "row",      // 'column' (default) | 'row' → elementi AFFIANCATI
  "elementsJustify": "center",     // flex-start|center|flex-end|space-between|space-around
  "elementsAlign": "center",
  "elementsGap": 16,               // px o stringa
  "elementsWrap": true
}
```
→ Righe di bottoni/pill/loghi = colonna con `elementsDirection: 'row'` + N widget nativi. MAI più html per questi.

## `_styles` esteso (icon-box, testimonial, image-box)
Oltre a font/color/background/margin/padding/border/radius/shadow ora supporta:
`width, height, minWidth, minHeight, maxWidth, display, alignItems, justifyContent, flexShrink, gap, objectFit, aspectRatio, overflow`.
Pattern icona quadrata gradient: `_styles.icon = { width:'56px', height:'56px', background:'linear-gradient(...)', borderRadius:'14px', color:'#fff', margin:'0 0 8px' }`.

## icon-box (nuovi campi)
- `iconStyle`: `'stroke' | 'fill'` — fill = icona piena (shield, cloud)
- `customSvg`: SVG raw che sostituisce l'icona Lucide (glifi brand, es. WhatsApp). Eredita `color` dal frame (usare `fill="currentColor"`)

## image-box (nuovi campi) — card servizio completa
- `imageRatio`: `'auto'|'16/9'|'4/3'|'1/1'|'21/9'` (con object-fit cover)
- `imageRadius`: es. `'12px'` (default 8px)
- `ctaText` + `ctaIcon` (Lucide, default ChevronRight) + `ctaIconSize`
- `_styles`: `card`, `image`, `title`, `text`, `cta`, `ctaIcon` (badge: width/height/background/borderRadius/color)

## button (nuovi campi)
- `radius` ('9999px' = pill), `bgColor`, `textColor`, `borderColor`, `paddingCustom`, `shadow`
- `btnIcon` (Lucide) + `btnIconSize` + `btnIconPosition` ('left'|'right') + `btnIconStyle` ('stroke'|'fill') + `btnIconGap`

## accordion (nuovi campi)
- `variant`: `'card'` (default, bordata) | `'flat'` (righe hairline stile landing)
- `defaultOpen` (indice, -1 = tutte chiuse), `chevronColor`, `borderColor`, `titleSize`, `titleColor`, `itemPadding`, `contentPadding`

## counter (nuovi campi)
- `labelColor`, `labelSize`, `labelWeight`

## heading (nuovi campi)
- `letterSpacing` (es. '0.2em'), `transform` ('none'|'uppercase'|'lowercase'|'capitalize')
- Kicker pattern: h6 + size 12px + weight 600 + letterSpacing 0.2em + transform uppercase + color brand

## social-icons (nuovi campi)
- `variant`: `'plain'` | `'button'` (cerchi con sfondo) + `buttonSize` (diametro), `buttonBg`, `buttonRadius`, `buttonShadow`

## Wrapper per-elemento (già esistenti, sottodocumentati)
Ogni widget supporta `_style` (margin/padding/background/borderRadius/border/boxShadow/opacity/transform/transition/color/overflow del wrapper), `_classes`, `_htmlId`, `_css` (CSS scoped sull'id), `_hideOn` (['mobile'|'tablet'|'desktop']). I wrapper hanno classi `en-w en-w-<type>`.

## box — CONTENITORE ANNIDATO (2026-07-16, chiude il gap "gruppi")
```jsonc
{ "type": "box", "settings": {
  "direction": "column",         // column|row
  "gap": 12,                      // px
  "align": "stretch",             // stretch|flex-start|center|flex-end (asse trasversale)
  "justify": "flex-start",        // flex-start|center|flex-end|space-between|space-around
  "wrap": true,                   // a capo in row
  "background": "#111827",       // colore o gradient
  "borderRadius": "18px", "padding": "26px", "border": "", "boxShadow": "none",
  "minHeight": "", "sticky": false, "stickyTop": "96px",   // sidebar fisse allo scroll
  "children": [ /* ElementNode[] — QUALSIASI widget, anche box annidati */ ]
}}
```
Casi d'uso: card scure sidebar (heading+text+button+divider+icon-list), righe di bottoni/pill
(button con btnIcon), pill-card loghi (box row di box con image), blob gradient con immagine.
Editor: i figli si modificano dal pannello del box (campi per tipo + aggiungi/rimuovi/riordina);
niente drag&drop annidato nel canvas (limite v1). Button con `btnIcon` e `text:""` = solo icona.
`image` ora supporta anche `link`.

# ESTENSIONI 2026-07-19 (round 2 — native-first, da un restyle reale)

## Nuovi widget

### marquee (ticker orizzontale infinito)
```jsonc
{ "type": "marquee", "settings": {
  "items": "Voce uno · Voce due · Voce tre",   // separate da ·
  "separator": "●", "speed": 28,                 // secondi per giro
  "fontSize": "20px", "textColor": "",
  "textStroke": "1.2px #C9BFB2",                 // outline (alternativa a textColor)
  "separatorColor": "#DC7000", "uppercase": true, "gap": 56
}}
```

### nav-drawer (burger menu mobile)
```jsonc
{ "type": "nav-drawer", "settings": {
  "links": "Home|/\nServizi|/servizi",           // una voce per riga: Etichetta|/url
  "ctaText": "Contattaci", "ctaUrl": "/contatti",
  "iconColor": "", "panelBg": "", "linkColor": "", "accentColor": ""  // vuoto = tema
}}
```
Pattern header responsive: nella colonna del logo, box row `justify: space-between, wrap: false`
con `[logo, nav-drawer(_hideOn: ["desktop","tablet"])]`; colonne nav e CTA desktop con
`hideOnMobile: true`. Il pannello è un overlay full-screen con voci grandi + CTA.

## Campi nuovi su widget esistenti
- **heading**: `textStroke` ('1.2px #colore' → riempimento trasparente, numerali outline),
  `dash` (trattino decorativo prima del testo — pattern kicker)
- **icon-list**: `direction` ('column'|'row' per liste inline/topbar/chips), `textColor`,
  `textSize`, `iconSize` (le icone erano fisse a 20). Testo item con HTML inline supportato.
- **image**: `objectPosition` (ritagli mirati, es. dittici), oltre a objectFit/aspectRatio/
  hoverEffect ('zoom'|'lift'|'fade' — CSS già in globals) già esistenti
- **counter**: `accentColor` (colora SOLO prefix/suffix, es. "25K M²" con K arancio)
- **box**: `overflow` ('hidden' clippa i FIGLI col borderRadius — le card con foto),
  `link` (box interamente cliccabile, es. logo → home), e **`_flex` PER-FIGLIO** nei
  children (es. immagine `"_flex": "0 0 42%"` + contenuto `"_flex": "1 1 0%"` = card orizzontale)
- **html**: il campo è **`code`** (NON `html`!). Nuovi: `consentGate` (true = placeholder
  finché il visitatore non accetta i cookie) + `consentNote` (testo del placeholder)

## Colonne: responsive per-colonna
```jsonc
{ "width": 52, "settings": {
  "hideOnMobile": true,      // nascosta ≤768px
  "hideOnDesktop": true,     // visibile SOLO ≤768px
  "mobileWidth": "55%"       // opt-out dallo stacking: resta affiancata con questa larghezza
}}
```
Default mobile: tutte le colonne 100% (flex-basis). I bottoni dentro i box diventano
full-width centrati automaticamente su mobile (CSS core).

## Multilingua (NESSUNA estensione richiesta)
I theme block hanno display conditions + priority: header/footer EN =
`"conditions": {"include": [{"type": "url-prefix", "prefix": "/en"}]}, "priority": 20`
(vince sui blocchi IT all-site priority 10 solo sotto /en). Pagine EN = slug `en/...`.

## Cookie consent (Impostazioni → tab Privacy)
`site.integrations.cookieBanner`: enabled, title/message/acceptLabel/declineLabel/policyUrl/
cookiePolicyUrl (+varianti En), position ('bottom-bar'|'bottom-left'|'bottom-right'),
override estetici bgColor/textColor/accentColor/radius (vuoto = tema). Il banner emette
'en-consent-changed'; i widget html con consentGate si sbloccano da soli.

## Scroll reveal
Attivo di default su tutte le sezioni (fade-up al primo scroll, JS-only progressive
enhancement, rispetta prefers-reduced-motion). Nessuna config per-widget.

## Accesso al sito (v1.4.0 — Impostazioni → Avanzate)
`site.integrations.siteAccess`: `{mode: 'public'|'password'|'maintenance', password, lockTitle, lockMessage}`.
Con mode ≠ public: **noindex automatico** (meta robots globale) + **robots.txt Disallow /** +
LockScreen brandizzata (password → cookie firmato 7gg) o pagina manutenzione. Gli admin loggati
bypassano sempre. Per i siti in costruzione attivare SUBITO password mode (evita indicizzazione
dello staging). PATCH sempre con GET+merge dell'oggetto integrations completo.
