import { useState, useEffect } from 'react';

export function NetworkStatus() {
  const [isOffline, setIsOffline] = useState(
    () => typeof navigator !== 'undefined' && !navigator.onLine
  );

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);

    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[60] text-center py-2 text-sm font-medium text-white bg-red-600"
      role="alert"
      data-testid="network-status-offline"
    >
      You are offline. Some features may be unavailable.
    </div>
  );
}
