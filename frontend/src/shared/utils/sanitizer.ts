import DOMPurify from 'dompurify';

// Track whether DOMPurify has been configured
let isConfigured = false;

/**
 * Configure DOMPurify to allow specific attributes needed for image responsive design
 * This should be called once during app initialization
 */
export const configureDOMPurify = () => {
  if (typeof window !== 'undefined' && !isConfigured) {
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
      if (node.nodeName === 'IMG') {
        if (node.hasAttribute('srcset')) {
          node.setAttribute('srcset', node.getAttribute('srcset') || '');
        }
        
        if (node.hasAttribute('sizes')) {
          node.setAttribute('sizes', node.getAttribute('sizes') || '');
        }
        
        node.setAttribute('loading', 'lazy');
      }
    });
    
    // Mark as configured to avoid duplicate configuration
    isConfigured = true;
  }
};

/**
 * Sanitizes HTML content with responsive image attributes preserved
 * Handles both client-side and server-side rendering
 */
export const sanitizeHtml = (html: string): string => {
  // Check if we're running on the client where DOMPurify is available
  if (typeof window !== 'undefined') {
    // Ensure DOMPurify is configured (just in case)
    if (!isConfigured) {
      configureDOMPurify();
    }
    
    return DOMPurify.sanitize(html, {
      ADD_ATTR: ['srcset', 'sizes', 'loading', 'width', 'height'],
    });
  }
  
  // On the server, return the HTML as-is or with minimal sanitization
  // You can implement a server-side sanitizer if needed
  return html;
};
