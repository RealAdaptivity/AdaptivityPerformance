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
 */

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

/** The document, full screen, with a close button. Its own "Print / Save as
 *  PDF" button is visible here, which is the whole point. */
function showOverlay(html: string) {
  removeExisting();

  const overlay = document.createElement('div');
  overlay.id = PRINT_OVERLAY_ID;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Printable document');
  overlay.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:2147483647',
    'background:#0b0c10', 'display:flex', 'flex-direction:column',
  ].join(';');

  const bar = document.createElement('div');
  bar.style.cssText = [
    'display:flex', 'align-items:center', 'justify-content:space-between',
    'gap:12px', 'padding:12px 16px', 'background:#12141c',
    'border-bottom:1px solid rgba(255,255,255,0.1)', 'flex:0 0 auto',
  ].join(';');

  const hint = document.createElement('span');
  hint.textContent = 'Use the Print / Save as PDF button below';
  hint.style.cssText = 'color:#cbd5e1;font:600 12px system-ui,sans-serif';

  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = 'Close';
  close.style.cssText = [
    'appearance:none', 'border:1px solid rgba(255,255,255,0.2)', 'border-radius:10px',
    'background:#1e2230', 'color:#fff', 'font:700 12px system-ui,sans-serif',
    'padding:8px 16px', 'cursor:pointer',
  ].join(';');
  close.onclick = removeExisting;

  bar.append(hint, close);

  const frame = document.createElement('iframe');
  frame.title = 'Printable document';
  frame.style.cssText = 'flex:1 1 auto;width:100%;border:0;background:#fff';
  // Before append, so the about:blank load never happens.
  frame.srcdoc = html;

  overlay.append(bar, frame);
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
