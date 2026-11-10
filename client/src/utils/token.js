/**
 * JWT Token Utilities for PrepPilot
 * Handles parsing, expiration detection, and secure session cleanup.
 */

export const isTokenExpired = (token, bufferSeconds = 10) => {
  if (!token || typeof token !== 'string') return true;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;

    // Decode Base64URL payload safely
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    const payload = JSON.parse(jsonPayload);
    if (!payload.exp) return false;

    const currentTimeMs = Date.now();
    const expirationTimeMs = payload.exp * 1000;
    const bufferMs = bufferSeconds * 1000;

    return currentTimeMs >= expirationTimeMs - bufferMs;
  } catch (err) {
    console.warn('[Token Utility] Error decoding JWT token:', err.message);
    return true;
  }
};

export const getValidToken = () => {
  const token = localStorage.getItem('token');
  if (!token) return null;

  if (isTokenExpired(token)) {
    clearAuthSession();
    return null;
  }

  return token;
};

export const clearAuthSession = () => {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('preppilot_') && !key.includes('auth_redirect')) {
        localStorage.removeItem(key);
      }
    });
  } catch (e) {
    console.warn('[Token Utility] Error clearing auth session:', e.message);
  }
};

