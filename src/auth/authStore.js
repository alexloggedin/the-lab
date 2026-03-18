// src/auth/authStore.js

import { generateAndStoreKey, loadKey, deleteKey, encrypt, decrypt } from './cryptoStore.js';

// ─── Storage keys ─────────────────────────────────────────────────────────────

const KEYS = {
    CREDS: 'vault_credentials',    // encrypted JSON blob
    LAST_ACTIVE: 'vault_last_active',    // ms timestamp — last vault use
    CRED_AGE: 'vault_credential_age', // ms timestamp — when appPassword was stored
};

const INACTIVITY_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const ROTATION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const now = () => Date.now();

const readTimestamp = (key) => {
    const raw = localStorage.getItem(key);
    return raw ? parseInt(raw, 10) : null;
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Encrypt and save credentials.
 * Generates a fresh AES-GCM key on every login — old ciphertext from
 * previous sessions becomes permanently unreadable.
 */
export const saveCredentials = async ({ serverUrl, username, appPassword }) => {
    // Temporarily at the top of saveCredentials in authStore.js:
    console.log('saveCredentials called for:', username);

    const key = await generateAndStoreKey();
    const payload = JSON.stringify({
        serverUrl: serverUrl.replace(/\/$/, ''),
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
 * Decrypt and return credentials.
 * Returns null when:
 *   - Nothing stored
 *   - Session key is gone (all tabs were closed)
 *   - Inactivity TTL exceeded
 *   - Decryption fails (tampered data)
 */
export const getCredentials = async () => {
    // Check expiry first — no decryption needed
    const lastActive = readTimestamp(KEYS.LAST_ACTIVE);
    if (!lastActive || now() - lastActive > INACTIVITY_TTL_MS) {
        clearCredentials();
        return null;
    }

    const encrypted = localStorage.getItem(KEYS.CREDS);
    if (!encrypted) return null;

    const key = await loadKey();
    if (!key) return null; // sessionStorage was cleared — session ended

    try {
        return JSON.parse(await decrypt(encrypted, key));
    } catch {
        // Decryption failed — data corrupted or tampered
        clearCredentials();
        return null;
    }
};

/**
 * Fast synchronous check: are credentials likely present?
 * Does NOT decrypt — used for the initial render decision to avoid
 * flashing the login page for returning users while async decryption runs.
 */
export const hasStoredCredentials = () => {
  const lastActive = readTimestamp(KEYS.LAST_ACTIVE);
  if (!lastActive || now() - lastActive > INACTIVITY_TTL_MS) return false;
  return localStorage.getItem(KEYS.CREDS) !== null;
};

/**
 * Reset the inactivity clock. Call when the user does something meaningful.
 */
export const touchActivity = () => {
    localStorage.setItem(KEYS.LAST_ACTIVE, String(now()));
};

/**
 * Returns true when the appPassword is older than ROTATION_TTL_MS.
 */
export const needsRotation = () => {
    const credAge = readTimestamp(KEYS.CRED_AGE);
    if (!credAge) return false;
    return now() - credAge > ROTATION_TTL_MS;
};

/**
 * Re-encrypt with a new appPassword. Resets the rotation clock.
 */
export const rotateAppPassword = async (newAppPassword) => {
    const creds = await getCredentials();
    if (!creds) throw new Error('Cannot rotate: not authenticated');

    const key = await loadKey();
    if (!key) throw new Error('Cannot rotate: no session key');

    const payload = JSON.stringify({ ...creds, appPassword: newAppPassword });
    const encrypted = await encrypt(payload, key);
    localStorage.setItem(KEYS.CREDS, encrypted);
    localStorage.setItem(KEYS.CRED_AGE, String(now()));
};

/**
 * Build the Authorization header value for HTTP Basic Auth.
 * Async because it requires credential decryption.
 */
export const getAuthHeader = async () => {
    const creds = await getCredentials();
    if (!creds) return null;
    return `Basic ${btoa(`${creds.username}:${creds.appPassword}`)}`;
};

/**
 * Clear all credentials from both localStorage and sessionStorage.
 */
export const clearCredentials = () => {
  Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  deleteKey();ƒ
};
