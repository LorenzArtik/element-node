import type { PageContent, ElementNode, SectionNode, ColumnNode } from './widgets-schema';

export interface SeoCheck {
  id: string;
  label: string;
  status: 'pass' | 'warn' | 'fail';
  hint?: string;
}

export interface SeoAnalysis {
  score: number;
  checks: SeoCheck[];
  stats: {
    titleLength: number;
    descLength: number;
    wordCount: number;
    keywordOccurrences: number;
    keywordDensity: number;
    headingsCount: number;
    imagesCount: number;
    imagesWithoutAlt: number;
    fleschScore: number;
  };
}

interface AnalyzeInput {
  title: string;
  seoTitle?: string | null;
  seoDesc?: string | null;
  slug: string;
  content?: PageContent | null;
  contentText?: string | null;
  focusKeyword?: string | null;
  excerpt?: string | null;
}

/**
 * Estrae testo + count immagini + headings da un PageContent JSON tree
 */
export function extractTextFromContent(content?: PageContent | null) {
  let text = '';
  let headings = 0;
  let images = 0;
  let imagesNoAlt = 0;
  if (!content?.sections) return { text, headings, images, imagesNoAlt };
  for (const s of content.sections as SectionNode[]) {
    for (const c of s.columns as ColumnNode[]) {
      for (const e of c.elements as ElementNode[]) {
        const set = e.settings as Record<string, unknown>;
        if (e.type === 'heading' || e.type === 'page-title' || e.type === 'site-title' || e.type === 'animated-headline') headings++;
        if (e.type === 'image' || e.type === 'image-box' || e.type === 'featured-image') {
          images++;
          if (!set.alt && !set.caption) imagesNoAlt++;
        }
        // raccogli testo
        for (const k of ['text', 'title', 'subtitle', 'html', 'before', 'after', 'caption', 'label', 'description', 'ctaText']) {
          const v = set[k];
          if (typeof v === 'string') text += ' ' + v.replace(/<[^>]+>/g, ' ');
        }
      }
    }
  }
  return { text: text.trim(), headings, images, imagesNoAlt };
}

function syllablesIt(word: string): number {
  word = word.toLowerCase().replace(/[^a-zàèéìòù]/g, '');
  if (!word) return 0;
  // Approssimazione italiana: conta gruppi vocalici
  const matches = word.match(/[aeiouàèéìòù]+/g);
  return Math.max(1, matches?.length ?? 1);
}

/**
 * Flesch Reading Ease adattato per italiano (formula Vacca/Franchina-Vacca):
 * 217 - 1.3 × (words/sentences) - 60 × (syllables/words)
 * Output range: 0 (difficile) - 100 (semplice)
 */
