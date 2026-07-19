# Element Node — Modern Redesign Playbook

Playbook operativo per quando l'utente chiede un **refresh grafico / redesign / UX modernizzata** di un sito esistente in Element Node CMS.

Trigger: l'utente dice "rendi più moderno", "refresh grafico", "redesign", "UX moderna", "look contemporaneo", "rendi più 2026", "non la copia esatta", "look più premium/agency/magazine", ecc.

---

## 0. Workflow del redesign

```
1. Estrai dati grezzi del target  → clone-site.mjs <url>
2. Identifica il BRAND VERO        → analizza il logo (vision/Read), non solo il sito attuale
   • il sito potrebbe usare colori diversi dal logo (incoerenza comune)
   • il logo dice la verità sull'identità visiva
3. Proponi 2-4 palette all'utente  → AskUserQuestion con preview ASCII (vedi sez 4)
4. Applica theme via PATCH /api/settings/site (NON nel blueprint, vedi widget-quirks)
5. Costruisci blueprint usando i pattern moderni (vedi sez 2)
6. Bilancia layout: gap=0, widths sommano a 100 (vedi sez 5)
7. Usa widget nativi quando possibile, html widget per blocchi complessi, MAI text per HTML strutturale (vedi widget-quirks sez 10b)
8. Import in --replace + verifica con visual-diff
```

---

## 1. Filosofia del redesign

**Cosa cambia in un refresh grafico:**

- ✅ Palette, tipografia, spacing, layout, micro-interazioni implicite (gradient, shadow, radius)
- ✅ Struttura sezioni (puoi fonderle, aggiungerne, riorganizzarle)
- ✅ Hierarchy visuale (cosa è "wow", cosa è "supporto")
- ⚠️ Quando l'utente dice "contenuti identici" → mantieni testi verbatim. Quando dice solo "moderna, non copia esatta" → puoi alleggerire/riorganizzare ma non perdere informazioni essenziali.

**Cosa rimane sempre invariato:**

- ❌ Mai inventare numeri/stats. Estrai i veri valori (es. via `data-to-value` Playwright se sono counter)
- ❌ Mai parafrasare testimonianze/quote
- ❌ Mai cambiare nomi servizi/prodotti
- ❌ Mai aggiungere CTA inventate ("Pronto a partire?") senza esplicita richiesta utente

---

## 2. Pattern moderni 2026 implementabili

### A. Bento layout (asymmetric grid)

**Quando**: sezione "cosa facciamo" con 4-6 servizi.
**Pattern**: 1 card grande + 1 card piccola colorata side-by-side + 3 card piccole sotto.

```
+--------------------------+---------+
|                          |         |
|    BIG card (63%)        |  SMALL  |
|    immagine + titolo     |  glass  |
|    + cta                 |  (37%)  |
|                          |         |
+--------+--------+--------+---------+
|        |        |                  |
| small  | small  |     small        |
| (33)   | (33)   |     (34)         |
+--------+--------+--------+---------+
```

**Implementazione Element Node:**

- Section gap=0
- Row 1: col 63% + col 37% (somma 100)
- Row 2: col 33 + col 33 + col 34 (somma 100)
- Ogni card è un `html` widget con bg gradient/colore + immagine overlay + titolo + cta
- Tab colorato sopra (3-4px) implementato con `<div style='position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(...);'></div>` nella stessa card

### B. Glassmorphism (glass cards)

**Quando**: stats hero, badge "live now", overlay su gradient.

```css
background: rgba(255,255,255,0.06);
backdrop-filter: blur(20px);
border: 1px solid rgba(255,255,255,0.12);
border-radius: 24px;
```

**Implementazione**: `html` widget con il blocco inline. Funziona su sfondi gradient scuri (hero, CTA section).

**Limite**: `backdrop-filter` ha supporto buono sui browser moderni ma in Element Node deve essere applicato via inline style (no customCss class) per garanzia.

### C. Mesh gradient (radial overlapping)

**Quando**: hero, CTA section, sfondi "wow".

```css
background:
  radial-gradient(ellipse at 20% 30%, #003F8C 0%, transparent 55%),
  radial-gradient(ellipse at 80% 80%, #1e40af 0%, transparent 50%),
  linear-gradient(180deg, #0b1224 0%, #0f172a 100%);
```

**Implementazione**: applicalo a `section.settings.background` come stringa CSS. Element Node lo passa al `background` CSS della sezione.

