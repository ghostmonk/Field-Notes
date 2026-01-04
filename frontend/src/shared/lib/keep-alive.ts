/**
 * Keep-alive service to prevent backend cold starts
 */

const KEEP_ALIVE_INTERVAL = 4 * 60 * 1000; // 4 minutes
const WARMUP_TIMEOUT = 10000; // 10 seconds

interface KeepAliveService {
  start: () => void;
  stop: () => void;
  warmup: () => Promise<boolean>;
}

class BackendKeepAlive implements KeepAliveService {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  async warmup(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), WARMUP_TIMEOUT);

      const response = await fetch('/api/warmup', {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Backend warmup successful:', data);
        return data.status === 'warm';
      }
      
      console.warn('Backend warmup failed:', response.status);
      return false;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('Backend warmup timeout');
      } else {
        console.error('Backend warmup error:', error);
      }
      return false;
    }
  }

  private async ping(): Promise<void> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('/api/health', {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      
      if (response.ok) {
        console.log('Backend keep-alive ping successful');
      } else {
        console.warn('Backend keep-alive ping failed:', response.status);
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Backend keep-alive ping error:', error);
      }
    }
  }

  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.intervalId = setInterval(() => {
      this.ping();
    }, KEEP_ALIVE_INTERVAL);

    console.log('Backend keep-alive service started');
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('Backend keep-alive service stopped');
  }
}

export const keepAliveService = new BackendKeepAlive();
export default keepAliveService;
