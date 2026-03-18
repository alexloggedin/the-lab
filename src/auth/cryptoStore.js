// src/auth/cryptoStore.js

const SESSION_KEY_NAME = 'vault_crypto_key';

// ─── Key management ───────────────────────────────────────────────────────────

/**
 * Generate a new AES-GCM 256-bit key and persist it to sessionStorage.
 * Called once on first login. Returns the CryptoKey object.
 *
 * AES-GCM is authenticated encryption — it detects tampering as well as
 * keeping data confidential. 256-bit key length is the strongest available.
 *
 * Reference: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/generateKey
 */
export const generateAndStoreKey = async () => {
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,          // extractable: we need to export it for storage
    ['encrypt', 'decrypt']
  );

  // Export as raw bytes and store as a base64 string in sessionStorage
  const rawKey = await crypto.subtle.exportKey('raw', key);
  const keyB64 = btoa(String.fromCharCode(...new Uint8Array(rawKey)));
  sessionStorage.setItem(SESSION_KEY_NAME, keyB64);
  return key;
};

/**
 * Load the CryptoKey from sessionStorage.
 * Returns null if no key is stored (session has ended or key was never generated).
 */
export const loadKey = async () => {
  const keyB64 = sessionStorage.getItem(SESSION_KEY_NAME);
  if (!keyB64) return null;

  try {
    const rawKey = Uint8Array.from(atob(keyB64), c => c.charCodeAt(0));
    return await crypto.subtle.importKey(
      'raw',
      rawKey,
      { name: 'AES-GCM' },
      false,         // not extractable once reimported — no need to export again
      ['encrypt', 'decrypt']
    );
  } catch {
    // Key data is corrupted — treat as expired session
    sessionStorage.removeItem(SESSION_KEY_NAME);
    return null;
  }
};

// ─── Encrypt / Decrypt ────────────────────────────────────────────────────────

/**
 * Encrypt a plain string with the given CryptoKey.
 * Returns a base64-encoded string of: [12-byte IV] + [ciphertext].
 *
 * A fresh random IV is generated for every encryption operation.
 * This is required for AES-GCM security — never reuse an IV with the same key.
 */
export const encrypt = async (plaintext, key) => {
  const iv = crypto.getRandomValues(new Uint8Array(12)); // AES-GCM standard IV length
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );

  // Prepend IV to ciphertext so we can extract it on decryption
  const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.byteLength);

  return btoa(String.fromCharCode(...combined));
};

/**
 * Decrypt a base64-encoded string (from encrypt()) with the given CryptoKey.
 * Returns the original plaintext string, or throws on failure.
 */
export const decrypt = async (ciphertextB64, key) => {
  const combined = Uint8Array.from(atob(ciphertextB64), c => c.charCodeAt(0));
  const iv         = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
};