**Combinazioni efficaci:**
- Tech/IT: navy → indigo → slate
- Eco/green: emerald → teal → forest
- Premium/luxury: midnight → indigo → violet
- Vivid/playful: pink → orange → yellow

### D. Animated headline

**Quando**: hero principale, frase con parola che cambia.

```jsonc
{ "type": "animated-headline", "settings": {
  "before": "La tua azienda",
  "animated": [{"value":"più veloce"},{"value":"più green"},{"value":"più cloud"}],
  "after": ".",
  "animation": "rotate",
  "durationMs": 2200,
  "tag": "h1", "size": "72px", "weight": "700",
  "color": "#ffffff", "animatedColor": "#fbbf24"
}}
```

**Limite**: il widget supporta una sola parola animata (con animazione rotate/fade/slide-up/typing). Non si può gradient-text su `animatedColor` (è singolo hex). Per gradient text usa `html` widget con `background-clip: text`.

### E. Counter cards con gradient text

**Quando**: stats numerici (15+ anni, 1000+ progetti, 96%).

**Pattern moderno (gradient text)**:

```html
<div style="font-size:48px;font-weight:700;background:linear-gradient(90deg,#ef4444,#f97316,#facc15,#16a34a);-webkit-background-clip:text;background-clip:text;color:transparent;line-height:1;">
  15+
</div>
```

**Limite**: questo è `html` widget (gradient-text non supportato dal widget `counter` nativo). Se vuoi animazione count-up al posto del numero statico, usa `counter` widget con `color` hex semplice (perdi gradient).

**Decisione**: anima O gradient, non entrambi.

### F. Sticky header glass

**Pattern**: header bianco semi-trasparente con backdrop-filter, sticky, shadow soft.

```jsonc
{
  "sticky": true,
  "background": "rgba(255,255,255,0.88)",
  "paddingTop": 14, "paddingBottom": 14,
  "zIndex": 100,
  "boxShadow": "0 1px 0 rgba(10,22,40,0.05)"
}
```

Per il `backdrop-filter` (glass blur) aggiungilo al `site.customCss`:
```css
header { backdrop-filter: blur(12px); }
```

### G. Tab colorato sopra le card

**Pattern**: piccola striscia gradient (3-4px) in alto alle card per ravvivare.

```html
<div style='position:relative;border-radius:20px;overflow:hidden;background:#f8fafc;border:1px solid #e2e8f0;'>
  <div style='position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#ef4444,#f97316);'></div>
  <!-- contenuto card -->
</div>
```

Usabile per richiamare la palette brand (es. arco rainbow del logo, o solo 1 colore brand).

### H. Process step cards (numbered)

**Quando**: sezione "Come lavoriamo", "Il nostro metodo", "Roadmap".

**Pattern**: 4 colonne dark, ognuna con `icon-box` widget e titolo "01 · Nome step".

```jsonc
{ "type": "icon-box", "settings": {
  "icon": "Phone", "iconSize": 24,
  "title": "01 · Consulenza",
  "text": "Analizziamo le tue esigenze...",
  "align": "left",
  "_styles": {
    "card": { "background": "#0f1a2e", "borderRadius": "20px", "padding": "28px 24px", "border": "1px solid #1e293b" },
    "icon": { "color": "#22d3ee" },
    "title": { "color": "#ffffff", "fontWeight": 700, "fontSize": "18px" },
    "text": { "color": "#94a3b8", "fontSize": "14px" }
  }
}}
```

### I. Marquee partner (carousel infinito di loghi)

**Quando**: sezione "trusted by" / "partner".

**Element Node**: usa `image-carousel` widget con `autoplay: true, loop: true, slidesPerView: 4-6`.

```jsonc
{ "type": "image-carousel", "settings": {
  "images": [{"src": "...", "alt": "Partner 1"}, ...],
  "slidesPerView": 6, "gap": 24,
  "autoplay": true, "autoplayMs": 3000, "loop": true,
  "showArrows": false, "showDots": false
}}
```

Limite: non è un vero marquee CSS (è uno slider auto-scroll). Per marquee continuo usa `html` widget con CSS keyframes.

### J. Pill badge / chip

**Pattern**: piccola etichetta arrotondata con dot colorato.

