// src/hooks/useAuth.ts
import { useState, useEffect, useCallback } from 'react';
import type { AuthState, Credentials } from '../types';
import {
  saveCredentials,
  getCredentials,
  clearCredentials,
  hasStoredCredentials,
  needsRotation,
  touchActivity,
} from '../auth/authStore';
import { initiateLoginFlow, pollForCredentials } from '../auth/loginFlow';

export const useAuth = (): AuthState => {
  const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [loginState, setLoginState] = useState<'idle' | 'polling' | 'error'>('idle');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginUrl, setLoginUrl] = useState<string | null>(null);
  const [rotationDue, setRotationDue] = useState<boolean>(false);

  useEffect(() => {
    if (!hasStoredCredentials()) {
      setAuthStatus('unauthenticated');
      return;
    }
    getCredentials().then(creds => {
      if (creds) {
        setCredentials(creds);
        setAuthStatus('authenticated');
        touchActivity();
        setRotationDue(needsRotation());
      } else {
        setAuthStatus('unauthenticated');
      }
    });
  }, []);

  const startLogin = useCallback(async (serverUrl: string): Promise<void> => {
    setLoginState('polling');
    setLoginError(null);

    let flowData;
    try {
      flowData = await initiateLoginFlow(serverUrl.trim());
    } catch (err) {
      setLoginState('error');
      setLoginError(err instanceof Error ? err.message : 'Unknown error');
      return;
    }

    setLoginUrl(flowData.login);

    const { token: pollToken, endpoint: pollEndpoint } = flowData.poll;
    let pollCount = 0;
    const MAX_POLLS = 100;

    const poll = async (): Promise<void> => {
      if (pollCount++ > MAX_POLLS) {
        setLoginState('error');
        setLoginError('Login timed out. Please try again.');
        return;
      }
      try {
        const creds = await pollForCredentials(pollEndpoint, pollToken);
        if (creds) {
          await saveCredentials({ ...creds, serverUrl: serverUrl.trim() });
          setCredentials(creds);
          setAuthStatus('authenticated');
          setLoginState('idle');
          setLoginUrl(null);
          touchActivity();
        } else {
          setTimeout(poll, 3000);
        }
      } catch (err) {
        setLoginState('error');
        setLoginError(err instanceof Error ? `Authentication failed: ${err.message}` : 'Authentication failed');
      }
    };

    poll();
  }, []);

  const logout = useCallback((): void => {
    clearCredentials();
    setCredentials(null);
    setAuthStatus('unauthenticated');
    setLoginState('idle');
    setLoginError(null);
    setLoginUrl(null);
    setRotationDue(false);
  }, []);

  return { authStatus, credentials, startLogin, logout, loginState, loginError, loginUrl, rotationDue };
};