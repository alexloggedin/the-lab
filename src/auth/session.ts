// src/auth/session.ts

/**
 * Returns the Nextcloud CSRF token from window.OC.
 * 
 * Nextcloud injects window.OC into every page it serves.
 * The requestToken field is a per-session CSRF token required
 * on all state-changing requests (POST, DELETE, PUT).
 * 
 * Reference: https://docs.nextcloud.com/server/33/developer_manual/digging_deeper/csrf.html
 */
export const getRequestToken = (): string => {
  if (typeof window !== 'undefined' && (window as any).OC?.requestToken) {
    return (window as any).OC.requestToken;
  }
  // In mock/dev mode window.OC.requestToken is set to 'mock-token' in index.html
  return 'mock-token';
};

/**
 * Returns true if we have a valid Nextcloud session context.
 * In a real Nextcloud app, window.OC is always present.
 * In mock/dev mode (npm run dev), index.html sets a stub window.OC.
 */
export const hasSession = (): boolean => {
  return typeof window !== 'undefined' && !!(window as any).OC;
};

/**
 * Generate the URL for a Nextcloud route.
 * Falls back to the path itself in mock mode.
 * 
 * Reference: https://docs.nextcloud.com/server/33/developer_manual/client_apis/OCS/ocs-api-overview.html
 */
export const generateUrl = (path: string): string => {
  if (typeof window !== 'undefined' && (window as any).OC?.generateUrl) {
    return (window as any).OC.generateUrl(path);
  }
  return path;
};

export const REQUEST_TOKEN_HEADER = 'requesttoken';