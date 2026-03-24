// src/hooks/useAuth.ts

import { useState, useEffect } from 'react';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface SimpleAuthState {
  authStatus: AuthStatus;
}

export const useAuth = (): SimpleAuthState => {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');

  useEffect(() => {

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


export const hasSession = (): boolean => {
  return typeof window !== 'undefined' && !!(window as any).OC;
};