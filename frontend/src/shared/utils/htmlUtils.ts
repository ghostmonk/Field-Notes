/**
 * Strips empty <p> tags from the start and end of HTML content.
 * TipTap inserts these as artifacts around block-level nodes like <video>.
 * Handles variants: <p></p>, <p> </p>, <p>&nbsp;</p>, <p class="..."></p>
 */
export function stripEmptyParagraphs(html: string): string {
  const emptyP = /\s*<p[^>]*>(\s|&nbsp;)*<\/p>\s*/i;
  const leadingEmpty = new RegExp(`^(${emptyP.source})+`, 'i');
  const trailingEmpty = new RegExp(`(${emptyP.source})+$`, 'i');
  return html.replace(leadingEmpty, '').replace(trailingEmpty, '');
}

export function escapeHtmlAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
