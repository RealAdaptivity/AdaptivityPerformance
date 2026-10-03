/**
 * Show a generated HTML document — receipts, quotes, earnings, the contractor
 * agreement — so the customer can print it or save it as a PDF.
 *
 * History, because both of the previous attempts failed in ways worth not
 * repeating:
 *
 *   1. window.open() on a blob: URL. Pop-up blockers killed it, callers that
 *      save first and print after lost the user-gesture context, and iOS and
 *      some Android versions refuse blob: navigation in a new tab.
 *   2. A hidden 1px iframe that printed itself. Two bugs, both live:
 *
 *      - Appending the frame and *then* setting srcdoc fires `load` twice:
 *        once for the about:blank the browser puts in an unset frame, once for
 *        the real document. print() ran on the first, so the customer got a
 *        print dialog for a blank page. Measured in Chromium: two loads, body
 *        length 0 then 24. srcdoc is set before the frame is appended now, and
 *        printing is gated on the document actually having a body.
 *      - The fallback for iOS, where a programmatic print from an iframe is
 *        ignored, was a "Print / Save as PDF" button inside that document —
 *        inside a frame 1px wide at opacity 0. It could never be seen or
 *        tapped. That is why nothing at all happened on an iPhone.
 *
 * So: desktop and Android get the silent frame and an immediate print dialog.
 * iOS, and anything where the print call throws, get the same document shown
 * full-screen with its own button, which is a thing a person can actually use.
 *
 * 3. That full-screen view was itself an iframe, and on iOS a print started
 *    inside an iframe prints the page around it. The saved PDF was the admin
 *    screen with the document floating over it. It is drawn on the page now
 *    (see showOverlay).
 */

import { DOC_BODY_CLASS, scopeDocumentCss } from './printScope';

const PRINT_FRAME_ID = 'adaptivity-print-frame';
const PRINT_OVERLAY_ID = 'adaptivity-print-overlay';

function removeExisting() {
  document.getElementById(PRINT_FRAME_ID)?.remove();
  document.getElementById(PRINT_OVERLAY_ID)?.remove();
}

/** iOS ignores print() called from an iframe, so it never gets the silent path.
 *  iPadOS reports itself as a Mac, hence the touch check. */
function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return /Macintosh/.test(ua) && typeof document !== 'undefined' && 'ontouchend' in document;
}

/** Print rules for the app's own page while a document is shown on iOS:
 *  everything but the document is hidden, and the document flows onto as
 *  many pages as it needs. */
const PRINT_ONLY_DOCUMENT_CSS = `
@media print {
  html, body { background: #fff !important; height: auto !important; overflow: visible !important; }
  body > *:not(#${PRINT_OVERLAY_ID}) { display: none !important; }
  #${PRINT_OVERLAY_ID} { position: static !important; display: block !important; background: #fff !important; overflow: visible !important; }
  #${PRINT_OVERLAY_ID} .adaptivity-print-bar { display: none !important; }
  #${PRINT_OVERLAY_ID} .adaptivity-print-scroll { overflow: visible !important; height: auto !important; }
}`;

/**
 * The document, full screen, with Print and Close buttons.
 *
 * It is drawn into the app's own page, not an iframe. On iOS a print started
 * from inside an iframe prints the page around it instead: the saved PDF was
 * the admin screen with the quote floating over it, the quote list behind it
 * and a black page for the overlay. With the document on the page itself and
 * print rules that hide everything else, the PDF is the document alone.
 *
 * A shadow root keeps the document's CSS (it styles `body`, `h1`, `table`)
 * from restyling the app behind it, and the app's from reaching the document.
 */
