#!/usr/bin/env node
/**
 * Syntax gate for Supabase edge functions.
 *
 * These run on Deno, so `tsc -b` (which covers src/ only) never sees them, and
 * Deno is not installed in every environment that builds this repo. That left
 * the functions handling real card payments with no automated checking at all --
 * a stray brace or a bad edit would surface first as a 500 in production.
 *
 * This is a syntax gate, not a type check: it parses every function with the
 * TypeScript compiler's own parser and reports parse diagnostics. It will not
 * catch a wrong field name or a bad argument type. Run `deno check` where Deno
 * is available for the stronger guarantee.
 *
 * Usage: npm run check:edge
 */
import ts from 'typescript';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const functionsDir = path.join(root, 'supabase', 'functions');

function collect(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collect(full));
    else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) out.push(full);
  }
  return out;
}

const files = collect(functionsDir).sort();
let failed = 0;

for (const file of files) {
  const rel = path.relative(root, file);
  const source = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
  const diagnostics = sf.parseDiagnostics ?? [];

  if (diagnostics.length > 0) {
    failed++;
    console.log(`FAIL  ${rel}`);
    for (const d of diagnostics.slice(0, 5)) {
      const { line, character } = sf.getLineAndCharacterOfPosition(d.start ?? 0);
      console.log(`        ${line + 1}:${character + 1}  ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`);
    }
  }
}

if (failed > 0) {
  console.log(`\n${failed} of ${files.length} edge function file(s) failed to parse.`);
  process.exit(1);
}
console.log(`All ${files.length} edge function files parse cleanly.`);
