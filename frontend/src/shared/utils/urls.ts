/**
 * URL utilities for the application
 */

/**
 * Get the base URL of the application
 * Uses environment variables if available, or falls back to window.location
 */
export function getBaseUrl(): string {
  if (typeof window === 'undefined') {
    // Server-side - always use production domain for Open Graph
    return process.env.NEXT_PUBLIC_SITE_URL || 
           process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
           'https://www.ghostmonk.com';
  }
  
  // Client-side
  return window.location.origin;
}

/**
 * Generate the full URL for a story based on its slug
 */
export function getStoryUrl(slug: string): string {
  return `${getBaseUrl()}/stories/${slug}`;
}

/**
 * Generate the canonical URL for the current page
 */
export function getCanonicalUrl(path?: string): string {
  const base = getBaseUrl();
  
  if (!path) {
    return typeof window !== 'undefined' ? 
      `${base}${window.location.pathname}` : 
      base;
  }
  
  // Ensure path starts with a slash
  const formattedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${formattedPath}`;
}
