import { useEffect, useRef, useCallback } from 'react';

interface TurnstileWidgetProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
}

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

export function TurnstileWidget({ siteKey, onVerify, onExpire, onError }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile || widgetIdRef.current) return;

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: onVerify,
      'expired-callback': onExpire,
      'error-callback': onError,
      theme: 'auto',
    });
  }, [siteKey, onVerify, onExpire, onError]);

  useEffect(() => {
    if (window.turnstile) {
      renderWidget();
      return;
    }

    const existingScript = document.querySelector(
      'script[src*="challenges.cloudflare.com/turnstile"]'
    );

    if (!existingScript) {
      window.onTurnstileLoad = renderWidget;
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad';
      script.async = true;
      document.head.appendChild(script);
    } else {
      const checkReady = setInterval(() => {
        if (window.turnstile) {
          clearInterval(checkReady);
          renderWidget();
        }
      }, 100);
      return () => clearInterval(checkReady);
    }
  }, [renderWidget]);

  useEffect(() => {
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
      window.onTurnstileLoad = undefined;
    };
  }, []);

  return <div ref={containerRef} data-testid="turnstile-widget" />;
}