function fleschItalian(text: string): number {
  if (!text.trim()) return 0;
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim()).length || 1;
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return 0;
  const syllables = words.reduce((sum, w) => sum + syllablesIt(w), 0);
  const score = 217 - 1.3 * (words.length / sentences) - 60 * (syllables / words.length);
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function analyzeSeo(input: AnalyzeInput): SeoAnalysis {
  const title = input.seoTitle || input.title || '';
  const desc = input.seoDesc || input.excerpt || '';
  const focus = (input.focusKeyword || '').toLowerCase().trim();
  const extracted = extractTextFromContent(input.content);
  const fullText = (extracted.text + ' ' + (input.contentText ?? '').replace(/<[^>]+>/g, ' ')).trim();
  const words = fullText.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const keywordOccurrences = focus
    ? (fullText.toLowerCase().match(new RegExp(`\\b${escapeRegex(focus)}\\b`, 'g'))?.length ?? 0)
    : 0;
  const keywordDensity = wordCount > 0 ? (keywordOccurrences / wordCount) * 100 : 0;
  const flesch = fleschItalian(fullText);

  const checks: SeoCheck[] = [];

  // Title
  if (title.length === 0) checks.push({ id: 'title-empty', label: 'Manca SEO title', status: 'fail' });
  else if (title.length < 30) checks.push({ id: 'title-short', label: `SEO title troppo corto (${title.length}/30)`, status: 'warn', hint: 'Punta a 30-65 caratteri' });
  else if (title.length > 65) checks.push({ id: 'title-long', label: `SEO title troppo lungo (${title.length}/65)`, status: 'warn', hint: 'Google taglia oltre i 65 caratteri' });
  else checks.push({ id: 'title-ok', label: `SEO title lunghezza OK (${title.length})`, status: 'pass' });

  // Description
  if (desc.length === 0) checks.push({ id: 'desc-empty', label: 'Manca meta description', status: 'fail' });
  else if (desc.length < 120) checks.push({ id: 'desc-short', label: `Description corta (${desc.length}/120)`, status: 'warn' });
  else if (desc.length > 160) checks.push({ id: 'desc-long', label: `Description lunga (${desc.length}/160)`, status: 'warn' });
  else checks.push({ id: 'desc-ok', label: `Description OK (${desc.length})`, status: 'pass' });

  // Slug
  if (!input.slug) checks.push({ id: 'slug-missing', label: 'Slug mancante', status: 'fail' });
  else if (input.slug.length > 60) checks.push({ id: 'slug-long', label: 'Slug troppo lungo', status: 'warn' });
  else checks.push({ id: 'slug-ok', label: 'Slug OK', status: 'pass' });

  // Focus keyword checks
  if (focus) {
    if (title.toLowerCase().includes(focus)) checks.push({ id: 'fk-title', label: 'Focus keyword nel title', status: 'pass' });
    else checks.push({ id: 'fk-title', label: 'Focus keyword non presente nel title', status: 'fail' });

    if (desc.toLowerCase().includes(focus)) checks.push({ id: 'fk-desc', label: 'Focus keyword nella description', status: 'pass' });
    else checks.push({ id: 'fk-desc', label: 'Focus keyword non presente nella description', status: 'warn' });

    if (input.slug.toLowerCase().includes(focus.replace(/\s+/g, '-'))) checks.push({ id: 'fk-slug', label: 'Focus keyword nello slug', status: 'pass' });
    else checks.push({ id: 'fk-slug', label: 'Focus keyword non presente nello slug', status: 'warn' });

    if (keywordOccurrences === 0) checks.push({ id: 'fk-body', label: 'Focus keyword non presente nel testo', status: 'fail' });
    else if (keywordDensity < 0.3) checks.push({ id: 'fk-density-low', label: `Densità keyword bassa (${keywordDensity.toFixed(2)}%)`, status: 'warn' });
    else if (keywordDensity > 3) checks.push({ id: 'fk-density-high', label: `Densità keyword alta (${keywordDensity.toFixed(2)}%)`, status: 'warn', hint: 'Possibile keyword stuffing' });
    else checks.push({ id: 'fk-density-ok', label: `Densità keyword OK (${keywordDensity.toFixed(2)}%)`, status: 'pass' });
  } else {
    checks.push({ id: 'fk-missing', label: 'Imposta una focus keyword per analisi più dettagliata', status: 'warn' });
  }

  // Word count
  if (wordCount < 100) checks.push({ id: 'wc-low', label: `Testo molto breve (${wordCount} parole)`, status: 'warn' });
  else if (wordCount < 300) checks.push({ id: 'wc-mid', label: `Testo breve (${wordCount} parole, ideale ≥300)`, status: 'warn' });
  else checks.push({ id: 'wc-ok', label: `Lunghezza testo OK (${wordCount} parole)`, status: 'pass' });

  // Headings
  if (extracted.headings === 0) checks.push({ id: 'h-missing', label: 'Nessun heading nei widget', status: 'warn' });
  else checks.push({ id: 'h-ok', label: `${extracted.headings} heading nel contenuto`, status: 'pass' });

  // Images alt
  if (extracted.images > 0) {
    if (extracted.imagesNoAlt > 0) checks.push({ id: 'img-alt', label: `${extracted.imagesNoAlt}/${extracted.images} immagini senza alt`, status: 'warn' });
    else checks.push({ id: 'img-alt', label: 'Tutte le immagini hanno alt', status: 'pass' });
  }

  // Flesch
  if (flesch < 40) checks.push({ id: 'flesch', label: `Leggibilità difficile (${flesch}/100)`, status: 'warn', hint: 'Frasi più corte, parole più semplici' });
  else if (flesch < 60) checks.push({ id: 'flesch', label: `Leggibilità media (${flesch}/100)`, status: 'pass' });
  else checks.push({ id: 'flesch', label: `Leggibilità buona (${flesch}/100)`, status: 'pass' });

  const total = checks.length;
  const passed = checks.filter((c) => c.status === 'pass').length;
  const score = Math.round((passed / total) * 100);

  return {
    score,
    checks,
    stats: {
      titleLength: title.length,
      descLength: desc.length,
      wordCount,
      keywordOccurrences,
      keywordDensity: Number(keywordDensity.toFixed(2)),
      headingsCount: extracted.headings,
      imagesCount: extracted.images,
      imagesWithoutAlt: extracted.imagesNoAlt,
      fleschScore: flesch,
    },
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============ JSON-LD ============

export interface JsonLdInput {
  type: 'WebSite' | 'Article' | 'WebPage';
  url: string;
  siteName: string;
  title: string;
  description?: string;
  image?: string | null;
  publishedAt?: string | null;
  author?: { name: string; url?: string } | null;
  breadcrumbs?: { name: string; url: string }[];
}

export function buildJsonLd(input: JsonLdInput): object[] {
  const ld: object[] = [];
  if (input.type === 'Article') {
    ld.push({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: input.title,
      description: input.description,
      image: input.image ? [input.image] : undefined,
      datePublished: input.publishedAt,
      author: input.author ? { '@type': 'Person', name: input.author.name } : undefined,
      publisher: { '@type': 'Organization', name: input.siteName },
      mainEntityOfPage: { '@type': 'WebPage', '@id': input.url },
    });
  } else if (input.type === 'WebPage') {
    ld.push({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      url: input.url,
      name: input.title,
      description: input.description,
      isPartOf: { '@type': 'WebSite', name: input.siteName },
    });
  } else if (input.type === 'WebSite') {
    ld.push({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      url: input.url,
      name: input.siteName,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${input.url.replace(/\/$/, '')}/search?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    });
  }
  if (input.breadcrumbs && input.breadcrumbs.length > 1) {
    ld.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: input.breadcrumbs.map((b, i) => ({
        '@type': 'ListItem', position: i + 1, name: b.name, item: b.url,
      })),
    });
  }
  return ld;
}
