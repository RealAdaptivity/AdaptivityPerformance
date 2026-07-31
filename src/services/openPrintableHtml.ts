/** Open printable HTML in a new tab via Blob URL (avoids blank pages from noopener + document.write). */
export function openPrintableHtmlWindow(html: string, opts?: { width?: number; height?: number }) {
  const width = opts?.width ?? 780;
  const height = opts?.height ?? 960;
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank', `noopener,noreferrer,width=${width},height=${height}`);
  if (!w) {
    URL.revokeObjectURL(url);
    throw new Error('Pop-up blocked — allow pop-ups to print/save as PDF.');
  }
  // Revoke after the tab has had time to load the blob
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
