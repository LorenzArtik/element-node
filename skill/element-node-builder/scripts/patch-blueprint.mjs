#!/usr/bin/env node
// patch-blueprint.mjs — Applica una lista di operazioni JSON Patch (RFC 6902-like)
// a un blueprint Element Node.
//
// Usage:
//   node patch-blueprint.mjs <blueprint.json> <patches.json> [--out <file>]
//
// Operazioni supportate:
//   { "op": "replace", "path": "/pages/0/title", "value": "Nuovo" }
//   { "op": "add",     "path": "/pages/0/content/sections/3/columns/-", "value": {...} }   // append
//   { "op": "add",     "path": "/pages/0/content/sections/3/columns/0", "value": {...} }   // insert
//   { "op": "remove",  "path": "/pages/0/content/sections/4" }
//   { "op": "move",    "from": "/.../sections/3", "path": "/.../sections/1" }
//   { "op": "copy",    "from": "/.../sections/3", "path": "/.../sections/-" }
//
// Path tokens (JSON Pointer):
//   - "/" separa i livelli
//   - Numeri o "-" per array (- = append)
//   - "~1" per "/" letterale, "~0" per "~" letterale (raro)

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const file = args[0];
const patchesFile = args[1];
const outArg = (() => { const i = args.indexOf('--out'); return i >= 0 ? args[i + 1] : null; })();
if (!file || !patchesFile) {
  console.error('Usage: node patch-blueprint.mjs <blueprint.json> <patches.json> [--out <file>]');
  process.exit(1);
}

const bp = JSON.parse(await readFile(resolve(file), 'utf-8'));
const patchesRaw = JSON.parse(await readFile(resolve(patchesFile), 'utf-8'));
// Accetta più formati:
//   - array di patches: [{op, path, value}, ...]
//   - { patches: [...] }
//   - { differences: [{patch: {...}} | {patches: [...]}] }   (output dell'agente comparatore)
function extractPatches(input) {
  if (Array.isArray(input)) return input.filter((p) => p && typeof p === 'object' && p.op);
  if (input.patches && Array.isArray(input.patches)) return extractPatches(input.patches);
  if (input.differences && Array.isArray(input.differences)) {
    const out = [];
    for (const d of input.differences) {
      if (d.patch && typeof d.patch === 'object') out.push(d.patch);
      else if (Array.isArray(d.patches)) out.push(...d.patches);
    }
    return out.filter((p) => p && typeof p === 'object' && p.op && typeof p.path === 'string' && p.path.startsWith('/'));
  }
  return [];
}
const patches = extractPatches(patchesRaw);

function parsePath(path) {
  if (!path || typeof path !== 'string') throw new Error(`Invalid path: ${path}`);
  if (path === '') return [];
  if (!path.startsWith('/')) throw new Error(`Path must start with /: ${path}`);
  return path.slice(1).split('/').map((t) => t.replace(/~1/g, '/').replace(/~0/g, '~'));
}

function getParent(obj, tokens) {
  let cur = obj;
  for (let i = 0; i < tokens.length - 1; i++) {
    const t = tokens[i];
    if (Array.isArray(cur)) cur = cur[parseInt(t, 10)];
    else cur = cur[t];
    if (cur == null) throw new Error(`Path not found at token "${t}" of ${tokens.join('/')}`);
  }
  return cur;
}

function applyOp(obj, op) {
  const tokens = parsePath(op.path);
  if (tokens.length === 0) throw new Error('Cannot patch root');
  const last = tokens[tokens.length - 1];
  const parent = getParent(obj, tokens);

  switch (op.op) {
    case 'replace': {
      if (Array.isArray(parent)) parent[parseInt(last, 10)] = op.value;
      else parent[last] = op.value;
      return;
    }
    case 'add': {
      if (Array.isArray(parent)) {
        if (last === '-') parent.push(op.value);
        else parent.splice(parseInt(last, 10), 0, op.value);
      } else {
        parent[last] = op.value;
      }
      return;
    }
    case 'remove': {
      if (Array.isArray(parent)) parent.splice(parseInt(last, 10), 1);
      else delete parent[last];
      return;
    }
    case 'move': {
      if (!op.from) throw new Error('move op requires "from"');
      const fromTokens = parsePath(op.from);
      const fromLast = fromTokens[fromTokens.length - 1];
      const fromParent = getParent(obj, fromTokens);
      let value;
      if (Array.isArray(fromParent)) {
        value = fromParent.splice(parseInt(fromLast, 10), 1)[0];
      } else {
        value = fromParent[fromLast];
        delete fromParent[fromLast];
      }
      applyOp(obj, { op: 'add', path: op.path, value });
      return;
    }
    case 'copy': {
      if (!op.from) throw new Error('copy op requires "from"');
      const fromTokens = parsePath(op.from);
      const fromLast = fromTokens[fromTokens.length - 1];
      const fromParent = getParent(obj, fromTokens);
      const value = Array.isArray(fromParent)
        ? fromParent[parseInt(fromLast, 10)]
        : fromParent[fromLast];
      applyOp(obj, { op: 'add', path: op.path, value: structuredClone(value) });
      return;
    }
    default:
      throw new Error(`Unsupported op: ${op.op}`);
  }
}

let applied = 0, failed = 0;
const errors = [];
for (let i = 0; i < patches.length; i++) {
  const op = patches[i];
  try {
    applyOp(bp, op);
    applied++;
  } catch (e) {
    failed++;
    errors.push({ index: i, op, error: e.message });
  }
}

const outFile = outArg ? resolve(outArg) : resolve(file);
await writeFile(outFile, JSON.stringify(bp, null, 2));

console.log(`\n${applied} applicate / ${failed} fallite (totale ${patches.length})`);
if (errors.length) {
  console.log('\nErrori:');
  for (const e of errors) {
    console.log(`  [#${e.index}] op=${e.op.op} path=${e.op.path} → ${e.error}`);
  }
}
console.log(`\nOutput: ${outFile}`);
if (failed > 0) process.exit(1);
