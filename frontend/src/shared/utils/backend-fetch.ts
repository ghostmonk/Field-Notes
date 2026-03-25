const TIMEOUT_MS = 10000;

export function getBackendUrl(): string {
  const url = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;
  if (!url) {
    throw new Error(
      'Backend URL not configured: set BACKEND_URL or NEXT_PUBLIC_API_URL'
    );
  }
  return url;
}

export async function fetchBackend(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const url = `${getBackendUrl()}${path}`;
  return fetch(url, {
    ...init,
    signal: init?.signal ?? AbortSignal.timeout(TIMEOUT_MS),
  });
}

export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^A-Za-z0-9._\-]/g, '_');
}
