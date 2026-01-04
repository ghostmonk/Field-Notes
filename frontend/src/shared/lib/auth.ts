/**
 * Authentication utilities
 */
import { jwtDecode } from 'jwt-decode';

interface TokenPayload {
  exp: number;
  sub: string;
  email?: string;
  [key: string]: unknown;
}

/**
 * Check if a JWT token is expired
 */
export function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwtDecode<TokenPayload>(token);
    const currentTime = Math.floor(Date.now() / 1000);
    
    return decoded.exp < currentTime;
  } catch (error) {
    console.error('Error decoding JWT token:', error);
    return true; // Treat invalid tokens as expired
  }
}

/**
 * Get user info from token
 */
export function getUserFromToken(token: string): { id: string; email?: string } | null {
  try {
    const decoded = jwtDecode<TokenPayload>(token);
    
    return {
      id: decoded.sub,
      email: decoded.email,
    };
  } catch (error) {
    console.error('Error decoding user from token:', error);
    return null;
  }
}

/**
 * Calculate time until token expiration in seconds
 */
export function getTokenExpiryTime(token: string): number {
  try {
    const decoded = jwtDecode<TokenPayload>(token);
    const currentTime = Math.floor(Date.now() / 1000);
    
    return Math.max(0, decoded.exp - currentTime);
  } catch (error) {
    console.error('Error calculating token expiry time:', error);
    return 0;
  }
}

/**
 * Handle common auth errors
 * @deprecated Use ErrorService.handleAuthError() instead
 */
export function handleAuthError(error: { status?: number; message?: string }): string {
  // Common auth error messages
  if (error?.status === 401) {
    return 'Your session has expired. Please log in again.';
  }
  
  if (error?.status === 403) {
    return 'You do not have permission to perform this action.';
  }
  
  return error?.message || 'Authentication error';
} 