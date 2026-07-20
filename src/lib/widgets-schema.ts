import { nanoid } from 'nanoid';

export type WidgetType =
  | 'box'
  | 'heading'
  | 'image'
  | 'text'
  | 'video'
  | 'button'
  | 'divider'
  | 'spacer'
  | 'icon'
  | 'image-box'
  | 'icon-box'
  | 'icon-list'
  | 'counter'
  | 'progress'
  | 'testimonial'
  | 'tabs'
  | 'accordion'
  | 'toggle'
  | 'alert'
  | 'html'
  | 'posts-grid'
  | 'contact-form'
  | 'gallery'
  | 'countdown'
  | 'price-table'
  | 'call-to-action'
  | 'social-icons'
  | 'site-logo'
  | 'site-title'
  | 'nav-menu'
  | 'search-form'
  | 'page-title'
  | 'breadcrumbs'
  | 'post-content'
  | 'post-excerpt'
  | 'featured-image'
  | 'post-meta'
  | 'author-box'
  | 'posts-list'
  | 'animated-headline'
  | 'image-carousel'
  | 'testimonial-carousel'
  | 'flip-box'
  | 'share-buttons'
  | 'reviews'
  | 'lottie'
  | 'mailchimp'
  | 'marquee'
  | 'nav-drawer';

export interface ElementNode {
  id: string;
  type: WidgetType;
  settings: Record<string, unknown>;
}

export interface ColumnNode {
  id: string;
  type: 'column';
  width: number;
  settings: Record<string, unknown>;
  elements: ElementNode[];
}

export interface SectionNode {
  id: string;
  type: 'section';
  settings: Record<string, unknown>;
  columns: ColumnNode[];
}

export interface PageContent {
  sections: SectionNode[];
}

export type WidgetCategory = 'basic' | 'pro' | 'general';

export interface WidgetDescriptor {
  type: WidgetType;
  label: string;
  icon: string;
  category: WidgetCategory;
  order: number;
  defaults: Record<string, unknown>;
  fields: WidgetField[];
}

export interface WidgetField {
  key: string;
  label: string;
  control:
    | 'text'
    | 'textarea'
    | 'richtext'
    | 'number'
    | 'select'
    | 'color'
    | 'switch'
    | 'media'
    | 'icon'
    | 'url'
    | 'slider'
    | 'dimension'
    | 'spacing'
    | 'border-style'
    | 'shadow-style'
    | 'background-style'
    | 'list';
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  itemTemplate?: WidgetField[];
  placeholder?: string;
  help?: string;
}

const ALIGN_OPTIONS = [
  { value: 'left', label: 'Sinistra' },
  { value: 'center', label: 'Centro' },
  { value: 'right', label: 'Destra' },
];

