import { useEffect, RefObject } from 'react';
import { useRouter } from 'next/router';
import mediumZoom, { Zoom } from 'medium-zoom';

export function useImageZoom(
  containerRef: RefObject<HTMLElement | null>,
  enabled: boolean = true
) {
  const pathname = useRouter().asPath;

  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const container = containerRef.current;

    // Create zoom instance, then attach to current images
    const zoom: Zoom = mediumZoom([], {
      margin: 24,
      background: 'var(--color-bg-overlay, rgba(0, 0, 0, 0.85))',
    });

    const attachImages = () => {
      const images = container.querySelectorAll('img:not([data-zoom-disabled])');
      zoom.detach();
      zoom.attach(images as unknown as HTMLElement[]);
    };

    // Attach to initial images
    attachImages();

    // Re-attach when DOM changes (async-loaded content)
    const observer = new MutationObserver(attachImages);
    observer.observe(container, { childList: true, subtree: true });

    let currentScale = 1;
    let translateX = 0;
    let translateY = 0;
    let zoomedImage: HTMLElement | null = null;

    const applyTransform = () => {
      if (zoomedImage) {
        zoomedImage.style.transform = `translate(${translateX}px, ${translateY}px) scale(${currentScale})`;
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (!zoomedImage) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      currentScale = Math.min(3, Math.max(1, currentScale + delta));
      applyTransform();
    };

    let lastTouchDistance = 0;

    const handleTouchMove = (e: TouchEvent) => {
      if (!zoomedImage || e.touches.length < 2) return;
      e.preventDefault();
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (lastTouchDistance > 0) {
        const delta = (distance - lastTouchDistance) * 0.005;
        currentScale = Math.min(3, Math.max(1, currentScale + delta));
        applyTransform();
      }
      lastTouchDistance = distance;
    };

    const handleTouchEnd = () => {
      lastTouchDistance = 0;
    };

    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;

    const handleMouseDown = (e: MouseEvent) => {
      if (!zoomedImage || currentScale <= 1) return;
      isDragging = true;
      dragStartX = e.clientX - translateX;
      dragStartY = e.clientY - translateY;
      e.preventDefault();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !zoomedImage) return;
      translateX = e.clientX - dragStartX;
      translateY = e.clientY - dragStartY;
      applyTransform();
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    zoom.on('open', () => {
      const overlay = document.querySelector(
        '.medium-zoom-image--opened'
      ) as HTMLElement;
      zoomedImage = overlay;
      currentScale = 1;
      translateX = 0;
      translateY = 0;

      document.addEventListener('wheel', handleWheel, { passive: false });
      document.addEventListener('touchmove', handleTouchMove, {
        passive: false,
      });
      document.addEventListener('touchend', handleTouchEnd);
      document.addEventListener('mousedown', handleMouseDown);
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    });

    zoom.on('close', () => {
      zoomedImage = null;
      currentScale = 1;
      translateX = 0;
      translateY = 0;

      document.removeEventListener('wheel', handleWheel);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    });

    return () => {
      observer.disconnect();
      zoom.detach();
    };
  }, [containerRef, enabled, pathname]);
}