function showOverlay(html: string) {
  removeExisting();

  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const css = [...parsed.querySelectorAll('style')].map((s) => s.textContent ?? '').join('\n');

  const overlay = document.createElement('div');
  overlay.id = PRINT_OVERLAY_ID;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', parsed.title || 'Printable document');
  overlay.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:2147483647',
    'background:#0b0c10', 'display:flex', 'flex-direction:column',
  ].join(';');

  const printCss = document.createElement('style');
  printCss.textContent = PRINT_ONLY_DOCUMENT_CSS;

  const bar = document.createElement('div');
  bar.className = 'adaptivity-print-bar';
  bar.style.cssText = [
    'display:flex', 'align-items:center', 'justify-content:space-between',
    'gap:12px', 'padding:12px 16px', 'background:#12141c',
    'border-bottom:1px solid rgba(255,255,255,0.1)', 'flex:0 0 auto',
  ].join(';');

  const buttonCss = [
    'appearance:none', 'border-radius:10px', 'font:700 14px system-ui,sans-serif',
    'padding:10px 16px', 'cursor:pointer', 'min-height:44px',
  ];
  const print = document.createElement('button');
  print.type = 'button';
  print.textContent = 'Print / Save as PDF';
  print.style.cssText = [...buttonCss, 'border:0', 'background:#fd6a02', 'color:#0b0c10'].join(';');
  print.onclick = () => window.print();

  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = 'Close';
  close.style.cssText = [...buttonCss, 'border:1px solid rgba(255,255,255,0.2)', 'background:#1e2230', 'color:#fff'].join(';');
  close.onclick = removeExisting;

  bar.append(print, close);

  const scroll = document.createElement('div');
  scroll.className = 'adaptivity-print-scroll';
  scroll.style.cssText = 'flex:1 1 auto;overflow:auto;-webkit-overflow-scrolling:touch;background:#fff';

  const host = document.createElement('div');
  const root = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  // Inherited properties (color, font) still cross into a shadow root, and the
  // app's are light text for a dark page. Start the document from defaults.
  style.textContent = `:host{all:initial;display:block}\n${scopeDocumentCss(css)}`;
  const body = document.createElement('div');
  body.className = DOC_BODY_CLASS;
  body.innerHTML = parsed.body.innerHTML;
  // Scripts never run from innerHTML; the documents' own print buttons use an
  // inline onclick, so give them a real handler.
  body.querySelectorAll('script').forEach((el) => el.remove());
  body.querySelectorAll<HTMLElement>('[onclick]').forEach((el) => {
    const printsPage = /print\(\)/.test(el.getAttribute('onclick') ?? '');
    el.removeAttribute('onclick');
    if (printsPage) el.addEventListener('click', () => window.print());
  });
  root.append(style, body);

  scroll.append(host);
  overlay.append(printCss, bar, scroll);
  document.body.appendChild(overlay);
}

export function openPrintableHtmlWindow(html: string, _opts?: { width?: number; height?: number }) {
  if (typeof document === 'undefined') return;

  if (isIos()) {
    showOverlay(html);
    return;
  }

  removeExisting();

  try {
    const frame = document.createElement('iframe');
    frame.id = PRINT_FRAME_ID;
    frame.setAttribute('aria-hidden', 'true');
    // Off-screen rather than display:none — an unlaid-out document prints blank.
    frame.style.cssText = [
      'position:fixed', 'right:0', 'bottom:0', 'width:1px', 'height:1px',
      'opacity:0', 'border:0', 'pointer-events:none',
    ].join(';');

    let printed = false;
    frame.onload = () => {
      // Guards against the about:blank load and against printing twice. The
      // ordering below should mean only one load reaches here, but a frame
      // that prints a blank page is bad enough to check for twice.
      if (printed) return;
      try {
        const win = frame.contentWindow;
        const body = win?.document?.body;
        if (!win || !body || !body.innerHTML.trim()) return;
        printed = true;
        win.focus();
        win.print();
      } catch {
        // print() refused. Show the document so the customer can print it
        // themselves rather than being left with nothing.
        showOverlay(html);
      }
    };

    // srcdoc first: appending an iframe with no src loads about:blank and
    // fires load for it, which is what used to print the blank page.
    frame.srcdoc = html;
    document.body.appendChild(frame);

    // The print dialog is modal, so this only runs once it is dismissed.
    window.setTimeout(() => document.getElementById(PRINT_FRAME_ID)?.remove(), 120_000);
  } catch {
    showOverlay(html);
  }
}
