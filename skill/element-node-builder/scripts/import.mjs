#!/usr/bin/env node
// Import a Site Blueprint into Element Node CMS via /api/admin/import.
// Usage: node import.mjs <blueprint.json> [--dry-run] [--replace] [--skip-site-settings]

import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const dryRun = args.includes('--dry-run');
const replace = args.includes('--replace');
const skipSiteSettings = args.includes('--skip-site-settings');

if (!file) {
  console.error('Usage: node import.mjs <blueprint.json> [--dry-run] [--replace] [--skip-site-settings]');
  process.exit(1);
}

const url = process.env.EN_URL || 'http://localhost:3000';
const key = process.env.EN_KEY;
if (!key) {
  console.error('Missing EN_KEY env var. Genera una API key da /admin/api-keys e:\n  export EN_KEY="en_live_..."');
  process.exit(1);
}

const blueprint = JSON.parse(readFileSync(file, 'utf-8'));
console.log(`Importing ${file} → ${url} (dryRun=${dryRun}, strategy=${replace ? 'replace' : 'merge'})`);

const res = await fetch(`${url}/api/admin/import`, {
  method: 'POST',
  headers: { 'authorization': `Bearer ${key}`, 'content-type': 'application/json' },
  body: JSON.stringify({
    blueprint,
    options: { dryRun, strategy: replace ? 'replace' : 'merge', skipSiteSettings },
  }),
});

const data = await res.json();
if (!res.ok) {
  console.error(`✗ HTTP ${res.status}:`, data);
  process.exit(1);
}

console.log('\n=== Report ===');
console.log(`Mode: ${data.dryRun ? 'DRY RUN' : 'APPLIED'} (${data.strategy})`);
const fmt = (obj) => Object.entries(obj || {}).map(([k, v]) => `  ${k}: ${v}`).join('\n') || '  (nessuno)';
console.log('\nCreated:'); console.log(fmt(data.created));
console.log('\nUpdated:'); console.log(fmt(data.updated));
if (data.errors?.length) {
  console.log('\nErrori:');
  for (const e of data.errors) console.log(`  ${e.entity}${e.key ? ` [${e.key}]` : ''}: ${e.message}`);
}
console.log('\n✓ Done');
