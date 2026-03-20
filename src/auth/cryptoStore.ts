// src/auth/cryptoStore.js
// Uses IndexedDB to store a non-extractable CryptoKey.

const DB_NAME    = 'vault_keystore';
const DB_VERSION = 1;
const STORE_NAME = 'keys';
const KEY_ID     = 'vault_main_key';

// ─── IndexedDB helpers ────────────────────────────────────────────────────────

const openDB = () => new Promise<any>((resolve, reject) => {
  const req = indexedDB.open(DB_NAME, DB_VERSION);

  req.onupgradeneeded = (e:any) => {
    e.target.result.createObjectStore(STORE_NAME);
  };

  req.onsuccess = (e) => resolve(e?.target?.result);
  req.onerror   = (e) => reject(e?.target?.error);
});

const dbGet = async (key: string) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror   = () => reject(req.error);
  });
};

const dbSet = async (key: string, value: string) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).put(value, key);
    req.onsuccess = () => resolve(req.status);
    req.onerror   = () => reject(req.error);
  });
};

const dbDelete = async (key: string) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).delete(key);
    req.onsuccess = () => resolve(req.status);
    req.onerror   = () => reject(req.error);
  });
};

// ─── Key management ───────────────────────────────────────────────────────────

/**
 * Generate a new AES-GCM 256-bit key and persist it to IndexedDB.
 *
 * extractable: false means the raw key bytes can never be read out by
 * JavaScript. The key can only be used for encrypt/decrypt operations.
 * An XSS attacker can use the key in the current session but cannot
 * steal it to use elsewhere.
 */
export const generateAndStoreKey = async () => {
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false,          // NOT extractable — key bytes never leave the browser engine
    ['encrypt', 'decrypt']
  );

  await dbSet(KEY_ID, key);
  return key;
};

/**
 * Load the CryptoKey from IndexedDB.
 * Returns null if no key exists — user must log in again.
 */
export const loadKey = async () => {
  try {
    const key = await dbGet(KEY_ID);
    return key ?? null;
  } catch {
    return null;
  }
};

/**
 * Delete the stored key. Called on logout and credential clear.
 */
export const deleteKey = async () => {
  try {
    await dbDelete(KEY_ID);
  } catch { /* ignore */ }
};

// ─── Encrypt / Decrypt ────────────────────────────────────────────────────────

/**
 * Encrypt a string. Returns base64: [12-byte IV][ciphertext].
 * A fresh random IV is generated per call.
 */
export const encrypt = async (plaintext, key) => {
  const iv      = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const cipher  = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);

  const combined = new Uint8Array(iv.byteLength + cipher.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipher), iv.byteLength);

  return btoa(String.fromCharCode(...combined));
};

/**
 * Decrypt a base64 string produced by encrypt().
 * Throws if data is tampered — AES-GCM authentication tag fails.
 */
export const decrypt = async (ciphertextB64: string, key: CryptoKey) => {
  const combined   = Uint8Array.from(atob(ciphertextB64), c => c.charCodeAt(0));
  const iv         = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
};