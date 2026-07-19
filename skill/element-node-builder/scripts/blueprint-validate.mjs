#!/usr/bin/env node
// Validazione locale di un blueprint via dry-run sul CMS.
// Usage: node blueprint-validate.mjs <blueprint.json>

import { readFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node blueprint-validate.mjs <blueprint.json>');
  process.exit(1);
}

const url = process.env.EN_URL || 'http://localhost:3000';
const key = process.env.EN_KEY;
if (!key) { console.error('Missing EN_KEY env var'); process.exit(1); }

const blueprint = JSON.parse(readFileSync(file, 'utf-8'));

// Sanity check locale
const issues = [];
if (blueprint.version !== '1.0') issues.push('version deve essere "1.0"');
if (!blueprint.site?.name) issues.push('site.name mancante');
if (blueprint.pages) {
  const homes = blueprint.pages.filter((p) => p.isHomepage);
  if (homes.length > 1) issues.push(`troppe homepage: ${homes.length} (max 1)`);
}
const slugs = new Map();
for (const p of blueprint.pages ?? []) {
  if (slugs.has(p.slug)) issues.push(`page slug duplicato: ${p.slug}`);
  slugs.set(p.slug, true);
}

if (issues.length) {
  console.log('Issues locali:');
  issues.forEach((i) => console.log(`  - ${i}`));
}

// Server-side dry run
const res = await fetch(`${url}/api/admin/import`, {
  method: 'POST',
  headers: { 'authorization': `Bearer ${key}`, 'content-type': 'application/json' },
  body: JSON.stringify({ blueprint, options: { dryRun: true } }),
});
const data = await res.json();
if (!res.ok) {
  console.error(`✗ Server validation failed (${res.status}):`, JSON.stringify(data, null, 2));
  process.exit(1);
}
console.log('\n✓ Blueprint valido. Anteprima:');
console.log(`  Created: ${JSON.stringify(data.created)}`);
console.log(`  Updated: ${JSON.stringify(data.updated)}`);
if (data.errors?.length) {
  console.log(`  Errori: ${data.errors.length}`);
  data.errors.forEach((e) => console.log(`    - ${e.entity}${e.key ? ` [${e.key}]` : ''}: ${e.message}`));
}