export const WIDGETS: Record<WidgetType, WidgetDescriptor> = {
  // ===== BASIC (ordine identico a Elementor) =====
  heading: {
    type: 'heading', label: 'Titolo', icon: 'Heading1', category: 'basic', order: 1,
    defaults: { text: 'Aggiungi qui il titolo', tag: 'h2', align: 'left', color: '', size: '', weight: '', letterSpacing: '', transform: 'none', textStroke: '' , dash: false},
    fields: [
      { key: 'text', label: 'Titolo', control: 'text' },
      { key: 'tag', label: 'Tag HTML', control: 'select', options: ['h1','h2','h3','h4','h5','h6'].map(v => ({ value: v, label: v.toUpperCase() })) },
      { key: 'align', label: 'Allineamento', control: 'select', options: ALIGN_OPTIONS },
      { key: 'color', label: 'Colore', control: 'color' },
      { key: 'textStroke', label: 'Contorno testo (es. 1.2px #C9BFB2 — riempimento trasparente)', control: 'text' },
      { key: 'dash', label: 'Trattino decorativo prima del testo', control: 'toggle' },
      { key: 'size', label: 'Dimensione', control: 'text' },
      { key: 'weight', label: 'Peso', control: 'select', options: ['300','400','500','600','700','800','900'].map(v => ({ value: v, label: v })) },
      { key: 'letterSpacing', label: 'Letter spacing', control: 'text', placeholder: 'es. 0.2em / 2.4px' },
      { key: 'transform', label: 'Trasformazione', control: 'select', options: [
        { value: 'none', label: 'Nessuna' },
        { value: 'uppercase', label: 'MAIUSCOLO' },
        { value: 'lowercase', label: 'minuscolo' },
        { value: 'capitalize', label: 'Iniziali Maiuscole' },
      ] },
    ],
  },
  image: {
    type: 'image', label: 'Immagine', icon: 'Image', category: 'basic', order: 2,
    defaults: {
      src: '', alt: '', width: 'auto', height: 'auto', align: 'center', caption: '',
      maxWidth: '100%', maxHeight: '', objectFit: '', aspectRatio: '',
      borderRadius: '', boxShadow: 'none', hoverEffect: 'none',
    },
    fields: [
      { key: 'src', label: 'Sorgente', control: 'media' },
      { key: 'alt', label: 'Testo alternativo', control: 'text' },
      { key: 'link', label: 'Link', control: 'url' },
      { key: 'width', label: 'Larghezza', control: 'dimension', min: 0, max: 1200, step: 1, placeholder: 'auto' },
      { key: 'height', label: 'Altezza', control: 'dimension', min: 0, max: 1200, step: 1, placeholder: 'auto' },
      { key: 'maxWidth', label: 'Max larghezza', control: 'dimension', min: 0, max: 1200, step: 1, placeholder: '100%' },
      { key: 'maxHeight', label: 'Max altezza', control: 'dimension', min: 0, max: 1200, step: 1, placeholder: '— / 400px' },
      { key: 'aspectRatio', label: 'Aspect ratio', control: 'select', options: [
        { value: 'auto', label: 'Originale' },
        { value: '1/1', label: 'Quadrata 1:1' },
        { value: '4/3', label: '4:3' },
        { value: '16/9', label: '16:9' },
        { value: '21/9', label: 'Cinematic 21:9' },
        { value: '3/4', label: 'Verticale 3:4' },
        { value: '9/16', label: 'Stories 9:16' },
      ]},
      { key: 'objectFit', label: 'Adattamento (object-fit)', control: 'select', options: [
        { value: 'auto', label: 'Default' },
        { value: 'cover', label: 'Cover (riempie e ritaglia)' },
        { value: 'contain', label: 'Contain (intera, lettera-box)' },
        { value: 'fill', label: 'Fill (deforma)' },
        { value: 'none', label: 'None' },
        { value: 'scale-down', label: 'Scale-down' },
      ]},
      { key: 'align', label: 'Allineamento', control: 'select', options: ALIGN_OPTIONS },
      { key: 'borderRadius', label: 'Border radius', control: 'select', options: [
        { value: '0', label: 'Nessuno' },
        { value: '4px', label: 'XS (4px)' },
        { value: '8px', label: 'S (8px)' },
        { value: '12px', label: 'M (12px)' },
        { value: '16px', label: 'L (16px)' },
        { value: '24px', label: 'XL (24px)' },
        { value: '9999px', label: 'Pillola / Cerchio' },
      ]},
      { key: 'boxShadow', label: 'Ombra', control: 'select', options: [
        { value: 'none', label: 'Nessuna' },
        { value: '0 1px 3px rgba(0,0,0,0.1)', label: 'XS' },
        { value: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)', label: 'S' },
        { value: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)', label: 'M' },
        { value: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', label: 'L' },
        { value: '0 25px 50px -12px rgba(0,0,0,0.25)', label: 'XL' },
        { value: '0 30px 60px -20px rgba(14,165,233,0.4)', label: 'Glow (brand)' },
      ]},
      { key: 'hoverEffect', label: 'Effetto hover', control: 'select', options: [
        { value: 'none', label: 'Nessuno' },
        { value: 'zoom', label: 'Zoom' },
        { value: 'lift', label: 'Solleva' },
        { value: 'fade', label: 'Fade' },
        { value: 'grayscale', label: 'Grayscale → colori' },
      ]},
      { key: 'caption', label: 'Didascalia', control: 'text' },
    ],
  },
  text: {
    type: 'text', label: 'Editor Testo', icon: 'Type', category: 'basic', order: 3,
    defaults: { html: '<p>Inserisci il tuo testo qui.</p>', color: '', size: '', lineHeight: '', align: 'left' },
    fields: [
      { key: 'html', label: 'Contenuto', control: 'richtext' },
      { key: 'color', label: 'Colore', control: 'color' },
      { key: 'size', label: 'Dimensione', control: 'text' },
      { key: 'lineHeight', label: 'Interlinea', control: 'text' },
      { key: 'align', label: 'Allineamento', control: 'select', options: [...ALIGN_OPTIONS, { value: 'justify', label: 'Giustificato' }] },
    ],
  },
  video: {
    type: 'video', label: 'Video', icon: 'PlayCircle', category: 'basic', order: 4,
    defaults: { src: '', type: 'youtube', autoplay: false, loop: false, controls: true },
    fields: [
      { key: 'src', label: 'URL', control: 'url' },
      { key: 'type', label: 'Sorgente', control: 'select', options: [{value:'youtube',label:'YouTube'},{value:'vimeo',label:'Vimeo'},{value:'mp4',label:'File MP4'}] },
      { key: 'autoplay', label: 'Autoplay', control: 'switch' },
      { key: 'loop', label: 'Loop', control: 'switch' },
      { key: 'controls', label: 'Controlli', control: 'switch' },
    ],
  },
  button: {
    type: 'button', label: 'Pulsante', icon: 'MousePointerClick', category: 'basic', order: 5,
    defaults: { text: 'Clicca qui', url: '#', target: '_self', align: 'left', style: 'primary', size: 'md', fullWidth: false, radius: '', bgColor: '', textColor: '', borderColor: '', paddingCustom: '', shadow: 'none', btnIcon: '', btnIconSize: 18, btnIconPosition: 'left', btnIconStyle: 'stroke', btnIconGap: 10 },
    fields: [
      { key: 'text', label: 'Testo', control: 'text' },
      { key: 'url', label: 'Link', control: 'url' },
      { key: 'target', label: 'Apri in', control: 'select', options: [{value:'_self',label:'Stessa scheda'},{value:'_blank',label:'Nuova scheda'}] },
      { key: 'align', label: 'Allineamento', control: 'select', options: ALIGN_OPTIONS },
      { key: 'style', label: 'Stile', control: 'select', options: [{value:'primary',label:'Primario'},{value:'secondary',label:'Secondario'},{value:'outline',label:'Outline'},{value:'ghost',label:'Ghost'}] },
      { key: 'size', label: 'Dimensione', control: 'select', options: [{value:'sm',label:'Piccolo'},{value:'md',label:'Medio'},{value:'lg',label:'Grande'}] },
      { key: 'fullWidth', label: 'Larghezza piena', control: 'switch' },
      { key: 'radius', label: 'Border radius', control: 'text', placeholder: 'es. 9999px (pill) — vuoto = theme' },
      { key: 'bgColor', label: 'Sfondo custom', control: 'color' },
      { key: 'textColor', label: 'Colore testo custom', control: 'color' },
      { key: 'borderColor', label: 'Colore bordo', control: 'color' },
      { key: 'paddingCustom', label: 'Padding custom', control: 'text', placeholder: 'es. 14px 32px' },
      { key: 'shadow', label: 'Ombra', control: 'text', placeholder: 'es. 0 4px 14px rgba(0,0,0,0.18)' },
      { key: 'btnIcon', label: 'Icona (Lucide)', control: 'icon' },
      { key: 'btnIconSize', label: 'Dimensione icona', control: 'slider', min: 12, max: 40, step: 1, unit: 'px' },
      { key: 'btnIconPosition', label: 'Posizione icona', control: 'select', options: [{value:'left',label:'Sinistra'},{value:'right',label:'Destra'}] },
      { key: 'btnIconStyle', label: 'Stile icona', control: 'select', options: [{value:'stroke',label:'Tratto'},{value:'fill',label:'Piena'}] },
    ],
  },
  divider: {
    type: 'divider', label: 'Divisore', icon: 'Minus', category: 'basic', order: 6,
    defaults: { color: '#e2e8f0', weight: 1, style: 'solid' },
    fields: [
      { key: 'color', label: 'Colore', control: 'color' },
      { key: 'weight', label: 'Spessore', control: 'slider', min: 1, max: 20, step: 1, unit: 'px' },
      { key: 'style', label: 'Stile', control: 'select', options: ['solid','dashed','dotted','double'].map(v => ({ value: v, label: v })) },
    ],
  },
  spacer: {
    type: 'spacer', label: 'Spazio', icon: 'StretchVertical', category: 'basic', order: 7,
    defaults: { height: 50 },
    fields: [{ key: 'height', label: 'Altezza', control: 'slider', min: 0, max: 400, step: 1, unit: 'px' }],
  },
  icon: {
    type: 'icon', label: 'Icona', icon: 'Star', category: 'basic', order: 8,
    defaults: { icon: 'Star', size: 64, color: '', align: 'center', link: '' },
    fields: [
      { key: 'icon', label: 'Icona', control: 'icon' },
      { key: 'size', label: 'Dimensione', control: 'slider', min: 16, max: 200, step: 1, unit: 'px' },
      { key: 'color', label: 'Colore', control: 'color' },
      { key: 'align', label: 'Allineamento', control: 'select', options: ALIGN_OPTIONS },
      { key: 'link', label: 'Link', control: 'url' },
    ],
  },
  'image-box': {
    type: 'image-box', label: 'Box Immagine', icon: 'LayoutPanelTop', category: 'basic', order: 9,
    defaults: { image: '', title: 'Titolo', text: 'Testo descrittivo.', align: 'center', link: '', imageRatio: 'auto', imageRadius: '', ctaText: '', ctaIcon: 'ChevronRight', ctaIconSize: 16 },
    fields: [
      { key: 'image', label: 'Immagine', control: 'media' },
      { key: 'imageRatio', label: 'Aspect ratio immagine', control: 'select', options: [
        { value: 'auto', label: 'Originale' },
        { value: '16/9', label: '16:9' },
        { value: '4/3', label: '4:3' },
        { value: '1/1', label: '1:1' },
        { value: '21/9', label: '21:9' },
      ] },
      { key: 'imageRadius', label: 'Radius immagine', control: 'text', placeholder: 'es. 12px (default 8px)' },
      { key: 'title', label: 'Titolo', control: 'text' },
      { key: 'text', label: 'Descrizione', control: 'textarea' },
      { key: 'ctaText', label: 'Testo CTA (footer card)', control: 'text' },
      { key: 'ctaIcon', label: 'Icona CTA', control: 'icon' },
      { key: 'ctaIconSize', label: 'Dimensione icona CTA', control: 'slider', min: 12, max: 32, step: 1, unit: 'px' },
      { key: 'align', label: 'Allineamento', control: 'select', options: ALIGN_OPTIONS },
      { key: 'link', label: 'Link', control: 'url' },
    ],
  },
  'icon-box': {
    type: 'icon-box', label: 'Box Icona', icon: 'Sparkles', category: 'basic', order: 10,
    defaults: { icon: 'Star', title: 'Questo è il titolo', text: 'Fai clic sul pulsante di modifica per cambiare questo testo.', align: 'center', iconColor: '', iconSize: 56, iconStyle: 'stroke' },
    fields: [
      { key: 'icon', label: 'Icona', control: 'icon' },
      { key: 'iconSize', label: 'Dimensione icona', control: 'slider', min: 16, max: 128, step: 1, unit: 'px' },
      { key: 'iconColor', label: 'Colore icona', control: 'color' },
      { key: 'iconStyle', label: 'Stile icona', control: 'select', options: [{ value: 'stroke', label: 'Tratto' }, { value: 'fill', label: 'Piena' }] },
      { key: 'customSvg', label: 'SVG custom (sostituisce l\'icona — per glifi brand)', control: 'textarea' },
      { key: 'title', label: 'Titolo', control: 'text' },
      { key: 'text', label: 'Descrizione', control: 'textarea' },
      { key: 'align', label: 'Allineamento', control: 'select', options: ALIGN_OPTIONS },
    ],
  },
  'icon-list': {
    type: 'icon-list', label: 'Lista Icone', icon: 'ListChecks', category: 'basic', order: 11,
    defaults: {
      align: 'left', iconColor: '', spacing: 12,
      items: [
        { icon: 'Check', text: 'Voce della lista #1', link: '' , direction: 'column', textColor: '', textSize: '', iconSize: 20},
        { icon: 'Check', text: 'Voce della lista #2', link: '' },
        { icon: 'Check', text: 'Voce della lista #3', link: '' },
      ],
    },
    fields: [
      { key: 'align', label: 'Allineamento', control: 'select', options: ALIGN_OPTIONS },
      { key: 'iconColor', label: 'Colore icone', control: 'color' },
      { key: 'spacing', label: 'Spaziatura', control: 'slider', min: 0, max: 40, step: 1, unit: 'px' },
      {
        key: 'items', label: 'Voci', control: 'list',
        itemTemplate: [
          { key: 'icon', label: 'Icona', control: 'icon' },
          { key: 'text', label: 'Testo', control: 'text' },
          { key: 'link', label: 'Link', control: 'url' },
        ],
      },
    ],
  },
  counter: {
    type: 'counter', label: 'Contatore', icon: 'Hash', category: 'basic', order: 12,
    defaults: { from: 0, to: 100, duration: 2000, prefix: '', suffix: '+', label: 'Clienti soddisfatti', size: '64px', color: '', labelColor: '', labelSize: '', labelWeight: '' , accentColor: ''},
    fields: [
      { key: 'from', label: 'Da', control: 'number' },
      { key: 'to', label: 'A', control: 'number' },
      { key: 'duration', label: 'Durata (ms)', control: 'number' },
      { key: 'prefix', label: 'Prefisso', control: 'text' },
      { key: 'suffix', label: 'Suffisso', control: 'text' },
      { key: 'label', label: 'Etichetta', control: 'text' },
      { key: 'size', label: 'Dimensione', control: 'text' },
      { key: 'color', label: 'Colore', control: 'color' },
      { key: 'accentColor', label: 'Colore prefisso/suffisso', control: 'color' },
      { key: 'labelColor', label: 'Colore etichetta', control: 'color' },
      { key: 'labelSize', label: 'Dimensione etichetta', control: 'text', placeholder: 'es. 15px' },
      { key: 'labelWeight', label: 'Peso etichetta', control: 'select', options: ['300','400','500','600','700'].map(v => ({ value: v, label: v })) },
    ],
  },
  progress: {
    type: 'progress', label: 'Barra Progresso', icon: 'BarChart3', category: 'basic', order: 13,
    defaults: { percent: 75, label: 'La mia skill', color: '', height: 12, showPercent: true },
    fields: [
      { key: 'label', label: 'Etichetta', control: 'text' },
      { key: 'percent', label: 'Percentuale', control: 'slider', min: 0, max: 100, step: 1, unit: '%' },
      { key: 'color', label: 'Colore', control: 'color' },
      { key: 'height', label: 'Altezza', control: 'slider', min: 4, max: 40, step: 1, unit: 'px' },
      { key: 'showPercent', label: 'Mostra %', control: 'switch' },
    ],
  },
  testimonial: {
    type: 'testimonial', label: 'Testimonianza', icon: 'Quote', category: 'basic', order: 14,
    defaults: { text: 'Lavoro fantastico, super consigliato!', author: 'Mario Rossi', role: 'CEO, Acme Inc.', avatar: '', rating: 5 },
    fields: [
      { key: 'text', label: 'Testo', control: 'textarea' },
      { key: 'author', label: 'Nome', control: 'text' },
      { key: 'role', label: 'Ruolo', control: 'text' },
      { key: 'avatar', label: 'Foto', control: 'media' },
      { key: 'rating', label: 'Stelle', control: 'slider', min: 0, max: 5, step: 1 },
    ],
  },
  tabs: {
    type: 'tabs', label: 'Tab', icon: 'PanelTopOpen', category: 'basic', order: 15,
    defaults: {
      align: 'left',
      items: [
        { title: 'Tab #1', content: '<p>Contenuto del primo tab.</p>' },
        { title: 'Tab #2', content: '<p>Contenuto del secondo tab.</p>' },
        { title: 'Tab #3', content: '<p>Contenuto del terzo tab.</p>' },
      ],
    },
    fields: [
      { key: 'align', label: 'Allineamento', control: 'select', options: ALIGN_OPTIONS },
      { key: 'items', label: 'Tab', control: 'list', itemTemplate: [
        { key: 'title', label: 'Titolo', control: 'text' },
        { key: 'content', label: 'Contenuto', control: 'richtext' },
      ]},
    ],
  },
  accordion: {
    type: 'accordion', label: 'Accordion', icon: 'ChevronsUpDown', category: 'basic', order: 16,
    defaults: {
      variant: 'card', defaultOpen: 0, chevronColor: '', borderColor: '', titleSize: '', titleColor: '', itemPadding: '', contentPadding: '',
      items: [
        { title: 'Accordion #1', content: '<p>Sono un contenuto accordion. Fai clic sul pulsante di modifica per cambiare questo testo.</p>' },
        { title: 'Accordion #2', content: '<p>Sono un contenuto accordion. Fai clic sul pulsante di modifica per cambiare questo testo.</p>' },
      ],
    },
    fields: [
      { key: 'variant', label: 'Variante', control: 'select', options: [
        { value: 'card', label: 'Card (bordata)' },
        { value: 'flat', label: 'Flat (righe sottili, stile landing)' },
      ] },
      { key: 'defaultOpen', label: 'Voce aperta all\'avvio (indice, -1 = nessuna)', control: 'number' },
      { key: 'chevronColor', label: 'Colore chevron', control: 'color' },
      { key: 'borderColor', label: 'Colore bordi', control: 'color' },
      { key: 'titleSize', label: 'Dimensione titoli', control: 'text', placeholder: 'es. 18px' },
      { key: 'titleColor', label: 'Colore titoli', control: 'color' },
      { key: 'itemPadding', label: 'Padding voce', control: 'text', placeholder: 'flat: 26px 0' },
      { key: 'contentPadding', label: 'Padding contenuto', control: 'text', placeholder: 'flat: 0 32px 24px 0' },
      { key: 'items', label: 'Voci', control: 'list', itemTemplate: [
        { key: 'title', label: 'Titolo', control: 'text' },
        { key: 'content', label: 'Contenuto', control: 'richtext' },
      ]},
    ],
  },
  toggle: {
    type: 'toggle', label: 'Toggle', icon: 'ToggleRight', category: 'basic', order: 17,
    defaults: {
      items: [
        { title: 'Toggle #1', content: '<p>Sono un contenuto toggle. Fai clic sul pulsante di modifica per cambiare questo testo.</p>' },
        { title: 'Toggle #2', content: '<p>Sono un contenuto toggle. Fai clic sul pulsante di modifica per cambiare questo testo.</p>' },
      ],
    },
    fields: [
      { key: 'items', label: 'Voci', control: 'list', itemTemplate: [
        { key: 'title', label: 'Titolo', control: 'text' },
        { key: 'content', label: 'Contenuto', control: 'richtext' },
      ]},
    ],
  },
  alert: {
    type: 'alert', label: 'Avviso', icon: 'AlertCircle', category: 'basic', order: 18,
    defaults: { variant: 'info', title: 'Questo è un avviso', text: 'Sono un avviso. Fai clic sul pulsante di modifica per cambiare questo testo.', dismissible: false },
    fields: [
      { key: 'variant', label: 'Tipo', control: 'select', options: [
        { value: 'info', label: 'Info' },
        { value: 'success', label: 'Successo' },
        { value: 'warning', label: 'Attenzione' },
        { value: 'danger', label: 'Errore' },
      ]},
      { key: 'title', label: 'Titolo', control: 'text' },
      { key: 'text', label: 'Descrizione', control: 'textarea' },
      { key: 'dismissible', label: 'Chiudibile', control: 'switch' },
    ],
  },
  html: {
    type: 'html', label: 'HTML', icon: 'Code2', category: 'basic', order: 19,
    defaults: { code: '<div>Inserisci HTML personalizzato.</div>' , consentGate: false, consentNote: ''},
    fields: [{ key: 'code', label: 'Codice HTML', control: 'textarea' }],
  },
  box: {
    type: 'box', label: 'Box (contenitore)', icon: 'Group', category: 'basic', order: 20,
    defaults: {
      direction: 'column', gap: 12, align: 'stretch', justify: 'flex-start', wrap: false,
      background: '', borderRadius: '', padding: '', border: '', boxShadow: 'none',
      minHeight: '', sticky: false, stickyTop: '96px',
      children: [], overflow: '', link: '',
    },
    fields: [
      { key: 'direction', label: 'Direzione', control: 'select', options: [
        { value: 'column', label: 'Colonna (impilati)' },
        { value: 'row', label: 'Riga (affiancati)' },
      ] },
      { key: 'gap', label: 'Gap (px)', control: 'slider', min: 0, max: 64, step: 1, unit: 'px' },
      { key: 'align', label: 'Allineamento trasversale', control: 'select', options: [
        { value: 'stretch', label: 'Estendi' },
        { value: 'flex-start', label: 'Inizio' },
        { value: 'center', label: 'Centro' },
        { value: 'flex-end', label: 'Fine' },
      ] },
      { key: 'justify', label: 'Giustificazione', control: 'select', options: [
        { value: 'flex-start', label: 'Inizio' },
        { value: 'center', label: 'Centro' },
        { value: 'flex-end', label: 'Fine' },
        { value: 'space-between', label: 'Spazio tra' },
        { value: 'space-around', label: 'Spazio attorno' },
      ] },
      { key: 'wrap', label: 'A capo se stretto (riga)', control: 'switch' },
      { key: 'background', label: 'Sfondo', control: 'background-style', placeholder: 'es. #111827 o linear-gradient(...)' },
      { key: 'borderRadius', label: 'Border radius', control: 'spacing', placeholder: 'es. 18px' },
      { key: 'padding', label: 'Padding', control: 'spacing', placeholder: 'es. 26px' },
      { key: 'border', label: 'Bordo', control: 'border-style', placeholder: 'es. 1px solid #e5e7eb' },
      { key: 'boxShadow', label: 'Ombra', control: 'shadow-style', placeholder: 'es. 0 2px 12px rgba(0,0,0,0.08)' },
      { key: 'minHeight', label: 'Altezza minima', control: 'text', placeholder: 'es. 200px' },
      { key: 'sticky', label: 'Fisso allo scroll (sidebar)', control: 'switch' },
      { key: 'stickyTop', label: 'Offset sticky', control: 'text', placeholder: '96px' },
      { key: 'consentGate', label: 'Richiedi consenso cookie (terze parti)', control: 'toggle' },
      { key: 'consentNote', label: 'Messaggio placeholder consenso', control: 'text' },
    ],
  },

  // ===== PRO =====
  'posts-grid': {
    type: 'posts-grid', label: 'Articoli', icon: 'LayoutGrid', category: 'pro', order: 1,
    defaults: { columns: 3, count: 6, showImage: true, showExcerpt: true },
    fields: [
      { key: 'columns', label: 'Colonne', control: 'slider', min: 1, max: 6, step: 1 },
      { key: 'count', label: 'Numero articoli', control: 'number' },
      { key: 'showImage', label: 'Mostra immagine', control: 'switch' },
      { key: 'showExcerpt', label: 'Mostra estratto', control: 'switch' },
    ],
  },
  'contact-form': {
    type: 'contact-form', label: 'Form', icon: 'Mail', category: 'pro', order: 2,
    defaults: {
      formId: '',
      submitText: 'Invia', recipient: '',
      fields: [
        { name: 'name', label: 'Nome', type: 'text', required: true },
        { name: 'email', label: 'Email', type: 'email', required: true },
        { name: 'message', label: 'Messaggio', type: 'textarea', required: true },
      ],
    },
    fields: [
      { key: 'formId', label: 'Form ID (Form Builder)', control: 'text', placeholder: 'Lascia vuoto per fields inline', help: 'Se compilato, usa il form salvato in /admin/forms ignorando i campi sotto.' },
      { key: 'submitText', label: 'Testo bottone (fallback inline)', control: 'text' },
      { key: 'recipient', label: 'Email destinatario (fallback inline)', control: 'text' },
      { key: 'fields', label: 'Campi inline', control: 'list', itemTemplate: [
        { key: 'name', label: 'Nome campo', control: 'text' },
        { key: 'label', label: 'Etichetta', control: 'text' },
        { key: 'type', label: 'Tipo', control: 'select', options: [
          { value: 'text', label: 'Testo' },
          { value: 'email', label: 'Email' },
          { value: 'tel', label: 'Telefono' },
          { value: 'textarea', label: 'Area testo' },
          { value: 'checkbox', label: 'Checkbox' },
        ]},
        { key: 'required', label: 'Obbligatorio', control: 'switch' },
      ]},
    ],
  },
  gallery: {
    type: 'gallery', label: 'Galleria', icon: 'Images', category: 'pro', order: 3,
    defaults: { columns: 3, gap: 8, images: [] },
    fields: [
      { key: 'columns', label: 'Colonne', control: 'slider', min: 1, max: 6, step: 1 },
      { key: 'gap', label: 'Spaziatura', control: 'slider', min: 0, max: 40, step: 1, unit: 'px' },
      { key: 'images', label: 'Immagini', control: 'list', itemTemplate: [
        { key: 'src', label: 'Immagine', control: 'media' },
        { key: 'alt', label: 'Alt', control: 'text' },
      ]},
    ],
  },
  countdown: {
    type: 'countdown', label: 'Countdown', icon: 'Timer', category: 'pro', order: 4,
    defaults: { dueDate: '', labels: { days: 'Giorni', hours: 'Ore', minutes: 'Min', seconds: 'Sec' }, color: '#0f172a' },
    fields: [
      { key: 'dueDate', label: 'Data scadenza (ISO)', control: 'text', placeholder: '2026-12-31T23:59:59' },
      { key: 'color', label: 'Colore', control: 'color' },
    ],
  },
  'price-table': {
    type: 'price-table', label: 'Tabella Prezzi', icon: 'Tag', category: 'pro', order: 5,
    defaults: {
      title: 'Pro', subtitle: 'Per professionisti', currency: '€', price: '29', period: '/mese',
      featured: false, ctaText: 'Inizia ora', ctaUrl: '#',
      features: [
        { text: '10 progetti' },
        { text: 'Storage 100GB' },
        { text: 'Supporto 24/7' },
      ],
    },
    fields: [
      { key: 'title', label: 'Nome piano', control: 'text' },
      { key: 'subtitle', label: 'Sottotitolo', control: 'text' },
      { key: 'currency', label: 'Valuta', control: 'text' },
      { key: 'price', label: 'Prezzo', control: 'text' },
      { key: 'period', label: 'Periodo', control: 'text' },
      { key: 'featured', label: 'Evidenziato', control: 'switch' },
      { key: 'ctaText', label: 'Testo bottone', control: 'text' },
      { key: 'ctaUrl', label: 'Link bottone', control: 'url' },
      { key: 'features', label: 'Caratteristiche', control: 'list', itemTemplate: [
        { key: 'text', label: 'Feature', control: 'text' },
      ]},
    ],
  },
  'call-to-action': {
    type: 'call-to-action', label: 'Call to Action', icon: 'Megaphone', category: 'pro', order: 6,
    defaults: {
      title: 'Pronto a iniziare?',
      text: 'Unisciti a migliaia di clienti soddisfatti.',
      ctaText: 'Inizia gratis', ctaUrl: '#',
      background: 'linear-gradient(135deg, #92003b, #a4286a)',
      color: '#ffffff', align: 'center',
    },
    fields: [
      { key: 'title', label: 'Titolo', control: 'text' },
      { key: 'text', label: 'Descrizione', control: 'textarea' },
      { key: 'ctaText', label: 'Testo bottone', control: 'text' },
      { key: 'ctaUrl', label: 'Link bottone', control: 'url' },
      { key: 'background', label: 'Sfondo', control: 'text' },
      { key: 'color', label: 'Colore testo', control: 'color' },
      { key: 'align', label: 'Allineamento', control: 'select', options: ALIGN_OPTIONS },
    ],
  },
  // ===== GENERAL / THEME ELEMENTS =====
  'site-logo': {
    type: 'site-logo', label: 'Logo Sito', icon: 'ImagePlus', category: 'general', order: 1,
    defaults: { variant: 'auto', maxHeight: 48, link: '/', align: 'left' },
    fields: [
      { key: 'variant', label: 'Variante', control: 'select', options: [
        { value: 'auto', label: 'Auto (light)' },
        { value: 'light', label: 'Light' },
        { value: 'dark', label: 'Dark' },
      ]},
      { key: 'maxHeight', label: 'Altezza max', control: 'slider', min: 16, max: 200, step: 1, unit: 'px' },
      { key: 'link', label: 'Link', control: 'url' },
      { key: 'align', label: 'Allineamento', control: 'select', options: ALIGN_OPTIONS },
    ],
  },
  'site-title': {
    type: 'site-title', label: 'Nome Sito', icon: 'CaseSensitive', category: 'general', order: 2,
    defaults: { tag: 'span', size: '24px', weight: '700', color: '', link: '/', align: 'left' },
    fields: [
      { key: 'tag', label: 'Tag HTML', control: 'select', options: ['h1','h2','h3','span','div'].map(v => ({ value: v, label: v.toUpperCase() })) },
      { key: 'size', label: 'Dimensione', control: 'text' },
      { key: 'weight', label: 'Peso', control: 'select', options: ['400','500','600','700','800','900'].map(v => ({ value: v, label: v })) },
      { key: 'color', label: 'Colore', control: 'color' },
      { key: 'link', label: 'Link', control: 'url' },
      { key: 'align', label: 'Allineamento', control: 'select', options: ALIGN_OPTIONS },
    ],
  },
  'nav-menu': {
    type: 'nav-menu', label: 'Menu Navigazione', icon: 'Menu', category: 'general', order: 3,
    defaults: {
      align: 'left', gap: 24, color: '',
      items: [
        { label: 'Home', url: '/' },
        { label: 'Chi siamo', url: '/chi-siamo' },
        { label: 'Servizi', url: '/servizi' },
        { label: 'Contatti', url: '/contatti' },
      ],
    },
    fields: [
      { key: 'align', label: 'Allineamento', control: 'select', options: ALIGN_OPTIONS },
      { key: 'gap', label: 'Spaziatura', control: 'slider', min: 4, max: 60, step: 1, unit: 'px' },
      { key: 'color', label: 'Colore link', control: 'color' },
      { key: 'items', label: 'Voci menu', control: 'list', itemTemplate: [
        { key: 'label', label: 'Etichetta', control: 'text' },
        { key: 'url', label: 'URL', control: 'url' },
      ]},
    ],
  },
  'search-form': {
    type: 'search-form', label: 'Cerca', icon: 'Search', category: 'general', order: 4,
    defaults: { placeholder: 'Cerca...', buttonText: 'Cerca', action: '/search', width: '300px' },
    fields: [
      { key: 'placeholder', label: 'Placeholder', control: 'text' },
      { key: 'buttonText', label: 'Testo bottone', control: 'text' },
      { key: 'action', label: 'URL ricerca', control: 'url' },
      { key: 'width', label: 'Larghezza', control: 'text' },
    ],
  },
  'page-title': {
    type: 'page-title', label: 'Titolo Pagina', icon: 'Type', category: 'general', order: 5,
    defaults: { tag: 'h1', align: 'left', color: '', size: '40px', weight: '700' },
    fields: [
      { key: 'tag', label: 'Tag', control: 'select', options: ['h1','h2','h3'].map(v => ({ value: v, label: v.toUpperCase() })) },
      { key: 'align', label: 'Allineamento', control: 'select', options: ALIGN_OPTIONS },
      { key: 'color', label: 'Colore', control: 'color' },
      { key: 'size', label: 'Dimensione', control: 'text' },
      { key: 'weight', label: 'Peso', control: 'select', options: ['400','500','600','700','800'].map(v => ({ value: v, label: v })) },
    ],
  },
  'breadcrumbs': {
    type: 'breadcrumbs', label: 'Breadcrumbs', icon: 'ChevronsRight', category: 'general', order: 6,
    defaults: { separator: '/', color: '', homeLabel: 'Home' },
    fields: [
      { key: 'homeLabel', label: 'Label Home', control: 'text' },
      { key: 'separator', label: 'Separatore', control: 'text' },
      { key: 'color', label: 'Colore', control: 'color' },
    ],
  },

  // ===== DYNAMIC POST WIDGETS (per template SINGLE) =====
  'post-content': {
    type: 'post-content', label: 'Contenuto Post', icon: 'FileText', category: 'general', order: 7,
    defaults: { proseSize: 'md' },
    fields: [
      { key: 'proseSize', label: 'Dimensione testo', control: 'select', options: [
        { value: 'sm', label: 'Piccola' }, { value: 'md', label: 'Media' }, { value: 'lg', label: 'Grande' },
      ]},
    ],
  },
  'post-excerpt': {
    type: 'post-excerpt', label: 'Estratto Post', icon: 'Quote', category: 'general', order: 8,
    defaults: { color: '', size: '18px', lineHeight: '1.6' },
    fields: [
      { key: 'color', label: 'Colore', control: 'color' },
      { key: 'size', label: 'Dimensione', control: 'text' },
      { key: 'lineHeight', label: 'Interlinea', control: 'text' },
    ],
  },
  'featured-image': {
    type: 'featured-image', label: 'Immagine Evidenza', icon: 'ImagePlus', category: 'general', order: 9,
    defaults: { ratio: '16/9', radius: '12px', fallback: '' },
    fields: [
      { key: 'ratio', label: 'Aspect ratio', control: 'select', options: [
        { value: '16/9', label: '16:9' }, { value: '4/3', label: '4:3' },
        { value: '1/1', label: 'Quadrata' }, { value: '21/9', label: 'Cinema 21:9' },
        { value: 'auto', label: 'Originale' },
      ]},
      { key: 'radius', label: 'Border radius', control: 'text' },
      { key: 'fallback', label: 'Immagine fallback', control: 'media' },
    ],
  },
  'post-meta': {
    type: 'post-meta', label: 'Meta Post', icon: 'CalendarClock', category: 'general', order: 10,
    defaults: {
      showDate: true, showAuthor: true, showCategories: true, showReadTime: false,
      separator: '·', color: '',
    },
    fields: [
      { key: 'showDate', label: 'Mostra data', control: 'switch' },
      { key: 'showAuthor', label: 'Mostra autore', control: 'switch' },
      { key: 'showCategories', label: 'Mostra categorie', control: 'switch' },
      { key: 'showReadTime', label: 'Mostra tempo lettura', control: 'switch' },
      { key: 'separator', label: 'Separatore', control: 'text' },
      { key: 'color', label: 'Colore', control: 'color' },
    ],
  },
  'author-box': {
    type: 'author-box', label: 'Box Autore', icon: 'UserCircle', category: 'general', order: 11,
    defaults: { showBio: true, showAvatar: true, layout: 'card' },
    fields: [
      { key: 'showAvatar', label: 'Mostra avatar', control: 'switch' },
      { key: 'showBio', label: 'Mostra bio', control: 'switch' },
      { key: 'layout', label: 'Layout', control: 'select', options: [
        { value: 'card', label: 'Card' }, { value: 'inline', label: 'Inline' },
      ]},
    ],
  },
  'posts-list': {
    type: 'posts-list', label: 'Lista Post', icon: 'List', category: 'general', order: 12,
    defaults: {
      postType: 'post', count: 5, layout: 'list', showImage: true, showExcerpt: true, showMeta: true, columns: 1,
    },
    fields: [
      { key: 'postType', label: 'Post type slug', control: 'text', placeholder: 'post' },
      { key: 'count', label: 'Numero', control: 'number' },
      { key: 'columns', label: 'Colonne (se grid)', control: 'slider', min: 1, max: 6, step: 1 },
      { key: 'layout', label: 'Layout', control: 'select', options: [
        { value: 'list', label: 'Lista' }, { value: 'grid', label: 'Griglia' },
      ]},
      { key: 'showImage', label: 'Immagine', control: 'switch' },
      { key: 'showExcerpt', label: 'Estratto', control: 'switch' },
      { key: 'showMeta', label: 'Meta', control: 'switch' },
    ],
  },

  hero: {
    type: 'hero', label: 'Hero', icon: 'Image', category: 'pro', order: 0,
    defaults: {
      title: 'Costruisci il tuo<br/>brand digitale',
      subtitle: 'La piattaforma all-in-one per creare siti web professionali con AI integrata.',
      ctaText: 'Inizia ora',
      ctaUrl: '#',
      ctaSecondaryText: 'Scopri di più',
      ctaSecondaryUrl: '#',
      bgType: 'gradient',
      bgImage: '',
      bgVideo: '',
      bgGradient: 'linear-gradient(135deg, #92003b 0%, #1f2937 100%)',
      bgOverlay: 'rgba(0,0,0,0.4)',
      align: 'center',
      height: '600px',
      titleColor: '#ffffff',
      subtitleColor: 'rgba(255,255,255,0.85)',
      titleSize: '64px',
    },
    fields: [
      { key: 'title', label: 'Titolo (HTML ammesso)', control: 'textarea' },
      { key: 'subtitle', label: 'Sottotitolo', control: 'textarea' },
      { key: 'ctaText', label: 'Bottone primario', control: 'text' },
      { key: 'ctaUrl', label: 'Link bottone primario', control: 'url' },
      { key: 'ctaSecondaryText', label: 'Bottone secondario', control: 'text' },
      { key: 'ctaSecondaryUrl', label: 'Link bottone secondario', control: 'url' },
      { key: 'bgType', label: 'Tipo sfondo', control: 'select', options: [
        { value: 'gradient', label: 'Gradiente' },
        { value: 'image', label: 'Immagine' },
        { value: 'video', label: 'Video' },
        { value: 'color', label: 'Colore' },
      ]},
      { key: 'bgImage', label: 'Immagine sfondo', control: 'media' },
      { key: 'bgVideo', label: 'URL video sfondo (mp4)', control: 'url' },
      { key: 'bgGradient', label: 'CSS gradient', control: 'text' },
      { key: 'bgOverlay', label: 'Overlay color', control: 'color' },
      { key: 'align', label: 'Allineamento', control: 'select', options: ALIGN_OPTIONS },
      { key: 'height', label: 'Altezza', control: 'text', placeholder: '600px / 100vh' },
      { key: 'titleColor', label: 'Colore titolo', control: 'color' },
      { key: 'titleSize', label: 'Dimensione titolo', control: 'text' },
      { key: 'subtitleColor', label: 'Colore sottotitolo', control: 'color' },
    ],
  },
  'hero-slider': {
    type: 'hero-slider', label: 'Slide', icon: 'GalleryHorizontalEnd', category: 'pro', order: 0.5,
    defaults: {
      slides: [
        { title: 'Slide 1', subtitle: 'Descrizione della prima slide', ctaText: 'Scopri', ctaUrl: '#', bgImage: '', bgGradient: 'linear-gradient(135deg, #92003b, #1f2937)', bgOverlay: 'rgba(0,0,0,0.4)' },
        { title: 'Slide 2', subtitle: 'Descrizione della seconda slide', ctaText: 'Scopri', ctaUrl: '#', bgImage: '', bgGradient: 'linear-gradient(135deg, #1f2937, #92003b)', bgOverlay: 'rgba(0,0,0,0.4)' },
      ],
      autoplay: true, autoplayMs: 5000, showArrows: true, showDots: true, height: '600px', align: 'center',
    },
    fields: [
      { key: 'slides', label: 'Slide', control: 'list', itemTemplate: [
        { key: 'title', label: 'Titolo', control: 'text' },
        { key: 'subtitle', label: 'Sottotitolo', control: 'textarea' },
        { key: 'ctaText', label: 'Bottone', control: 'text' },
        { key: 'ctaUrl', label: 'Link', control: 'url' },
        { key: 'bgImage', label: 'Immagine sfondo', control: 'media' },
        { key: 'bgGradient', label: 'Gradient fallback', control: 'text' },
        { key: 'bgOverlay', label: 'Overlay', control: 'color' },
      ]},
      { key: 'height', label: 'Altezza', control: 'text' },
      { key: 'align', label: 'Allineamento testo', control: 'select', options: ALIGN_OPTIONS },
      { key: 'autoplay', label: 'Autoplay', control: 'switch' },
      { key: 'autoplayMs', label: 'Velocità (ms)', control: 'number' },
      { key: 'showArrows', label: 'Frecce', control: 'switch' },
      { key: 'showDots', label: 'Pallini', control: 'switch' },
    ],
  },

  // ===== PRO WIDGETS extra =====
  'animated-headline': {
    type: 'animated-headline', label: 'Titolo Animato', icon: 'WandSparkles', category: 'pro', order: 8,
    defaults: {
      before: 'Costruisci il tuo',
      animated: ['sito', 'brand', 'futuro'],
      after: 'con noi',
      animation: 'rotate',
      tag: 'h2',
      size: '48px',
      weight: '800',
      color: '',
      animatedColor: '',
      align: 'center',
      durationMs: 2200,
    },
    fields: [
      { key: 'before', label: 'Testo prima', control: 'text' },
      { key: 'animated', label: 'Parole animate', control: 'list', itemTemplate: [
        { key: 'value', label: 'Parola', control: 'text' },
      ]},
      { key: 'after', label: 'Testo dopo', control: 'text' },
      { key: 'animation', label: 'Animazione', control: 'select', options: [
        { value: 'rotate', label: 'Ruota' }, { value: 'fade', label: 'Fade' },
        { value: 'slide-up', label: 'Slide su' }, { value: 'typing', label: 'Macchina da scrivere' },
      ]},
      { key: 'durationMs', label: 'Durata (ms)', control: 'number' },
      { key: 'tag', label: 'Tag', control: 'select', options: ['h1','h2','h3','h4','div'].map(v => ({ value: v, label: v.toUpperCase() })) },
      { key: 'size', label: 'Dimensione', control: 'text' },
      { key: 'weight', label: 'Peso', control: 'select', options: ['400','500','600','700','800','900'].map(v => ({ value: v, label: v })) },
      { key: 'color', label: 'Colore base', control: 'color' },
      { key: 'animatedColor', label: 'Colore parole animate', control: 'color' },
      { key: 'align', label: 'Allineamento', control: 'select', options: ALIGN_OPTIONS },
    ],
  },
  'image-carousel': {
    type: 'image-carousel', label: 'Carosello Immagini', icon: 'GalleryHorizontalEnd', category: 'pro', order: 9,
    defaults: {
      images: [
        { src: '', alt: 'Slide 1' }, { src: '', alt: 'Slide 2' }, { src: '', alt: 'Slide 3' },
      ],
      slidesPerView: 3, gap: 16, autoplay: true, autoplayMs: 4000, loop: true, showArrows: true, showDots: true,
      ratio: '4/3',
    },
    fields: [
      { key: 'images', label: 'Immagini', control: 'list', itemTemplate: [
        { key: 'src', label: 'Immagine', control: 'media' },
        { key: 'alt', label: 'Alt', control: 'text' },
        { key: 'link', label: 'Link', control: 'url' },
      ]},
      { key: 'slidesPerView', label: 'Slide visibili', control: 'slider', min: 1, max: 6, step: 1 },
      { key: 'gap', label: 'Gap', control: 'slider', min: 0, max: 60, step: 1, unit: 'px' },
      { key: 'ratio', label: 'Aspect ratio', control: 'select', options: [
        { value: '16/9', label: '16:9' }, { value: '4/3', label: '4:3' },
        { value: '1/1', label: 'Quadrata' }, { value: '21/9', label: '21:9' },
      ]},
      { key: 'autoplay', label: 'Autoplay', control: 'switch' },
      { key: 'autoplayMs', label: 'Velocità (ms)', control: 'number' },
      { key: 'loop', label: 'Loop', control: 'switch' },
      { key: 'showArrows', label: 'Frecce', control: 'switch' },
      { key: 'showDots', label: 'Pallini', control: 'switch' },
    ],
  },
  'testimonial-carousel': {
    type: 'testimonial-carousel', label: 'Carosello Testimonianze', icon: 'MessagesSquare', category: 'pro', order: 10,
    defaults: {
      items: [
        { text: 'Lavoro eccezionale, super consigliato.', author: 'Mario Rossi', role: 'CEO, Acme', avatar: '', rating: 5 },
        { text: 'Servizio impeccabile.', author: 'Lucia Bianchi', role: 'CMO, Globex', avatar: '', rating: 5 },
        { text: 'Team affidabile e veloce.', author: 'Carlo Neri', role: 'CTO, Initech', avatar: '', rating: 5 },
      ],
      slidesPerView: 1, autoplay: true, autoplayMs: 5000, showDots: true, showArrows: false,
    },
    fields: [
      { key: 'items', label: 'Testimonianze', control: 'list', itemTemplate: [
        { key: 'text', label: 'Testo', control: 'textarea' },
        { key: 'author', label: 'Nome', control: 'text' },
        { key: 'role', label: 'Ruolo', control: 'text' },
        { key: 'avatar', label: 'Foto', control: 'media' },
        { key: 'rating', label: 'Stelle', control: 'slider', min: 0, max: 5, step: 1 },
      ]},
      { key: 'slidesPerView', label: 'Visibili insieme', control: 'slider', min: 1, max: 3, step: 1 },
      { key: 'autoplay', label: 'Autoplay', control: 'switch' },
      { key: 'autoplayMs', label: 'Velocità (ms)', control: 'number' },
      { key: 'showDots', label: 'Pallini', control: 'switch' },
      { key: 'showArrows', label: 'Frecce', control: 'switch' },
    ],
  },
  'flip-box': {
    type: 'flip-box', label: 'Flip Box', icon: 'FlipHorizontal2', category: 'pro', order: 11,
    defaults: {
      front: { title: 'Fronte', text: 'Passa il mouse o tocca', icon: 'Sparkles', background: '#92003b', color: '#ffffff' },
      back: { title: 'Retro', text: 'Contenuto retro', ctaText: 'Scopri', ctaUrl: '#', background: '#1f2937', color: '#ffffff' },
      direction: 'horizontal',
      height: '320px',
    },
    fields: [
      { key: 'direction', label: 'Direzione flip', control: 'select', options: [
        { value: 'horizontal', label: 'Orizzontale' }, { value: 'vertical', label: 'Verticale' },
      ]},
      { key: 'height', label: 'Altezza', control: 'text' },
      { key: 'front', label: 'Fronte', control: 'list', itemTemplate: [
        { key: 'title', label: 'Titolo', control: 'text' },
        { key: 'text', label: 'Testo', control: 'textarea' },
        { key: 'icon', label: 'Icona', control: 'icon' },
        { key: 'background', label: 'Sfondo', control: 'color' },
        { key: 'color', label: 'Testo', control: 'color' },
      ]},
      { key: 'back', label: 'Retro', control: 'list', itemTemplate: [
        { key: 'title', label: 'Titolo', control: 'text' },
        { key: 'text', label: 'Testo', control: 'textarea' },
        { key: 'ctaText', label: 'Bottone', control: 'text' },
        { key: 'ctaUrl', label: 'Link', control: 'url' },
        { key: 'background', label: 'Sfondo', control: 'color' },
        { key: 'color', label: 'Testo', control: 'color' },
      ]},
    ],
  },
  'share-buttons': {
    type: 'share-buttons', label: 'Condividi', icon: 'Share', category: 'pro', order: 12,
    defaults: {
      networks: ['facebook','twitter','linkedin','whatsapp','email'],
      align: 'left', size: 36, gap: 8, color: '#fff', radius: '8px',
    },
    fields: [
      { key: 'networks', label: 'Reti', control: 'list', itemTemplate: [
        { key: 'value', label: 'Network', control: 'select', options: [
          { value: 'facebook', label: 'Facebook' }, { value: 'twitter', label: 'X' },
          { value: 'linkedin', label: 'LinkedIn' }, { value: 'whatsapp', label: 'WhatsApp' },
          { value: 'telegram', label: 'Telegram' }, { value: 'email', label: 'Email' },
          { value: 'reddit', label: 'Reddit' }, { value: 'pinterest', label: 'Pinterest' },
        ]},
      ]},
      { key: 'align', label: 'Allineamento', control: 'select', options: ALIGN_OPTIONS },
      { key: 'size', label: 'Dimensione', control: 'slider', min: 24, max: 64, step: 2, unit: 'px' },
      { key: 'gap', label: 'Spaziatura', control: 'slider', min: 0, max: 40, step: 1, unit: 'px' },
      { key: 'radius', label: 'Border radius', control: 'text' },
      { key: 'color', label: 'Colore icone', control: 'color' },
    ],
  },
  'reviews': {
    type: 'reviews', label: 'Recensioni', icon: 'Star', category: 'pro', order: 13,
    defaults: {
      title: 'Recensioni dei clienti',
      averageRating: 4.8,
      totalCount: 247,
      items: [
        { author: 'Anna F.', rating: 5, date: '2026-01-15', text: 'Esperienza fantastica.' },
        { author: 'Marco P.', rating: 5, date: '2026-02-08', text: 'Consigliatissimo.' },
        { author: 'Sara L.', rating: 4, date: '2026-03-22', text: 'Ottimo prodotto.' },
      ],
      columns: 3,
    },
    fields: [
      { key: 'title', label: 'Titolo', control: 'text' },
      { key: 'averageRating', label: 'Media stelle', control: 'number' },
      { key: 'totalCount', label: 'Numero totale', control: 'number' },
      { key: 'columns', label: 'Colonne', control: 'slider', min: 1, max: 4, step: 1 },
      { key: 'items', label: 'Recensioni', control: 'list', itemTemplate: [
        { key: 'author', label: 'Autore', control: 'text' },
        { key: 'rating', label: 'Stelle', control: 'slider', min: 1, max: 5, step: 1 },
        { key: 'date', label: 'Data (YYYY-MM-DD)', control: 'text' },
        { key: 'text', label: 'Testo', control: 'textarea' },
      ]},
    ],
  },
  'lottie': {
    type: 'lottie', label: 'Lottie / Animazione', icon: 'PlayCircle', category: 'pro', order: 14,
    defaults: { src: '', width: '100%', height: '300px', loop: true, autoplay: true },
    fields: [
      { key: 'src', label: 'URL JSON Lottie', control: 'url', placeholder: 'https://lottie.host/.../animation.json' },
      { key: 'width', label: 'Larghezza', control: 'text' },
      { key: 'height', label: 'Altezza', control: 'text' },
      { key: 'loop', label: 'Loop', control: 'switch' },
      { key: 'autoplay', label: 'Autoplay', control: 'switch' },
    ],
  },
  'mailchimp': {
    type: 'mailchimp', label: 'Newsletter', icon: 'MailPlus', category: 'pro', order: 15,
    defaults: {
      title: 'Iscriviti alla newsletter',
      text: 'Ricevi gli aggiornamenti direttamente in posta.',
      action: '',
      placeholder: 'La tua email',
      buttonText: 'Iscriviti',
      successText: 'Grazie! Iscrizione confermata.',
      align: 'center',
    },
    fields: [
      { key: 'title', label: 'Titolo', control: 'text' },
      { key: 'text', label: 'Descrizione', control: 'textarea' },
      { key: 'action', label: 'URL action Mailchimp', control: 'url' },
      { key: 'placeholder', label: 'Placeholder email', control: 'text' },
      { key: 'buttonText', label: 'Testo bottone', control: 'text' },
      { key: 'successText', label: 'Messaggio successo', control: 'text' },
      { key: 'align', label: 'Allineamento', control: 'select', options: ALIGN_OPTIONS },
    ],
  },
  marquee: {
    type: 'marquee', label: 'Ticker / Marquee', icon: 'MoveRight', category: 'pro', order: 16,
    defaults: {
      items: 'Voce uno · Voce due · Voce tre', separator: '●', speed: 28,
      fontSize: '20px', textColor: '', textStroke: '', separatorColor: '',
      uppercase: true, letterSpacing: '0.06em', gap: 56,
    },
    fields: [
      { key: 'items', label: 'Voci (separate da ·)', control: 'textarea' },
      { key: 'separator', label: 'Separatore', control: 'text' },
      { key: 'speed', label: 'Velocità (secondi per giro)', control: 'number' },
      { key: 'fontSize', label: 'Dimensione testo', control: 'text' },
      { key: 'textColor', label: 'Colore testo', control: 'color' },
      { key: 'textSize', label: 'Dimensione testo (es. 13px)', control: 'text' },
      { key: 'iconSize', label: 'Dimensione icone (px)', control: 'number' },
      { key: 'textStroke', label: 'Contorno testo (alternativa al colore, es. 1.2px #C9BFB2)', control: 'text' },
      { key: 'separatorColor', label: 'Colore separatore', control: 'color' },
      { key: 'uppercase', label: 'Maiuscolo', control: 'toggle' },
      { key: 'gap', label: 'Spazio tra voci (px)', control: 'number' },
    ],
  },
  'nav-drawer': {
    type: 'nav-drawer', label: 'Menu Mobile (burger)', icon: 'Menu', category: 'general', order: 20,
    defaults: {
      links: 'Home|/\nPagina|/pagina',
      ctaText: '', ctaUrl: '',
      iconColor: '', panelBg: '', linkColor: '', accentColor: '',
    },
    fields: [
      { key: 'links', label: 'Voci (una per riga: Etichetta|/url)', control: 'textarea' },
      { key: 'ctaText', label: 'Bottone CTA (facoltativo)', control: 'text' },
      { key: 'ctaUrl', label: 'URL CTA', control: 'text' },
      { key: 'iconColor', label: 'Colore icona burger', control: 'color' },
      { key: 'panelBg', label: 'Sfondo pannello', control: 'color' },
      { key: 'linkColor', label: 'Colore voci', control: 'color' },
      { key: 'accentColor', label: 'Colore accento/CTA', control: 'color' },
    ],
  },

  'social-icons': {
    type: 'social-icons', label: 'Social Icons', icon: 'Share2', category: 'pro', order: 7,
    defaults: {
      align: 'center', size: 24, gap: 12, color: '#0f172a',
      variant: 'plain', buttonSize: 40, buttonBg: '#ffffff', buttonRadius: '9999px', buttonShadow: '',
      items: [
        { network: 'facebook', url: '#' },
        { network: 'instagram', url: '#' },
        { network: 'twitter', url: '#' },
        { network: 'linkedin', url: '#' },
      ],
    },
    fields: [
      { key: 'align', label: 'Allineamento', control: 'select', options: ALIGN_OPTIONS },
      { key: 'size', label: 'Dimensione', control: 'slider', min: 16, max: 64, step: 1, unit: 'px' },
      { key: 'gap', label: 'Spaziatura', control: 'slider', min: 0, max: 40, step: 1, unit: 'px' },
      { key: 'color', label: 'Colore', control: 'color' },
      { key: 'variant', label: 'Variante', control: 'select', options: [
        { value: 'plain', label: 'Solo icone' },
        { value: 'button', label: 'Bottoni (cerchio con sfondo)' },
      ] },
      { key: 'buttonSize', label: 'Diametro bottone', control: 'slider', min: 28, max: 72, step: 1, unit: 'px' },
      { key: 'buttonBg', label: 'Sfondo bottone', control: 'color' },
      { key: 'buttonRadius', label: 'Radius bottone', control: 'text', placeholder: '9999px (cerchio)' },
      { key: 'buttonShadow', label: 'Ombra bottone', control: 'text', placeholder: '0 2px 8px rgba(0,0,0,0.06)' },
      { key: 'items', label: 'Profili', control: 'list', itemTemplate: [
        { key: 'network', label: 'Rete', control: 'select', options: [
          { value: 'facebook', label: 'Facebook' },
          { value: 'instagram', label: 'Instagram' },
          { value: 'twitter', label: 'X / Twitter' },
          { value: 'linkedin', label: 'LinkedIn' },
          { value: 'youtube', label: 'YouTube' },
          { value: 'tiktok', label: 'TikTok' },
          { value: 'whatsapp', label: 'WhatsApp' },
          { value: 'github', label: 'GitHub' },
        ]},
        { key: 'url', label: 'URL', control: 'url' },
      ]},
    ],
  },
};

export const WIDGET_CATEGORIES: { key: WidgetCategory; label: string }[] = [
  { key: 'basic', label: 'Base' },
  { key: 'pro', label: 'Pro' },
  { key: 'general', label: 'Generale' },
];

export function getWidgetsByCategory(cat: WidgetCategory): WidgetDescriptor[] {
  return Object.values(WIDGETS)
    .filter((w) => w.category === cat)
    .sort((a, b) => a.order - b.order);
}

export function createElement(type: WidgetType): ElementNode {
  return {
    id: `e_${nanoid(8)}`,
    type,
    settings: structuredClone(WIDGETS[type].defaults),
  };
}

export function createColumn(width = 100): ColumnNode {
  return {
    id: `c_${nanoid(8)}`,
    type: 'column',
    width,
    settings: { padding: '10px', align: 'left' },
    elements: [],
  };
}

export function createSection(columns = 1): SectionNode {
  const widths = Array.from({ length: columns }, () => Math.floor(100 / columns));
  return {
    id: `s_${nanoid(8)}`,
    type: 'section',
    settings: { padding: '40px 20px', background: 'transparent', gap: '20px' },
    columns: widths.map((w) => createColumn(w)),
  };
}

export function emptyPage(): PageContent {
  return { sections: [] };
}
