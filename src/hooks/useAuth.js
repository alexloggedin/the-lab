// src/hooks/useAuth.js
import { useState, useEffect, useCallback } from 'react';
import {
  saveCredentials,
  getCredentials,
  clearCredentials,
  hasStoredCredentials,
  needsRotation,
  touchActivity,
} from '../auth/authStore.js';
import { initiateLoginFlow, pollForCredentials } from '../auth/loginFlow.js';

/**
 * Custom hook managing the full authentication lifecycle.
 *
 * Returns:
 *   authStatus   - 'loading' | 'authenticated' | 'unauthenticated'
 *   credentials  - decrypted { serverUrl, username, appPassword } or null
 *   startLogin   - async fn(serverUrl): begins Login Flow V2
 *   logout       - fn(): clears credentials, returns to login page
 *   loginState   - 'idle' | 'polling' | 'error'
 *   loginError   - string | null
 *   loginUrl     - string | null (Nextcloud login URL to open in a new tab)
 *   rotationDue  - boolean: true when appPassword is >30 days old
 */
export const useAuth = () => {
  // 'loading' while we check and decrypt stored credentials
  const [authStatus,   setAuthStatus]   = useState('loading');
  const [credentials,  setCredentials]  = useState(null);
  const [loginState,   setLoginState]   = useState('idle');
  const [loginError,   setLoginError]   = useState(null);
  const [loginUrl,     setLoginUrl]     = useState(null);
  const [rotationDue,  setRotationDue]  = useState(false);

  // On mount: try to load existing credentials from localStorage
  useEffect(() => {
    // Fast synchronous check — avoids a flash of the login page
    if (!hasStoredCredentials()) {
      setAuthStatus('unauthenticated');
      return;
    }

    // Slow async check — actually decrypts and validates
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

  const startLogin = useCallback(async (serverUrl) => {
    setLoginState('polling');
    setLoginError(null);

    let flowData;
    try {
      flowData = await initiateLoginFlow(serverUrl.trim());
    } catch (err) {
      setLoginState('error');
      setLoginError(err.message);
      return;
    }

    setLoginUrl(flowData.login);

    const { token: pollToken, endpoint: pollEndpoint } = flowData.poll;
    let pollCount = 0;
    const MAX_POLLS = 100; // ~5 minutes at 3s intervals

    const poll = async () => {
      if (pollCount++ > MAX_POLLS) {
        setLoginState('error');
        setLoginError('Login timed out. Please try again.');
        return;
      }

      try {
        const creds = await pollForCredentials(pollEndpoint, pollToken);
        if (creds) {
          await saveCredentials(creds);
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
        setLoginError(`Authentication failed: ${err.message}`);
      }
    };

    poll();
  }, []);

  const logout = useCallback(() => {
    clearCredentials();
    setCredentials(null);
    setAuthStatus('unauthenticated');
    setLoginState('idle');
    setLoginError(null);
    setLoginUrl(null);
    setRotationDue(false);
  }, []);

  return {
    authStatus,
    credentials,
    startLogin,
    logout,
    loginState,
    loginError,
    loginUrl,
    rotationDue,
  };
};