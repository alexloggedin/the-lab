// src/auth/authStore.js
// -----------------------------------------------------------------------------
// DEVELOPMENT VERSION — credentials stored as plain JSON in localStorage.
// Replace with encrypted version (cryptoStore.js) before release.
// -----------------------------------------------------------------------------

const KEY = 'vault_credentials';

const INACTIVITY_TTL_MS = 7  * 24 * 60 * 60 * 1000; // 7 days
const ROTATION_TTL_MS   = 30 * 24 * 60 * 60 * 1000; // 30 days

const now = () => Date.now();

// ─── Public API ───────────────────────────────────────────────────────────────
// Signatures are identical to the encrypted version so nothing else needs to change.

export const saveCredentials = async ({ serverUrl, username, appPassword }) => {
  const payload = {
    serverUrl:   serverUrl.replace(/\/$/, ''),
    username,
    appPassword,
    lastActive:  now(),
    credentialAge: now(),
  };
  localStorage.setItem(KEY, JSON.stringify(payload));
};

export const getCredentials = async () => {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;

  try {
    const creds = JSON.parse(raw);
    if (now() - creds.lastActive > INACTIVITY_TTL_MS) {
      clearCredentials();
      return null;
    }
    return creds;
  } catch {
    clearCredentials();
    return null;
  }
};

export const hasStoredCredentials = () => {
  const raw = localStorage.getItem(KEY);
  if (!raw) return false;
  try {
    const creds = JSON.parse(raw);
    return now() - creds.lastActive <= INACTIVITY_TTL_MS;
  } catch {
    return false;
  }
};

export const touchActivity = () => {
  const raw = localStorage.getItem(KEY);
  if (!raw) return;
  try {
    const creds = JSON.parse(raw);
    creds.lastActive = now();
    localStorage.setItem(KEY, JSON.stringify(creds));
  } catch { /* ignore */ }
};

export const needsRotation = () => {
  const raw = localStorage.getItem(KEY);
  if (!raw) return false;
  try {
    const creds = JSON.parse(raw);
    return now() - creds.credentialAge > ROTATION_TTL_MS;
  } catch {
    return false;
  }
};

export const rotateAppPassword = async (newAppPassword) => {
  const creds = await getCredentials();
  if (!creds) throw new Error('Cannot rotate: not authenticated');
  creds.appPassword   = newAppPassword;
  creds.credentialAge = now();
  localStorage.setItem(KEY, JSON.stringify(creds));
};

export const getAuthHeader = async () => {
  const creds = await getCredentials();
  if (!creds) return null;
  return `Basic ${btoa(`${creds.username}:${creds.appPassword}`)}`;
};

export const clearCredentials = () => {
  localStorage.removeItem(KEY);
};