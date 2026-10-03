import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { scopeDocumentCss } from '../src/services/printScope.ts';

test('html and body selectors point at the stand-in body', () => {
  assert.equal(
    scopeDocumentCss('body{margin:0} html, body { color:#111 } .a body p{x:1}'),
    '.print-doc-body{margin:0} .print-doc-body, .print-doc-body { color:#111 } .a .print-doc-body p{x:1}'
  );
});

test('rules inside @media are scoped too, and the media query is left alone', () => {
  assert.equal(
    scopeDocumentCss('@media print{button{display:none}body{margin:12px}}'),
    '@media print{button{display:none}.print-doc-body{margin:12px}}'
  );
});

test('declarations and look-alike class names are untouched', () => {
  const css = '.body-copy{font-family:body} .tbody{a:b} tbody td{c:d} * { box-sizing: border-box; }';
  assert.equal(scopeDocumentCss(css), css);
});

test('comments are dropped so a brace in one cannot derail the walk', () => {
  assert.equal(scopeDocumentCss('/* body { } */ body{a:b}'), ' .print-doc-body{a:b}');
});

test('every printable document stylesheet keeps its rule count after scoping', () => {
  const shared = readFileSync('src/services/printDocumentStyles.ts', 'utf8');
  const css = shared.slice(shared.indexOf('`') + 1, shared.lastIndexOf('`'));
  const scoped = scopeDocumentCss(css);
  assert.equal((scoped.match(/\{/g) ?? []).length, (css.replace(/\/\*[\s\S]*?\*\//g, '').match(/\{/g) ?? []).length);
  assert.doesNotMatch(scoped, /(^|[\s,}])body\s*\{/);
});
