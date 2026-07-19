#!/usr/bin/env node
// Export current site as Site Blueprint JSON.
// Usage: node export.mjs > backup.json

const url = process.env.EN_URL || 'http://localhost:3000';
const key = process.env.EN_KEY;
if (!key) {
  console.error('Missing EN_KEY env var');
  process.exit(1);
}

const res = await fetch(`${url}/api/admin/export`, {
  headers: { 'authorization': `Bearer ${key}` },
});
if (!res.ok) {
  console.error(`HTTP ${res.status}: ${await res.text()}`);
  process.exit(1);
}
process.stdout.write(await res.text());
