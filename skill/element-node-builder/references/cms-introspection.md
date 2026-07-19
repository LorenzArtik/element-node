# Element Node — Widget rendering quirks (auto-generated)

Output empirico di `introspect-cms.mjs`. Generato confrontando le settings inviate ai widget contro il CSS effettivamente renderizzato dal PageRenderer di Element Node.

Generated: 2026-05-11T09:38:21.424Z

## CSS variables di brand (root)

Sono le variabili che il PageRenderer espone. Usale in `customCss` con `var(--en-color-primary)` ecc.

```
--en-heading-style: normal;
--en-radius-sm: 6px;
--en-heading-decoration: none;
--en-font-body: Inter, system-ui, sans-serif;
--en-heading-transform: none;
--en-color-text-muted: #6b7280;
--en-heading-letter-spacing: normal;
--en-body-transform: none;
--en-color-text: #1b1b1b;
--en-form-border: #e5e7eb;
--en-color-info: #3b82f6;
--en-color-custom2: #f0f8ff;
--en-button-py: 12px;
--en-body-letter-spacing: normal;
--en-bp-mobile: 768px;
--en-color-primary: #2563EB;
--en-size-4xl: 2.25rem;
--en-heading-line-height: 1.2;
--en-size-lg: 1.125rem;
--en-radius-xl: 16px;
--en-container-max: 1170px;
--en-color-text-inverse: #ffffff;
--en-section-padding: 70px 20px;
--en-form-radius: 6px;
--en-size-5xl: 3rem;
--en-line-height: 1.7;
--en-size-sm: 0.875rem;
--en-gutter: 20px;
--en-color-accent: #60A5FA;
--en-bp-tablet: 1024px;
--en-radius-lg: 12px;
--en-font-mono: "JetBrains Mono", monospace;
--en-color-border: #e5e7eb;
--en-button-px: 24px;
--en-font-heading: Inter, system-ui, sans-serif;
--en-color-custom3: #f9f9f9;
--en-size-base: 16px;
--en-heading-weight: 700;
--en-size-xs: 0.75rem;
--en-radius-md: 8px;
--en-color-primary-hover: #1d4ed8;
--en-body-style: normal;
--en-size-6xl: 3.75rem;
--en-color-secondary: #1e40af;
--en-color-warning: #f59e0b;
--en-radius-full: 9999px;
--en-size-2xl: 1.5rem;
--en-button-fw: 600;
--en-button-radius: 8px;
--en-body-weight: 400;
--en-color-danger: #ef4444;
--en-form-bg: #ffffff;
--en-size-xl: 1.25rem;
--en-color-surface: #fafafa;
--en-size-3xl: 1.875rem;
--en-color-success: #10b981;
--en-color-custom1: #f6f6f2;
--en-form-focus: #92003b;
--en-color-bg: #ffffff;
--en-size-md: 1rem;
```

## Selettori CSS reali per widget

Quando scrivi `customCss` per stilare un widget, usa questi selettori. NON inventare classi.

| Widget | Selettore sezione | Selettore widget (più stretto) |
|---|---|---|
| `heading` | `section[data-anchor="intro-heading"]` | `section[data-anchor="intro-heading"] h1` |
| `image` | `section[data-anchor="intro-image"]` | `section[data-anchor="intro-image"] img` |
| `text` | `section[data-anchor="intro-text"]` | `section[data-anchor="intro-text"] p` |
| `video` | `section[data-anchor="intro-video"]` | `section[data-anchor="intro-video"] iframe` |
| `button` | ⚠ not found | — |
| `divider` | ⚠ not found | — |
| `spacer` | `section[data-anchor="intro-spacer"]` | `section[data-anchor="intro-spacer"] section` |
| `icon` | `section[data-anchor="intro-icon"]` | `section[data-anchor="intro-icon"] svg.[object` |
| `image-box` | ⚠ not found | — |
| `icon-box` | ⚠ not found | — |
| `icon-list` | ⚠ not found | — |
| `counter` | ⚠ not found | — |
| `progress` | ⚠ not found | — |
| `testimonial` | ⚠ not found | — |
| `tabs` | ⚠ not found | — |
| `accordion` | ⚠ not found | — |
| `toggle` | ⚠ not found | — |
| `alert` | ⚠ not found | — |
| `html` | ⚠ not found | — |
| `posts-grid` | ⚠ not found | — |
| `contact-form` | ⚠ not found | — |
| `gallery` | ⚠ not found | — |
| `countdown` | ⚠ not found | — |
| `price-table` | ⚠ not found | — |
| `call-to-action` | ⚠ not found | — |
| `social-icons` | ⚠ not found | — |
| `hero` | ⚠ not found | — |
| `hero-slider` | ⚠ not found | — |
| `animated-headline` | ⚠ not found | — |
| `image-carousel` | ⚠ not found | — |
| `testimonial-carousel` | ⚠ not found | — |
| `flip-box` | ⚠ not found | — |
| `share-buttons` | ⚠ not found | — |
| `reviews` | ⚠ not found | — |
| `lottie` | ⚠ not found | — |
| `mailchimp` | ⚠ not found | — |
| `site-logo` | ⚠ not found | — |
| `site-title` | ⚠ not found | — |
| `nav-menu` | `section[data-anchor="intro-nav-menu"]` | `section[data-anchor="intro-nav-menu"] nav` |
| `search-form` | ⚠ not found | — |
| `page-title` | ⚠ not found | — |
| `breadcrumbs` | ⚠ not found | — |

## Settings di sezione: cosa è renderizzato vs ignorato

Verifica empirica: ogni sezione di test ha `boxShadow: '0 4px 12px rgba(0,0,0,0.1)'` e `borderRadius: '16px'`. Sono effettivamente applicate?

- **section.settings.boxShadow**: rendered? **NO** (computed: `none`)
- **section.settings.borderRadius**: rendered? **NO** (computed: `0px`)
- **section.settings.background**: computed `rgba(0, 0, 0, 0)`

## Settings di colonna: cosa è renderizzato vs ignorato

Ogni colonna di test ha `boxShadow: '0 2px 8px rgba(0,0,0,0.08)'` e `borderRadius: '12px'`.

- **column.settings.boxShadow**: rendered? **NO** (computed: `none`)
- **column.settings.borderRadius**: rendered? **NO** (computed: `0px`)
- **column.settings.background**: computed `rgba(0, 0, 0, 0)`

## DOM tree per widget (per scrivere customCss mirato)

### `heading`
```
<h1>
```

### `image`
```
<img>
```

### `text`
```
<p>
```

### `video`
```
<iframe>
```

### `spacer`
```
<section>
  <div.el-container>
    <div>
      <div>
        <div>

        </div>
      </div>
      <div>
        <h1>
      </div>
      <div>
        <div>

        </div>
      </div>
      <div>
        <div>
      </div>
      <div>
        <div>

        </div>
      </div>
      <div>
        <div>

        </div>
      </div>
    </div>
  </div>
</section>
```

### `icon`
```
<svg.[object.SVGAnimatedString]>
  <path.[object.SVGAnimatedString]>
  <path.[object.SVGAnimatedString]>
</svg>
```

### `nav-menu`
```
<nav>
  <a>
  <a>
  <a>
  <a>
  <a>
</nav>
```
