/**
 * Strips empty <p></p> tags from the start and end of HTML content.
 * TipTap inserts these as artifacts around block-level nodes like <video>.
 */
export function stripEmptyParagraphs(html: string): string {
  return html
    .replace(/^(\s*<p>\s*<\/p>\s*)+/i, '')
    .replace(/(\s*<p>\s*<\/p>\s*)+$/i, '');
}

export function escapeHtmlAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
