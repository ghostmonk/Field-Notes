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

/**
 * Extract access token from NextAuth JWT cookie or Authorization header.
 *
 * Proxy routes need a bearer token to forward to the backend. Two sources:
 * 1. NextAuth JWT cookie (set after successful auth callback)
 * 2. Authorization header from the client (always present when apiClient sends a token)
 *
 * In dev auth mode the JWT cookie may not be set on the first request,
 * so the Authorization header fallback is essential.
 */
export async function getAccessToken(req: { headers: Record<string, string | string[] | undefined> }): Promise<string | undefined> {
  // Try Authorization header first — it's always set by apiClient when the
  // client has a token, and avoids the async getToken() call entirely.
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  // Fall back to NextAuth JWT cookie
  const { getToken } = await import('next-auth/jwt');
  const token = await getToken({ req: req as any });
  if (token?.accessToken) return token.accessToken as string;
  return undefined;
}