```html
<div style='display:inline-flex;align-items:center;gap:6px;background:#dcfce7;color:#15803d;padding:6px 14px;border-radius:9999px;font-size:12px;font-weight:600;'>
  <span style='width:6px;height:6px;background:#15803d;border-radius:50%;'></span>
  SOSTENIBILITÀ
</div>
```

Usa per: kicker sezione, tag categoria, badge "live", indicatore stato.

---

## 3. Tipografia moderna

### Letter-spacing (kerning)

| Elemento | letter-spacing |
|---|---|
| `h1`, `h2` display | `-0.02em` (tighter, premium) |
| `h6` kicker uppercase | `0.2em` (spaced out, label-like) |
| Body text | `normal` (default) |
| Button | `0.02em` o `normal` |

In customCss:
```css
.en-frontend h1, .en-frontend h2 { letter-spacing: -0.02em; }
.en-frontend h6 { letter-spacing: 0.2em; }
```

### Font-features OpenType

```css
.en-frontend { font-feature-settings: 'cv02','cv03','cv11'; }
```

Attiva varianti di disegno di Inter (numeri più moderni, alternate glyphs). Effetto sottile ma premium.

### Scale tipografica suggerita

```
h1 hero      72px / 80px       weight 700
h2 sezione   40-48px           weight 700
h3 card      20-24px           weight 700
h6 kicker    13-14px UPPERCASE weight 700 letter-spacing 0.2em
body         16-17px           line-height 1.6-1.7
small        13-14px           line-height 1.5
```

### Font families consigliati

| Stile | Heading | Body |
|---|---|---|
| Tech/IT | Inter | Inter |
| Editorial | Playfair Display | Lora / Source Serif |
| Friendly | Manrope | Manrope |
| Brutalist | Space Grotesk | IBM Plex Sans |
| Premium | Satoshi | Satoshi |

Tutti su Google Fonts. Importa via `site.headScripts` con `<link>` o `customCss` con `@import`.

---

## 4. Scelta palette

### Step 1: estrai colori dal logo (NON dal sito attuale)

Un sito esistente potrebbe usare colori che NON corrispondono al logo (incoerenza comune). Il logo è la **single source of truth** del brand.

Process:
1. Trova il logo in `audit.json header.logo.src` o `assets-labels.json` con `heuristic.type: "logo-candidate"`
2. Apri il file con il tool Read
3. Identifica visivamente: colore principale del testo, colori accent/decorativi
4. Annotali in note

### Step 2: presenta 3-4 palette all'utente

Mai applicare una palette autonomamente. Usa **AskUserQuestion** con preview ASCII di ciascuna palette. Le opzioni tipiche:

**A. Brand-loyal (dal logo)** — più fedele all'identità visiva storica
**B. Brand attuale modernizzato** — usa i colori del sito attuale ma rifresh
**C. Tematica premium (eco/tech/luxury)** — palette curata per il settore
**D. Duotone radicale (nero+1 accent)** — look magazine/agency

Mostra i 5 colori chiave di ognuna in preview ASCII:
```
PRIMARY    #003F8C
ACCENT     gradient
DARK BG    #0a1628
SURFACE    #f8fafc
MUTED      #64748b
```

### Step 3: applica via PATCH /api/settings/site

**MAI mettere `site.theme` parziale nel blueprint** (lo schema richiede tutti i sotto-oggetti). Usa lo script `update-theme.mjs` o equivalente che fa:
1. GET `/api/settings/site`
2. Merge dei nuovi colors/typography sul theme esistente (mantieni layout/radius/shadows default)
3. PATCH `/api/settings/site` con il theme completo

---

## 5. Bilanciamento layout (regola assoluta)

### Regola d'oro: `section.gap = '0'` + widths che sommano a 100

Il `PageRenderer` di Element Node mette le colonne in `flex-wrap: wrap` con `flex: 0 0 width%`. Se la somma supera 100, l'ultima colonna **wrappa a capo** (problema "Impatto green va a capo").

**Per evitare wrapping:**

```python
# Sezione gap = 0 SEMPRE
section_settings['gap'] = '0'

# Widths che sommano ESATTAMENTE a 100
# 2 colonne: [50, 50] | [55, 45] | [60, 40] | [63, 37]
# 3 colonne: [33, 33, 34]  (ultima 34, non 33)
# 4 colonne: [25, 25, 25, 25]
# 5 colonne: [20, 20, 20, 20, 20]
# 6 colonne: [16, 16, 17, 17, 17, 17]
# Mai sommare a 99 o 101 — usa esatto 100
```

