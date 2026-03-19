// src/auth/authStore.ts
import type { Credentials } from '../types';
import { generateAndStoreKey, loadKey, deleteKey, encrypt, decrypt } from './cryptoStore';

const KEYS = {
  CREDS: 'vault_credentials',
  LAST_ACTIVE: 'vault_last_active',
  CRED_AGE: 'vault_credential_age',
} as const;
// `as const` tells TypeScript these string values are literals, not just `string`

const INACTIVITY_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const ROTATION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const now = (): number => Date.now();

const readTimestamp = (key: string): number | null => {
  const raw = localStorage.getItem(key);
  return raw ? parseInt(raw, 10) : null;
};

export const saveCredentials = async (creds: Credentials): Promise<void> => {
  const key = await generateAndStoreKey();
  const payload = JSON.stringify({
    serverUrl: creds.serverUrl.replace(/\/$/, ''),
    username: creds.username,
    appPassword: creds.appPassword,
  });
  const encrypted = await encrypt(payload, key);
  localStorage.setItem(KEYS.CREDS, encrypted);
  const ts = String(now());
  localStorage.setItem(KEYS.LAST_ACTIVE, ts);
  localStorage.setItem(KEYS.CRED_AGE, ts);
};

export const getCredentials = async (): Promise<Credentials | null> => {
  const lastActive = readTimestamp(KEYS.LAST_ACTIVE);
  if (!lastActive || now() - lastActive > INACTIVITY_TTL_MS) {
    clearCredentials();
    return null;
  }
  const encrypted = localStorage.getItem(KEYS.CREDS);
  if (!encrypted) return null;
  const key = await loadKey();
  if (!key) return null;
  try {
    return JSON.parse(await decrypt(encrypted, key)) as Credentials;
  } catch {
    clearCredentials();
    return null;
  }
};

export const hasStoredCredentials = (): boolean => {
  const lastActive = readTimestamp(KEYS.LAST_ACTIVE);
  if (!lastActive || now() - lastActive > INACTIVITY_TTL_MS) return false;
  return localStorage.getItem(KEYS.CREDS) !== null;
};

export const touchActivity = (): void => {
  localStorage.setItem(KEYS.LAST_ACTIVE, String(now()));
};

export const needsRotation = (): boolean => {
  const credAge = readTimestamp(KEYS.CRED_AGE);
  if (!credAge) return false;
  return now() - credAge > ROTATION_TTL_MS;
};

export const rotateAppPassword = async (newAppPassword: string): Promise<void> => {
  const creds = await getCredentials();
  if (!creds) throw new Error('Cannot rotate: not authenticated');
  const key = await loadKey();
  if (!key) throw new Error('Cannot rotate: no session key');
  const payload = JSON.stringify({ ...creds, appPassword: newAppPassword });
  const encrypted = await encrypt(payload, key);
  localStorage.setItem(KEYS.CREDS, encrypted);
  localStorage.setItem(KEYS.CRED_AGE, String(now()));
};

export const getAuthHeader = async (): Promise<string | null> => {
  const creds = await getCredentials();
  if (!creds) return null;
  return `Basic ${btoa(`${creds.username}:${creds.appPassword}`)}`;
};

export const clearCredentials = (): void => {
  Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  deleteKey();
};