/**
 * Strips empty <p> tags from the start and end of HTML content.
 * TipTap inserts these as artifacts around block-level nodes like <video>.
 * Handles variants: <p></p>, <p> </p>, <p>&nbsp;</p>, <p class="..."></p>
 */
const LEADING_EMPTY_P = /^(\s*<p[^>]*>(\s|&nbsp;)*<\/p>\s*)+/i;
const TRAILING_EMPTY_P = /(\s*<p[^>]*>(\s|&nbsp;)*<\/p>\s*)+$/i;

export function stripEmptyParagraphs(html: string): string {
  return html.replace(LEADING_EMPTY_P, '').replace(TRAILING_EMPTY_P, '');
}

export function escapeHtmlAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