### "Gap visivo" via padding di column

Per creare visualmente un gap tra le card (es. 24px tra card icon-box):

```python
# Non usare section gap. Usa padding della colonna.
col(33, settings={'padding': '0 12px 0 32px'}, ...)  # prima col: padding-left esterno
col(33, settings={'padding': '0 12px'}, ...)          # media: padding orizzontale uniforme
col(34, settings={'padding': '0 32px 0 12px'}, ...)   # ultima col: padding-right esterno
```

Il 12px+12px tra le card centrali fa 24px effettivi. Il 32px ai bordi della sezione è il container-padding visuale.

### Multi-riga: usa `width: 100` come separatore

Per andare a capo dentro la stessa section:

```python
section({...}, [
  col(100, {...}, [heading('Titolo')]),         # riga 1: titolo
  col(33, ...), col(33, ...), col(34, ...),     # riga 2: 3 card
  col(100, {...}, [spacer(40)]),                # separatore
  col(50, ...), col(50, ...),                   # riga 3: 2 card
])
```

### Verifica programmatica prima di importare

Prima di `import.mjs`, runna mentalmente o via script:

```python
for sec in sections:
  widths_per_row = []
  cur_row = []
  for c in sec.columns:
    if c.width == 100:
      if cur_row: widths_per_row.append(sum(cur_row)); cur_row = []
      widths_per_row.append(100)
    else:
      cur_row.append(c.width)
      if sum(cur_row) >= 100:
        widths_per_row.append(sum(cur_row))
        cur_row = []
  assert all(r == 100 for r in widths_per_row), f"riga non bilanciata in {sec.anchor}"
```

---

## 6. Mapping pattern → widget Element Node (cheat sheet)

| Pattern moderno | Widget | Note |
|---|---|---|
| Hero gradient + animated text | section bg gradient + `animated-headline` | parola che cambia |
| Hero CTA pill | `button` style primary OR `html` widget con `<a style="...">` | html se serve gradient bg |
| Stats inline 3 numeri | 3 col × `counter` + label | nativo, animazione count-up |
| Glass card | `html` widget | backdrop-filter inline |
| Bento card big + small | 2 col 63+37 con `html` widget per ogni card | gradient + immagine overlay |
| 3 card icon servizi | 3 col × `icon-box` con `_styles.card` | nativo |
| 4 card immagine | 4 col × `image-box` | nativo, layout fisso |
| Process step 01·02·03·04 | 4 col × `icon-box` con titolo "01 · Nome" | nativo |
| Testimonianza singola | `testimonial` con `_styles` | nativo |
| Carousel testimonianze | `testimonial-carousel` | autoplay+dots |
| Marquee partner | `image-carousel` autoplay | non vero marquee |
| Pill badge | `text` widget con HTML inline minimal | OK perché markup leggero |
| Progress bar percentuale | `progress` widget | label + percent + color |
| Footer multi-colonna | section con 4 col × (heading + icon-list) | nativo, icon-list editabile |
| CTA finale | section bg gradient + 2 col (testo + `button` × 2) | nativo |
| Divider rainbow | `text` widget con HTML inline `<div style='height:3px;background:linear-gradient(...)'>` | OK markup minimal |
| Floating tag su immagine | `html` widget con immagine + tag absolute | richiede position relative |
| Kicker uppercase + dot | `text` con HTML inline OR `heading` h6 size 13 weight 700 | preferire heading se solo testo |

---

## 6b. ⚠️ Brand identity (del logo) ≠ Theme message (del sito)

Errore comune: prendere SOLO i colori del logo come palette. Sbagliato quando il sito ha un **tema/messaggio dominante** diverso dall'identità grafica del logo.

### Esempi di mismatch tipico

| Tipo di sito | Logo dice | Sito dice | Palette giusta |
|---|---|---|---|
| Azienda con missione green/eco | navy + colori vari | "siamo per l'ambiente, partner RE100, hardware rigenerato" | **green primary** + navy secondario per il logo |
| Studio dentistico premium | rosso + bianco | "luxury, calma, fiducia" | **bianco + cipria + oro** + rosso solo nel logo |
| Studio legale tradizionale | nero | "competenza, autorità, eredità" | **bordeaux + crema + oro** + nero accent |
| Tech startup giovane | verde acqua | "velocità, AI, futuro" | **viola/cyan elettrici** + verde acqua come accent |
| Brand artigianale food | rosso fiero | "tradizione, terra, calore" | **terracotta + crema + verde oliva** + rosso accent |

