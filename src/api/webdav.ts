// src/api/webdav.ts

import type { DavEntry, FileVersion } from '../types';
import { getRequestToken, REQUEST_TOKEN_HEADER } from '../auth/session';


// ─── Internal helpers ─────────────────────────────────────────────────────

/**
 * Fetch wrapper for authenticated DAV requests.
 *
 * Key changes from the old version:
 * - credentials: 'include' sends the Nextcloud session cookie automatically
 * - No Authorization header — the session cookie handles auth
 * - RequestVerificationToken is added for POST/DELETE/PUT/MOVE (CSRF protection)
 *
 * Reference: https://docs.nextcloud.com/server/33/developer_manual/digging_deeper/csrf.html
 */
const sessionFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const method = (options.method ?? 'GET').toUpperCase();
  const isMutating = ['POST', 'PUT', 'DELETE', 'MOVE', 'MKCOL', 'PROPFIND'].includes(method);

  console.log(`[webdav] ${method} ${url}`);

  return fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.headers ?? {}),
      // CSRF token required on all requests in Nextcloud's session context
      ...(isMutating ? { 'requesttoken': getRequestToken() } : {}),
    },
  });
};

// ─── URL builders ─────────────────────────────────────────────────────────

/**
 * Build a root-relative WebDAV URL for the current user's files.
 *
 * We get the username from window.OC.currentUser, which Nextcloud injects.
 * In mock mode, we fall back to 'admin'.
 *
 * Reference: https://docs.nextcloud.com/server/33/developer_manual/client_apis/WebDAV/basic.html
 */
const currentUser = (): string => {
  return (window as any)?.OC?.currentUser ?? 'admin';
};

export const davFilesUrl = (path = ''): string => {
  const user = encodeURIComponent(currentUser());
  const base = `/remote.php/dav/files/${user}`;
  if (!path) return base;
  const encodedPath = path
    .replace(/^\//, '')
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');
  return `${base}/${encodedPath}`;
};

export const davVersionsUrl = (fileId: string): string => {
  const user = encodeURIComponent(currentUser());
  return `/remote.php/dav/versions/${user}/versions/${encodeURIComponent(fileId)}`;
};

export const davRestoreUrl = (fileName: string): string => {
  const user = encodeURIComponent(currentUser());
  return `/remote.php/dav/versions/${user}/restore/${encodeURIComponent(fileName)}`;
};

export const versionStreamUrl = (versionHref: string): string => {
  // versionHref is already a root-relative path from the PROPFIND response
  return versionHref;
};

// ─── XML parser ───────────────────────────────────────────────────────────

export const parseMultistatus = (xmlText: string): DavEntry[] => {

  console.log('[parseMultistatus] called, xml length:', xmlText.length);
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');

  return Array.from(doc.getElementsByTagNameNS('DAV:', 'response')).map(response => {
    const href = response.getElementsByTagNameNS('DAV:', 'href')[0]?.textContent ?? '';
    const propstat = response.getElementsByTagNameNS('DAV:', 'propstat')[0];
    const props = propstat?.getElementsByTagNameNS('DAV:', 'prop')[0];

    const get = (ns: string, local: string): string | null => {
      const el = props?.getElementsByTagNameNS(ns, local)[0];
      if (!el) return null;
      const val = el.textContent?.trim() ?? '';
      return val === '' ? null : val;
    };

    return {
      href,
      lastModified: get('DAV:', 'getlastmodified'),
      contentLength: get('DAV:', 'getcontentlength'),
      contentType: get('DAV:', 'getcontenttype'),
      fileId: get('http://owncloud.org/ns', 'fileid'),
    };
  });
};

// ─── WebDAV operations ────────────────────────────────────────────────────

export const getFileId = async (path: string): Promise<string> => {
  const url = davFilesUrl(path);
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns">
  <d:prop><oc:fileid /></d:prop>
</d:propfind>`;

  const res = await sessionFetch(url, {
    method: 'PROPFIND',
    headers: { 'Content-Type': 'application/xml', 'Depth': '0' },
    body,
  });

  if (!res.ok) throw new Error(`PROPFIND failed: ${res.status}`);

  const entries = parseMultistatus(await res.text());
  const fileId = entries[0]?.fileId;
  if (!fileId) throw new Error('oc:fileid not found in PROPFIND response');
  return fileId;
};

export const listVersions = async (fileId: string): Promise<FileVersion[]> => {
  const url = davVersionsUrl(fileId);

  const res = await sessionFetch(url, {
    method: 'PROPFIND',
    headers: { 'Content-Type': 'application/xml', 'Depth': '1' },
    body: `<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="DAV:">
  <d:prop>
    <d:getlastmodified />
    <d:getcontentlength />
    <d:getcontenttype />
  </d:prop>
</d:propfind>`,
  });

  if (!res.ok) throw new Error(`PROPFIND versions failed: ${res.status}`);

  return parseMultistatus(await res.text()).slice(1).map(entry => ({
    versionId: entry.href.split('/').pop() ?? '',
    href: entry.href,
    size: entry.contentLength ? parseInt(entry.contentLength, 10) : 0,
    modified: entry.lastModified
      ? Math.floor(new Date(entry.lastModified).getTime() / 1000)
      : 0,
    contentType: entry.contentType,
  }));
};

export const restoreVersion = async (versionHref: string, fileName: string): Promise<void> => {
  const source = versionHref;
  const destination = davRestoreUrl(fileName);

  const res = await sessionFetch(source, {
    method: 'MOVE',
    headers: {
      'Destination': destination,
      REQUEST_TOKEN_HEADER: getRequestToken(),
    },
  });

  if (!res.ok) throw new Error(`MOVE (restore) failed: ${res.status}`);
};
