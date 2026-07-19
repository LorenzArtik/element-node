#!/usr/bin/env node
// Scrape semplice di una URL → struttura JSON utile per blueprint.
// Usage: node scrape.mjs <url>
// Estrae: title, meta, headings, images, links, palette (RGB più frequenti)

const target = process.argv[2];
if (!target) {
  console.error('Usage: node scrape.mjs <url>');
  process.exit(1);
}

const res = await fetch(target, {
  headers: { 'user-agent': 'Mozilla/5.0 (compatible; ElementNodeScraper/1.0)' },
});
if (!res.ok) {
  console.error(`HTTP ${res.status}`);
  process.exit(1);
}
const html = await res.text();
const baseUrl = new URL(target);

function getMeta(name) {
  const re = new RegExp(`<meta[^>]+(?:name|property)="${name}"[^>]+content="([^"]+)"`, 'i');
  return html.match(re)?.[1] ?? null;
}

const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? null;
const desc = getMeta('description') ?? getMeta('og:description');
const ogImage = getMeta('og:image');
const ogTitle = getMeta('og:title');
const siteName = getMeta('og:site_name');

// Headings
const headings = [];
const hRe = /<(h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi;
let m;
while ((m = hRe.exec(html)) !== null) {
  const text = m[2].replace(/<[^>]+>/g, '').trim();
  if (text) headings.push({ tag: m[1].toLowerCase(), text });
}

// Images
const images = [];
const imgRe = /<img[^>]+src="([^"]+)"(?:[^>]+alt="([^"]*)")?/gi;
while ((m = imgRe.exec(html)) !== null) {
  let src = m[1];
  if (src.startsWith('//')) src = 'https:' + src;
  else if (src.startsWith('/')) src = baseUrl.origin + src;
  images.push({ src, alt: m[2] ?? '' });
}

// Internal links
const links = new Set();
const linkRe = /<a[^>]+href="([^"#]+)"[^>]*>([^<]*)<\/a>/gi;
while ((m = linkRe.exec(html)) !== null) {
  let href = m[1];
  if (href.startsWith('http') && !href.includes(baseUrl.hostname)) continue;
  if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) continue;
  if (href.startsWith('//')) href = 'https:' + href;
  else if (href.startsWith('/')) href = baseUrl.origin + href;
  if (href.includes(baseUrl.hostname)) {
    const path = new URL(href).pathname;
    if (path !== '/') links.add(path);
  }
}

// Google Fonts
const fonts = [];
const fontRe = /fonts\.googleapis\.com\/css2?\?family=([^&"'\s]+)/g;
while ((m = fontRe.exec(html)) !== null) {
  fonts.push(decodeURIComponent(m[1]).split(':')[0].replace(/\+/g, ' '));
}

// Color palette: estrae valori esadecimali frequenti dai style/inline
const colorCounts = new Map();
const hexRe = /#[0-9a-f]{3,8}\b/gi;
while ((m = hexRe.exec(html)) !== null) {
  const c = m[0].toLowerCase();
  colorCounts.set(c, (colorCounts.get(c) ?? 0) + 1);
}
const palette = Array.from(colorCounts.entries())
  .sort(([, a], [, b]) => b - a)
  .slice(0, 8)
  .map(([color, count]) => ({ color, count }));

const result = {
  url: target,
  title: ogTitle ?? title,
  description: desc,
  siteName,
  ogImage,
  fonts: [...new Set(fonts)],
  palette,
  headings: headings.slice(0, 50),
  images: images.slice(0, 30),
  internalLinks: Array.from(links).slice(0, 30),
};

console.log(JSON.stringify(result, null, 2));
