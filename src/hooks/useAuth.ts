// src/hooks/useAuth.ts

import { useState, useEffect } from 'react';
import { hasSession } from '../auth/session';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface SimpleAuthState {
  authStatus: AuthStatus;
}

/**
 * In Nextcloud app context, auth is handled by the server session.
 * This hook just confirms that window.OC is present, which means
 * Nextcloud has loaded us inside an authenticated page.
 * 
 * There is no login flow, no credential storage, no polling.
 * If window.OC is missing, the user should not be on this page —
 * Nextcloud's own middleware will have redirected them to login already.
 */
export const useAuth = (): SimpleAuthState => {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    // Give the DOM a tick to ensure window.OC has been set
    // (it's injected synchronously, but this avoids SSR edge cases)
    const check = () => {
      console.log('[useAuth] checking for Nextcloud session...');
      if (hasSession()) {
        console.log('[useAuth] session found, OC.requestToken:', (window as any).OC?.requestToken);
        setAuthStatus('authenticated');
      } else {
        console.warn('[useAuth] no Nextcloud session (window.OC missing)');
        setAuthStatus('unauthenticated');
      }
    };
    check();
  }, []);

  return { authStatus };
};