### Come identificare il "tema dominante" del sito

Cerca questi indicatori nell'audit:

1. **Hero image/video di sfondo** — di cosa parla visivamente? Foresta = green/eco. Skyline città = urban/business. Dashboard = tech/SaaS. Mani che si stringono = trust/B2B.
2. **Hero kicker** (testo sopra il titolo h1) — è SEMPRE significativo: "UN'AZIENDA IMPEGNATA PER IL GREEN" / "CYBERSECURITY FIRST" / "100% MADE IN ITALY". Tradisce il vero positioning.
3. **Sezione "About"/"Chi Siamo"** — i sostantivi/aggettivi ricorrenti definiscono il tema: sostenibilità, innovazione, tradizione, sicurezza, eleganza, ecc.
4. **Partner section** — partnership con marchi RE100 (green), ISO 27001 (security), Slow Food (artigianale) tradiscono il theme.
5. **Counter labels** — "Anni di esperienza" = tradition. "Progetti completati" = portfolio. "% Soddisfazione" = trust. "Tonnellate CO2 risparmiate" = sustainability hardcore.

### Regola d'oro

**Quando logo identity e site theme sono in conflitto:**
- **Primary color** = theme message (verde se eco, viola se tech, bordeaux se legal)
- **Secondary/accent color** = logo identity (per riconoscibilità brand)
- **Hero background** = REPRODUCES il theme: foto/video natura per green, mesh gradient tech per SaaS, texture marmo/oro per luxury, ecc.

