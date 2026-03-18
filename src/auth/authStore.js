// src/auth/authStore.js
import { generateAndStoreKey, loadKey, encrypt, decrypt } from './cryptoStore.js';

// ─── Storage keys ─────────────────────────────────────────────────────────────

const KEYS = {
  CREDS:       'vault_credentials',    // encrypted JSON blob
  LAST_ACTIVE: 'vault_last_active',    // timestamp (ms) of last app use
  CRED_AGE:    'vault_credential_age', // timestamp (ms) when appPassword was stored
};

// ─── Expiry configuration ─────────────────────────────────────────────────────

const INACTIVITY_TTL_MS  = 7  * 24 * 60 * 60 * 1000; // 7 days
const ROTATION_TTL_MS    = 30 * 24 * 60 * 60 * 1000; // 30 days

// ─── Internal helpers ─────────────────────────────────────────────────────────

const now = () => Date.now();

const readTimestamp = (key) => {
  const raw = localStorage.getItem(key);
  return raw ? parseInt(raw, 10) : null;
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Save credentials to localStorage, encrypted.
 * Also records the current time as both lastActive and credentialAge.
 * Generates a new encryption key (stored in sessionStorage).
 */
export const saveCredentials = async ({ serverUrl, username, appPassword }) => {
  const key = await generateAndStoreKey();

  const payload = JSON.stringify({
    serverUrl:   serverUrl.replace(/\/$/, ''), // strip trailing slash
    username,
    appPassword,
  });

  const encrypted = await encrypt(payload, key);
  localStorage.setItem(KEYS.CREDS, encrypted);

  const ts = String(now());
  localStorage.setItem(KEYS.LAST_ACTIVE, ts);
  localStorage.setItem(KEYS.CRED_AGE, ts);
};

/**
 * Load and decrypt credentials from localStorage.
 * Returns the credentials object, or null if:
 *   - No credentials are stored
 *   - The session key is gone (sessionStorage cleared)
 *   - The credentials have expired (7-day inactivity)
 *   - Decryption fails for any reason
 */
export const getCredentials = async () => {
  // Check inactivity expiry first (no decryption needed)
  const lastActive = readTimestamp(KEYS.LAST_ACTIVE);
  if (!lastActive || now() - lastActive > INACTIVITY_TTL_MS) {
    clearCredentials();
    return null;
  }

  const encrypted = localStorage.getItem(KEYS.CREDS);
  if (!encrypted) return null;

  const key = await loadKey();
  if (!key) return null; // session ended, key is gone

  try {
    const payload = await decrypt(encrypted, key);
    return JSON.parse(payload);
  } catch {
    // Decryption failed — data may be corrupted or tampered with
    clearCredentials();
    return null;
  }
};

/**
 * Update the lastActive timestamp.
 * Call this when the user performs meaningful actions (app load, folder open, etc.).
 * This resets the 7-day inactivity clock.
 */
export const touchActivity = () => {
  localStorage.setItem(KEYS.LAST_ACTIVE, String(now()));
};

/**
 * Check if the stored appPassword is old enough to need rotation.
 * Returns true if credentialAge > ROTATION_TTL_MS.
 */
export const needsRotation = () => {
  const credAge = readTimestamp(KEYS.CRED_AGE);
  if (!credAge) return false;
  return now() - credAge > ROTATION_TTL_MS;
};

/**
 * Replace the appPassword in the stored credentials.
 * Re-encrypts with the existing session key.
 * Called after a successful rotation flow.
 */
export const rotateAppPassword = async (newAppPassword) => {
  const creds = await getCredentials();
  if (!creds) throw new Error('Cannot rotate: not authenticated');

  const key = await loadKey();
  if (!key) throw new Error('Cannot rotate: session key not available');

  const payload = JSON.stringify({ ...creds, appPassword: newAppPassword });
  const encrypted = await encrypt(payload, key);

  localStorage.setItem(KEYS.CREDS, encrypted);
  localStorage.setItem(KEYS.CRED_AGE, String(now())); // reset the rotation clock
};

/**
 * Build the HTTP Basic Auth header value.
 * Async because credential loading requires decryption.
 * Returns null if not authenticated.
 */
export const getAuthHeader = async () => {
  const creds = await getCredentials();
  if (!creds) return null;
  return `Basic ${btoa(`${creds.username}:${creds.appPassword}`)}`;
};

/**
 * Synchronous check: are credentials stored at all (without decrypting)?
 * Use this for fast "are we logged in?" checks at app start before async loading.
 */
export const hasStoredCredentials = () => {
  const lastActive = readTimestamp(KEYS.LAST_ACTIVE);
  if (!lastActive || now() - lastActive > INACTIVITY_TTL_MS) return false;
  return localStorage.getItem(KEYS.CREDS) !== null;
};

/**
 * Clear all credentials and timestamps from localStorage and sessionStorage.
 */
export const clearCredentials = () => {
  Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  sessionStorage.removeItem('vault_crypto_key');
};
