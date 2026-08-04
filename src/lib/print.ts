/**
 * Shared utilities for safe HTML escaping and print-window document building.
 *
 * WHY: Audit finding C1 (frontend) — `window.document.write` with unescaped
 * user-controlled strings (order notes, product names, customer phone) is a
 * stored DOM-XSS vector. Every printer must escape interpolations.
 */

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

/**
 * Escape a string for safe interpolation into HTML text content or
 * quoted attribute values. Returns empty string for null/undefined.
 */
export function escapeHtml(value: unknown): string {
  if (value == null) return ''
  return String(value).replace(/[&<>"']/g, (ch) => HTML_ESCAPE_MAP[ch] ?? ch)
}

/**
 * Build a self-contained HTML document string for a print window using
 * only escaped text. Use this instead of `document.write` with template
 * literals containing raw user input.
 *
 * The `bodyHtml` is expected to be built with `escapeHtml` for every
 * dynamic value. This helper only provides the document shell + styles.
 */
export function buildPrintDocument(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Noto Sans Thai', 'Segoe UI', sans-serif; margin: 0; padding: 16px; color: #1a1a1a; }
  .receipt { max-width: 320px; margin: 0 auto; }
  .center { text-align: center; }
  .right { text-align: right; }
  .muted { color: #666; font-size: 12px; }
  .row { display: flex; justify-content: space-between; gap: 8px; padding: 2px 0; font-size: 13px; }
  .divider { border-top: 1px dashed #999; margin: 8px 0; }
  .total { font-weight: 700; font-size: 16px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; background: #f0f0f0; font-size: 11px; }
  h1 { font-size: 18px; margin: 4px 0; }
  h2 { font-size: 14px; margin: 8px 0 4px; }
  ul { padding-left: 18px; margin: 4px 0; font-size: 12px; }
  .footer-note { margin-top: 12px; font-size: 11px; color: #888; text-align: center; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
<div class="receipt">${bodyHtml}</div>
</body>
</html>`
}

/**
 * Open a print window safely. Closes the document after writing and
 * triggers print after a short delay for styles to apply.
 */
export function openPrintWindow(title: string, bodyHtml: string): void {
  const w = window.open('', '_blank', 'width=400,height=600')
  if (!w) {
    alert('โปรดอนุญาตป๊อปอัพเพื่อพิมพ์')
    return
  }
  w.document.open()
  w.document.write(buildPrintDocument(title, bodyHtml))
  w.document.close()
  // Give the browser a tick to lay out before printing.
  setTimeout(() => {
    w.focus()
    w.print()
  }, 250)
}