Esempio iteos.it: logo blu+rainbow ma sito green-themed → primary verde (#16a34a / #10b981 emerald), secondary navy (#003F8C dal logo), hero con video/foto natura, sezione sostenibilità prominente con palette green-forward.

### Implementazione pratica

Quando proponi le 3-4 palette via AskUserQuestion (sez 4), **chiedi prima** se il sito ha un tema dominante e propone almeno 2 alternative:
- A. Logo-pure (solo identità grafica)
- B. Theme-led (green/eco/luxury/security/ecc.) con logo come accent

Lascia che sia l'utente a scegliere il bilanciamento. In dubbio: theme-led batte logo-pure perché comunica meglio la value proposition del sito.

---

## 7. Quando l'utente dice "non rispecchia"

Se l'utente dice "i colori non rispecchiano" / "non è il brand giusto":

1. **NON difendere la scelta**. Riconosci.
2. Vai al logo: analizza con Read. Identifica i colori veri.
3. Confronta con il sito attuale: spesso c'è discrepanza tra logo e sito (il sito è stato fatto da terzi che hanno cambiato palette).
4. Spiega all'utente la differenza che hai trovato.
5. **Proponi 3-4 palette nuove** via AskUserQuestion con preview.
6. Applica + ribuilda blueprint con i nuovi accenti.

---

## 8. Anti-pattern da evitare nel redesign

1. ❌ Usare cyan/sky/teal "perché è IT" senza guardare il logo
2. ❌ Lasciare `gap` di sezione > 0 quando la somma width è già 100 (wrapping garantito)
3. ❌ Mettere markup HTML complesso in `text` widget (utente non vede il codice nell'editor)
4. ❌ Embeddare `site.theme` parziale nel blueprint (fa fallire la validazione)
5. ❌ Inventare stats / numeri / CTA non presenti nel target
6. ❌ Replicare design del sito originale "as-is" quando l'utente ha chiesto "moderno"
7. ❌ Aggiungere troppi gradient: 1-2 momenti "wow" sono modernità, 5+ sono caos
8. ❌ Counter widget per stats e poi anche text con gradient text per gli stessi stats nella stessa sezione (ridondante)
9. ❌ Sticky header senza `boxShadow` o background semi-trasparente (sembra "che attacca")
10. ❌ Card senza border + senza shadow su sfondo bianco (invisibili)
11. ❌ **Inventare loghi partner**. Se l'audit identifica solo 1-2 brand reali (es. solo Epson), NON aggiungere "HP / Lexmark / Canon / Brother / Xerox" placeholder. Sostituisci la sezione partner con: (a) certificazioni/standard reali (ISO, GDPR), (b) un singolo partner prominente, (c) rimuovi la sezione.

11c. ⚠️ **Loghi partner spesso sono in `background-image` CSS, non in `<img>`**. Carousel Avada/Elementor/Swiper sui siti WordPress usano `<div style="background-image: url(...)">` per i loghi partner — gli `<img>` standard NON li rilevano. Lo scrape iniziale può quindi "perdere" loghi reali esistenti.

**Soluzione**: dopo il primo audit, se la sezione partner sembra vuota o incompleta:
1. Re-scan mirato Playwright sulla sezione (find by text "Partner", "Brand", "Trusted by", ecc.)
2. Estrai TUTTI gli `getComputedStyle(el).backgroundImage` dei div figli
3. Filtra per `url(...png|jpg|svg|webp)` con keyword brand likely
4. Confronta con network responses (ogni img caricata dal browser è in `page.on('response')` con ct `image/*`)

Pattern code:
```js
// Dentro la sezione target
const bgs = [];
for (const el of section.querySelectorAll('*')) {
  const bi = getComputedStyle(el).backgroundImage;
  if (bi && bi.includes('url(')) {
    const m = bi.match(/url\(["']?([^"')]+)["']?\)/);
    if (m) bgs.push(m[1]);
  }
}
```

NB: lo script `clone-site.mjs` cattura già `audit.bgImages` ma globalmente, non sezione-by-sezione. Per loghi partner, fai una passata targeted.

11b. ❌ **MAI scaricare loghi da fonti esterne** (Wikipedia, Brand.dev, vendor CDN diretto, Google Images, ecc.) "per coprire" placeholder mancanti. Niente "fetch del logo HP dal sito ufficiale HP", niente "uso il logo Canon da Wikipedia". Usa SOLO:
    - Asset realmente trovati nell'audit del sito target (verificati via Playwright + HTML raw + altre pagine)
    - Asset forniti esplicitamente dall'utente (upload manuale o URL passato in chat)
    Quando un logo manca: chiedi all'utente (`Quale logo va qui? URL?`) oppure rimuovi/sostituisci la sezione. Scaricare da fonti terze è **out of scope** della skill.
12. ❌ **Video bg con `position:absolute;inset:0` dentro una colonna senza ancestor relative**. Il `<video>` esce dalla section e copre header. Soluzione: usa `section.settings.background.image` (renderizzato dal PageRenderer come bg vero della section) invece di video html. Per video bg vero serve `section.settings.position: 'relative'` + container relativo dentro la colonna.
13. ❌ **`<h*>` inline dentro html widget su bg scuro senza `color:#ffffff` esplicito**. Il PageRenderer ha CSS globale tipo `h3 { color: #0f172a }` che vince sull'ereditarietà del color dal parent. Fix: `<h3 style='color:#ffffff;...'>`.
14. ❌ **Header sticky con bg `rgba(255,255,255,0.85)` quando il content sotto ha colore intenso**. L'header semi-trasparente fa vedere il green/red/dark sottostante che lo "tinge". Soluzione: bg almeno `rgba(255,255,255,0.95)` oppure solido.

---

## 9. Checklist pre-import per un redesign

Prima di `import.mjs --replace`:

- [ ] Theme aggiornato via PATCH /api/settings/site (palette confermata dall'utente)
- [ ] Tutti i `text` widget con HTML > 3 righe → spostati a `html` widget
- [ ] Tutte le card icon → `icon-box` con `_styles`
- [ ] Tutte le card immagine semplici → `image-box`
- [ ] Counter usati per numeri animati (no gradient text se vuoi animazione)
- [ ] Stats inventati rimossi / sostituiti con valori reali
- [ ] CTA finali "Pronto a partire?" rimosse se non nel target originale
- [ ] Tutte le righe sommano a 100 (script di verifica)
- [ ] Section gap = '0' su tutte le sezioni
- [ ] Header sticky con boxShadow + bg semi-trasparente
- [ ] Footer multi-colonna con icon-list (no markup raw)
- [ ] customCss del site contiene: smooth scroll, letter-spacing display, font-features
- [ ] Tutti gli asset originali ancora referenziati (no placeholder orfani)
- [ ] Animated-headline se hero ha titolo "wow", altrimenti heading puro
- [ ] Testimonial-carousel se ≥ 2 testimonianze, altrimenti testimonial singolo
