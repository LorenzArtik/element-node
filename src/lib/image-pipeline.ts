/**
 * Image pipeline: genera variants webp da un buffer caricato.
 * - sm 480px (mobile)
 * - md 800px (tablet)
 * - lg 1280px (desktop)
 * - xl 1920px (retina/large)
 *
 * Output: salvati in public/uploads/<id>/<size>.webp
 * Ritorna { width, height, variants: { sm, md, lg, xl } }
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';

type Variants = { sm?: string; md?: string; lg?: string; xl?: string };

interface ProcessResult {
  width: number;
  height: number;
  variants: Variants;
}

const SIZES: { key: keyof Variants; width: number }[] = [
  { key: 'sm', width: 480 },
  { key: 'md', width: 800 },
  { key: 'lg', width: 1280 },
  { key: 'xl', width: 1920 },
];

const UPLOAD_DIR = process.env.UPLOAD_DIR || './public/uploads';
const PUBLIC_PREFIX = '/uploads';

/**
 * Processa un'immagine: genera variants webp e ritorna i metadati.
 * Se sharp non è disponibile o l'input non è un'immagine, ritorna variants vuoti.
 */
export async function processImage(buffer: Buffer, baseName: string): Promise<ProcessResult> {
  const fallback: ProcessResult = { width: 0, height: 0, variants: {} };
  let sharp;
  try {
    // Dynamic import: se sharp non è installato non blocca l'upload
    sharp = (await import('sharp')).default;
  } catch {
    return fallback;
  }

  try {
    const meta = await sharp(buffer).metadata();
    const origW = meta.width ?? 0;
    const origH = meta.height ?? 0;
    if (!origW || !origH) return fallback;

    const variants: Variants = {};
    const dir = join(UPLOAD_DIR, baseName);
    await mkdir(dir, { recursive: true });

    for (const s of SIZES) {
      // Non upscale
      if (origW < s.width) continue;
      const targetPath = join(dir, `${s.key}.webp`);
      const out = await sharp(buffer)
        .resize({ width: s.width, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
      await writeFile(targetPath, out);
      variants[s.key] = `${PUBLIC_PREFIX}/${baseName}/${s.key}.webp`;
    }

    // Always create at least one variant (the original re-encoded)
    if (Object.keys(variants).length === 0) {
      const targetPath = join(dir, 'sm.webp');
      const out = await sharp(buffer).webp({ quality: 82 }).toBuffer();
      await writeFile(targetPath, out);
      variants.sm = `${PUBLIC_PREFIX}/${baseName}/sm.webp`;
    }

    return { width: origW, height: origH, variants };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[image-pipeline] error', e);
    return fallback;
  }
}

/**
 * Ritorna l'URL della variant più grande disponibile (fallback alla src originale).
 */
export function pickLargestVariant(variants: Variants | null | undefined, original: string): string {
  if (!variants) return original;
  return variants.xl ?? variants.lg ?? variants.md ?? variants.sm ?? original;
}

/**
 * Ritorna srcset string per <img>.
 */
export function buildSrcset(variants: Variants | null | undefined): string | undefined {
  if (!variants) return undefined;
  const parts: string[] = [];
  if (variants.sm) parts.push(`${variants.sm} 480w`);
  if (variants.md) parts.push(`${variants.md} 800w`);
  if (variants.lg) parts.push(`${variants.lg} 1280w`);
  if (variants.xl) parts.push(`${variants.xl} 1920w`);
  return parts.length ? parts.join(', ') : undefined;
}

void dirname;
