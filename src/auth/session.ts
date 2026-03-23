/**
 * Returns true if we have a valid Nextcloud session context.
 * In a real Nextcloud app, window.OC is always present.
 * In mock/dev mode (npm run dev), index.html sets a stub window.OC.
 */
export const hasSession = (): boolean => {
  return typeof window !== 'undefined' && !!(window as any).OC;
};