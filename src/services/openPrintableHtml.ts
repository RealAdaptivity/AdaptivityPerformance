/**
 * Print a generated HTML document — receipts, quotes, earnings, the contractor
 * agreement — without a pop-up.
 *
 * This used to call window.open() on a blob: URL. That failed three ways:
 *
 *   1. Pop-up blockers. Worse, callers that save first and print afterwards —
 *      "Save & print PDF" on a quote — run past an await, so the user-gesture
 *      context is gone by the time open() is reached and every modern browser
 *      refuses it. That path could never open anything.
 *   2. iOS Safari is unreliable about navigating a new tab to a blob: URL.
 *   3. Android Chrome blocks blob: in a new tab in some versions.
 *
 * A hidden same-document iframe has none of those problems: no pop-up to block,
 * no gesture requirement, and no blob: navigation. The document carries its own
 * load handler that calls print(), which inside an iframe prints the iframe.
 *
 * iOS is still the awkward one — some versions ignore a programmatic print from
 * an iframe — so the document also carries a visible "Print / Save as PDF"
 * button, and if the iframe route throws we fall back to a real tab the user
 * can print by hand.
 */

const PRINT_FRAME_ID = 'adaptivity-print-frame';

function removeExistingFrame() {
  document.getElementById(PRINT_FRAME_ID)?.remove();
}

/** Last resort: a real tab. Requires a gesture, so only used if the frame fails. */
function openInTab(html: string): boolean {
  try {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank');
    if (!w) {
      URL.revokeObjectURL(url);
      return false;
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return true;
  } catch {
    return false;
  }
}

export function openPrintableHtmlWindow(html: string, _opts?: { width?: number; height?: number }) {
  if (typeof document === 'undefined') return;

  removeExistingFrame();

  try {
    const frame = document.createElement('iframe');
    frame.id = PRINT_FRAME_ID;
    // Off-screen rather than display:none — a hidden frame is not guaranteed to
    // lay out, and an unlaid-out document prints blank.
    frame.setAttribute('aria-hidden', 'true');
    frame.style.position = 'fixed';
    frame.style.right = '0';
    frame.style.bottom = '0';
    frame.style.width = '1px';
    frame.style.height = '1px';
    frame.style.opacity = '0';
    frame.style.border = '0';
    frame.style.pointerEvents = 'none';

    frame.onload = () => {
      try {
        const win = frame.contentWindow;
        if (!win) throw new Error('no frame window');
        win.focus();
        win.print();
      } catch {
        // The document's own load handler may still have printed it; if not,
        // the tab fallback below is the user's way out.
        openInTab(html);
      }
    };

    document.body.appendChild(frame);
    frame.srcdoc = html;

    // The print dialog is modal, so this only runs once it is dismissed.
    window.setTimeout(removeExistingFrame, 120_000);
  } catch {
    if (!openInTab(html)) {
      throw new Error('Could not open the printable document — allow pop-ups and try again.');
    }
  }
}
