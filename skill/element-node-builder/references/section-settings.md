# Section & Column Settings Reference

Settings accettati da `section.settings` e `column.settings` nel `PageRenderer`.

## SectionSettings

```jsonc
{
  // Spacing
  "padding": "60px 20px",          // shorthand
  "paddingTop": 80,                 // numero (px) o "80px"
  "paddingBottom": 80,
  "paddingLeft": 20,
  "paddingRight": 20,
  "marginTop": 0,
  "marginBottom": 0,

  // Background — può essere stringa o oggetto
  "background": "#ffffff",          // semplice
  // oppure:
  "background": {
    "type": "image",                // color|image|gradient
    "color": "#1a1a1a",
    "image": "https://.../bg.jpg",
    "overlay": "rgba(0,0,0,0.4)",   // sovrapposto sopra image/gradient
    "gradient": "linear-gradient(135deg,#92003b,#1f2937)",
    "size": "cover",                // default cover (immagini)
    "position": "center",
    "attachment": "scroll",         // scroll|fixed|local
    "repeat": "no-repeat"
  },

  // Layout
  "color": "",                      // colore testo default sezione
  "gap": "20px",                    // gap tra colonne
  "minHeight": "",                  // es. "100vh" per hero a tutta altezza
  "maxWidth": "",                   // se vuoi container limitato (es. "1200px")
  "containerWidth": "",             // sinonimo di maxWidth
  "fullWidth": false,

  // Position (header sticky)
  "sticky": true,                   // → position: sticky; top: 0
  "position": "",                   // o "fixed", "relative", ecc.
  "zIndex": 100,

  // Style
  "boxShadow": "0 2px 15px rgba(0,0,0,0.08)",
  "borderRadius": "",
  "anchor": "about",                // id ancora per #about

  // Allineamento contenuto
  "contentAlign": "center",         // left|center|right
  "textAlign": "center"             // left|center|right
}
```

### Esempi tipici

**Hero a tutta altezza con immagine + overlay:**
```jsonc
{
  "minHeight": "100vh",
  "paddingTop": 120, "paddingBottom": 120,
  "background": {
    "type": "image",
    "image": "https://.../hero.jpg",
    "overlay": "rgba(0,0,0,0.5)",
    "size": "cover",
    "position": "center"
  },
  "color": "#ffffff",
  "contentAlign": "center"
}
```

**Sezione con bg color e padding generoso:**
```jsonc
{ "paddingTop": 96, "paddingBottom": 96, "background": "#f8fafc" }
```

**Header sticky:**
```jsonc
{ "sticky": true, "background": "#ffffff", "boxShadow": "0 2px 15px rgba(0,0,0,0.08)", "paddingTop": 16, "paddingBottom": 16, "zIndex": 100 }
```

**Footer scuro:**
```jsonc
{ "background": "#0f172a", "color": "#e2e8f0", "paddingTop": 64, "paddingBottom": 32 }
```

## ColumnSettings

```jsonc
{
  "padding": "20px",
  "paddingLeft": "",
  "paddingRight": "",
  "align": "center",                // left|center|right (testo)
  "background": "#ffffff",          // stringa o stesso schema BgObj di sezione
  "verticalAlign": "center",        // top|center|bottom
  "textAlign": "center"
}
```

**Card con bg + shadow + radius:**
```jsonc
// La colonna FUNGE da card:
{
  "padding": "32px",
  "background": "#ffffff",
  "verticalAlign": "top",
  "textAlign": "center"
}
```

⚠️ Per `borderRadius` e `boxShadow` di card: non sono campi nativi della colonna nel TS, ma sono accettati come stile inline tramite `customCss` con classe mirata sull'anchor della sezione. In alternativa puoi usare il widget `flip-box` o un `icon-box` con sfondo.

## Default fallback

Se non specifichi nulla:
- Section: `padding: '60px 20px'` (60px verticale, 20px orizzontale)
- Column: `padding: '20px'`

## Layout colonne

Le colonne usano `flex: 0 0 width%`. Larghezze tipiche per riempire 100%:

| N colonne | Widths |
|---|---|
| 1 | `[100]` |
| 2 | `[50, 50]` o `[33, 67]` o `[67, 33]` |
| 3 | `[33, 33, 34]` (ultima 34 per somma 100) |
| 4 | `[25, 25, 25, 25]` |
| 5 | `[20, 20, 20, 20, 20]` |
| 6 | `[16, 16, 17, 17, 17, 17]` |

Mescolare colonne `100` e colonne più strette su una stessa sezione = righe multiple (le 100 vanno a capo).
