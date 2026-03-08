const WORDS_PER_MINUTE = 200;
const TAG_RE = /<[^>]+>/g;

export function estimateReadingTime(html: string): string {
  const text = html.replace(TAG_RE, ' ');
  const words = text.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
  return `${minutes} min read`;
}
