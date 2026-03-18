// src/webdav.jsx — top section replacement
import { getCredentials, getAuthHeader } from './auth/authStore.js';

/**
 * Build common headers for authenticated WebDAV requests.
 * Async because getAuthHeader requires credential decryption.
 */
export const davAuthHeaders = async (extra = {}) => {
  const authHeader = await getAuthHeader();
  return {
    ...(authHeader ? { Authorization: authHeader } : {}),
    ...extra,
  };
};

/**
 * Build the WebDAV files base URL for the current user.
 * Requires credentials to be loaded first.
 */
export const davFilesUrl = async (path = '') => {
  const creds = await getCredentials();
  if (!creds) throw new Error('Not authenticated');
  const base = `${creds.serverUrl}/remote.php/dav/files/${encodeURIComponent(creds.username)}`;
  return path ? `${base}/${path.replace(/^\//, '')}` : base;
};

/**
 * Build the WebDAV versions URL for a given file ID.
 */
export const davVersionsUrl = async (fileId) => {
  const creds = await getCredentials();
  if (!creds) throw new Error('Not authenticated');
  return `${creds.serverUrl}/remote.php/dav/versions/${encodeURIComponent(creds.username)}/versions/${fileId}`;
};

/**
 * Build the restore target URL for a WebDAV MOVE operation.
 */
export const davRestoreUrl = async (fileName) => {
  const creds = await getCredentials();
  if (!creds) throw new Error('Not authenticated');
  return `${creds.serverUrl}/remote.php/dav/versions/${encodeURIComponent(creds.username)}/restore/${encodeURIComponent(fileName)}`;
};

/**
 * Build an absolute URL from a root-relative version href.
 */
export const versionStreamUrl = async (versionHref) => {
  const creds = await getCredentials();
  if (!creds) throw new Error('Not authenticated');
  return `${creds.serverUrl}${versionHref}`;
};

// getFileId — updated
export const getFileId = async (path) => {
  const url     = await davFilesUrl(path);
  const headers = await davAuthHeaders({
    'Content-Type': 'application/xml',
    'Depth': '0',
  });
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns">
  <d:prop><oc:fileid /></d:prop>
</d:propfind>`;

  const res = await fetch(url, { method: 'PROPFIND', headers, body });
  if (!res.ok) throw new Error(`PROPFIND failed: ${res.status}`);

  const xml     = await res.text();
  const entries = parseMultistatus(xml);
  const fileId  = entries[0]?.fileId;
  if (!fileId) throw new Error('oc:fileid not found in PROPFIND response');
  return fileId;
};

// listVersions — updated
export const listVersions = async (fileId) => {
  const url     = await davVersionsUrl(fileId);
  const headers = await davAuthHeaders({
    'Content-Type': 'application/xml',
    'Depth': '1',
  });

  const res = await fetch(url, {
    method: 'PROPFIND',
    headers,
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
  const xml     = await res.text();
  const entries = parseMultistatus(xml);

  return entries.slice(1).map(entry => ({
    versionId:   entry.href.split('/').pop(),
    href:        entry.href,
    size:        entry.contentLength ? parseInt(entry.contentLength, 10) : 0,
    modified:    entry.lastModified
      ? Math.floor(new Date(entry.lastModified).getTime() / 1000)
      : 0,
    contentType: entry.contentType,
  }));
};

// restoreVersion — updated
export const restoreVersion = async (versionHref, fileName) => {
  const source      = await versionStreamUrl(versionHref);
  const destination = await davRestoreUrl(fileName);
  const headers     = await davAuthHeaders({ Destination: destination });

  const res = await fetch(source, { method: 'MOVE', headers });
  if (!res.ok) throw new Error(`MOVE (restore) failed: ${res.status}`);
};
