// src/webdav.js
import { getCredentials, getAuthHeader } from './auth/authStore.js';

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Authenticated fetch for WebDAV calls.
 * Mirrors the one in api.jsx — webdav.js functions are called directly
 * by components (e.g. VersionHistory) so they need their own auth wrapper.
 */
const authedFetch = async (url, options = {}) => {
  const authHeader = await getAuthHeader();
  return fetch(url, {
    ...options,
    credentials: 'omit',
    headers: {
      ...(options.headers ?? {}),
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
  });
};

// ─── URL builders ─────────────────────────────────────────────────────────────

export const davFilesUrl = async (path = '') => {
  const creds = await getCredentials();
  if (!creds) throw new Error('Not authenticated');
  const base = `${creds.serverUrl}/remote.php/dav/files/${encodeURIComponent(creds.username)}`;
  if (!path) return base;
  const encodedPath = path.replace(/^\//, '').split('/').map(segment => encodeURIComponent(segment)).join('/');
  return `${base}/${encodedPath}`;
};

export const davVersionsUrl = async (fileId) => {
  const creds = await getCredentials();
  if (!creds) throw new Error('Not authenticated');
  // fileId is always a numeric string — encodeURIComponent is safe but has no effect here
  return `${creds.serverUrl}/remote.php/dav/versions/${encodeURIComponent(creds.username)}/versions/${encodeURIComponent(fileId)}`;
};

export const davRestoreUrl = async (fileName) => {
  const creds = await getCredentials();
  if (!creds) throw new Error('Not authenticated');
  // fileName is just the bare filename (no slashes) so encode the whole thing
  return `${creds.serverUrl}/remote.php/dav/versions/${encodeURIComponent(creds.username)}/restore/${encodeURIComponent(fileName)}`;
};

export const versionStreamUrl = async (versionHref) => {
  const creds = await getCredentials();
  if (!creds) throw new Error('Not authenticated');
  // versionHref is a root-relative path already returned by Nextcloud's PROPFIND
  // It comes back pre-encoded from Nextcloud so do NOT encode it again — just prepend origin
  return `${creds.serverUrl}${versionHref}`;
};

// ─── XML parser ───────────────────────────────────────────────────────────────

export const parseMultistatus = (xmlText) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');

  return Array.from(doc.getElementsByTagNameNS('DAV:', 'response')).map(response => {
    const href = response.getElementsByTagNameNS('DAV:', 'href')[0]?.textContent ?? '';
    const propstat = response.getElementsByTagNameNS('DAV:', 'propstat')[0];
    const props = propstat?.getElementsByTagNameNS('DAV:', 'prop')[0];

    const get = (ns, local) =>
      props?.getElementsByTagNameNS(ns, local)[0]?.textContent ?? null;

    return {
      href,
      lastModified: get('DAV:', 'getlastmodified'),
      contentLength: get('DAV:', 'getcontentlength'),
      contentType: get('DAV:', 'getcontenttype'),
      fileId: get('http://owncloud.org/ns', 'fileid'),
    };
  });
};

// ─── WebDAV operations ────────────────────────────────────────────────────────

/**
 * Get the oc:fileid for a file at the given user-relative path.
 * Reference: https://docs.nextcloud.com/server/33/developer_manual/client_apis/WebDAV/basic.html
 */
export const getFileId = async (path) => {
  const url = await davFilesUrl(path);
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns">
  <d:prop><oc:fileid /></d:prop>
</d:propfind>`;

  const res = await authedFetch(url, {
    method: 'PROPFIND',
    headers: {
      'Content-Type': 'application/xml',
      'Depth': '0',
    },
    body,
  });

  if (!res.ok) throw new Error(`PROPFIND failed: ${res.status}`);

  const entries = parseMultistatus(await res.text());
  const fileId = entries[0]?.fileId;
  if (!fileId) throw new Error('oc:fileid not found in PROPFIND response');
  return fileId;
};

/**
 * List all versions for a file by its oc:fileid.
 * Reference: https://docs.nextcloud.com/server/33/developer_manual/client_apis/WebDAV/versions.html
 */
export const listVersions = async (fileId) => {
  const url = await davVersionsUrl(fileId);

  const res = await authedFetch(url, {
    method: 'PROPFIND',
    headers: {
      'Content-Type': 'application/xml',
      'Depth': '1',
    },
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
    versionId: entry.href.split('/').pop(),
    href: entry.href,
    size: entry.contentLength ? parseInt(entry.contentLength, 10) : 0,
    modified: entry.lastModified
      ? Math.floor(new Date(entry.lastModified).getTime() / 1000)
      : 0,
    contentType: entry.contentType,
  }));
};

/**
 * Restore a file to a previous version via WebDAV MOVE.
 * Reference: https://docs.nextcloud.com/server/33/developer_manual/client_apis/WebDAV/versions.html
 */
export const restoreVersion = async (versionHref, fileName) => {
  const source = await versionStreamUrl(versionHref);
  const destination = await davRestoreUrl(fileName);

  const res = await authedFetch(source, {
    method: 'MOVE',
    headers: { Destination: destination },
  });

  if (!res.ok) throw new Error(`MOVE (restore) failed: ${res.status}`);
};
