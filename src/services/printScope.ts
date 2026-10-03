/**
 * The printable documents (quotes, receipts, earnings, the contractor
 * agreement) are whole HTML pages whose CSS styles `html` and `body`. On iOS
 * they are shown inside a shadow root on the app's own page rather than in an
 * iframe, and a shadow root has no `html` or `body` of its own, so those
 * selectors are pointed at the element that stands in for the page body.
 *
 * No imports, so the node test runner can load it.
 */

export const DOC_BODY_CLASS = 'print-doc-body';

/** Rewrites `html` and `body` where they are used as selectors, leaving
 *  declarations and at-rule preludes (`@media print`) alone. */
export function scopeDocumentCss(css: string): string {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, '');
  let out = '';
  let start = 0;
  // One entry per open block: true for a declaration block, false for a block
  // of rules such as @media.
  const stack: boolean[] = [];
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    const inDeclarations = stack[stack.length - 1] === true;
    if (ch === '{') {
      const head = src.slice(start, i);
      const atRule = /^\s*@/.test(head);
      out += inDeclarations || atRule ? head : rewriteSelector(head);
      out += '{';
      stack.push(!atRule);
      start = i + 1;
    } else if (ch === '}') {
      out += src.slice(start, i + 1);
      stack.pop();
      start = i + 1;
    } else if (ch === ';' && !inDeclarations) {
      out += src.slice(start, i + 1);
      start = i + 1;
    }
  }
  return out + src.slice(start);
}

function rewriteSelector(selector: string): string {
  return selector.replace(/(^|[\s,>+~(])(html|body)(?![\w-])/g, `$1.${DOC_BODY_CLASS}`);
}
