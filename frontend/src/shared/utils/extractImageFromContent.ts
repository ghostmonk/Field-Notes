/**
 * Extracts the first image URL from HTML content
 * Used for Open Graph image meta tags for social media link previews
 * 
 * Uses a robust regex approach that handles most real-world cases
 * while remaining lightweight with zero dependencies.
 */

const DEFAULT_OG_IMAGE = '/og-default.svg'; // Fallback Open Graph image

export async function extractImageFromContent(htmlContent: string): Promise<string | null> {
  if (!htmlContent) return null;
  
  try {
    const imageSrc = await extractImageFromContentServer(htmlContent);
    
    if (imageSrc) {
      // If it's a relative URL, make it absolute
      if (imageSrc.startsWith('/')) {
        // In production, you might want to use your actual domain
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ghostmonk.com';
        return `${baseUrl}${imageSrc}`;
      }
      
      // If it's already an absolute URL (like GCS URLs), return as-is
      return imageSrc;
    }
  } catch (error) {
    console.error('Error parsing HTML for image extraction:', error);
  }
  
  return null;
}

/**
 * Server-side version that extracts image URL using cheerio
 * This is specifically for use in getServerSideProps where cheerio is available
 */
export async function extractImageFromContentServer(htmlContent: string): Promise<string | null> {
  if (!htmlContent) return null;
  
  try {
    const cheerio = await import('cheerio');
    const $ = cheerio.load(htmlContent);
    const firstImg = $('img').first();
    
    if (firstImg.length > 0) {
      const src = firstImg.attr('src');
      return src ? src.trim() : null;
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing HTML for image extraction:', error);
    return null;
  }
}

/**
 * Get fallback Open Graph image URL
 * This can be customized based on your needs
 */
export function getDefaultOGImage(): string {
  return DEFAULT_OG_IMAGE;
}
