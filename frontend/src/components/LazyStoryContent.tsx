import React, { useMemo, useState, useEffect } from 'react';

interface LazyStoryContentProps {
  content: string;
  className?: string;
  'data-testid'?: string;
}

/**
 * Component that renders story content with lazy-loaded images
 * Uses a suppressHydrationWarning approach to avoid attribute order mismatches
 * This is a workaround for Next.js's hydration issues with HTML attributes
 */
export const LazyStoryContent: React.FC<LazyStoryContentProps> = ({
  content,
  className = '',
  'data-testid': testId
}) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Add image load event listeners after content is rendered
  useEffect(() => {
    if (!isClient) return;

    const handleImageLoad = (img: HTMLImageElement) => {
      img.setAttribute('data-loaded', 'true');
    };

    const handleImageError = (img: HTMLImageElement) => {
      img.setAttribute('data-loaded', 'true'); // Remove shimmer even on error
    };

    // Find all images in the content and add load listeners
    const images = document.querySelectorAll('.prose--card img:not([data-loaded])');
    
    images.forEach((img) => {
      const imageElement = img as HTMLImageElement;
      
      // If image is already loaded (cached), mark it immediately
      if (imageElement.complete && imageElement.naturalWidth > 0) {
        handleImageLoad(imageElement);
      } else {
        // Add event listeners for load/error
        const onLoad = () => {
          handleImageLoad(imageElement);
          imageElement.removeEventListener('load', onLoad);
          imageElement.removeEventListener('error', onError);
        };
        
        const onError = () => {
          handleImageError(imageElement);
          imageElement.removeEventListener('load', onLoad);
          imageElement.removeEventListener('error', onError);
        };
        
        imageElement.addEventListener('load', onLoad);
        imageElement.addEventListener('error', onError);
      }
    });

    // Cleanup function
    return () => {
      images.forEach((img) => {
        const imageElement = img as HTMLImageElement;
        imageElement.removeEventListener('load', () => {});
        imageElement.removeEventListener('error', () => {});
      });
    };
  }, [isClient, content]);

  const serverContent = content;
  const clientContent = useMemo(() => {
    if (!isClient) return content;
    
    return content.replace(
      /<img([^>]*?)>/gi,
      (match) => {
        // Add loading attributes if not present
        let updatedMatch = match;
        if (!match.includes('loading=')) {
          updatedMatch = updatedMatch.replace('>', ' loading="lazy" decoding="async">');
        }
        
        // All images now have width and height attributes - add aspect ratio
        const widthMatch = updatedMatch.match(/width=["|'](\d+)["|']/);
        const heightMatch = updatedMatch.match(/height=["|'](\d+)["|']/);
        
        if (widthMatch && heightMatch) {
          const width = parseInt(widthMatch[1]);
          const height = parseInt(heightMatch[1]);
          const aspectRatio = width / height;
          
          // Add aspect-ratio style if not already present
          if (!updatedMatch.includes('aspect-ratio')) {
            const styleMatch = updatedMatch.match(/style=["|']([^"']*)["|']/);
            if (styleMatch) {
              // Add to existing style
              const existingStyle = styleMatch[1];
              const newStyle = `${existingStyle}${existingStyle.endsWith(';') ? ' ' : '; '}aspect-ratio: ${aspectRatio};`;
              updatedMatch = updatedMatch.replace(styleMatch[0], `style="${newStyle}"`);
            } else {
              // Add new style attribute
              updatedMatch = updatedMatch.replace('>', ` style="aspect-ratio: ${aspectRatio};">`);
            }
          }
        }
        
        return updatedMatch;
      }
    );
  }, [content, isClient]);

  if (!isClient) {
    return (
      <div
        className={className}
        dangerouslySetInnerHTML={{ __html: serverContent }}
        data-testid={testId}
      />
    );
  }

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: clientContent }}
      suppressHydrationWarning={true}
      data-testid={testId}
    />
  );
};

export default LazyStoryContent;
