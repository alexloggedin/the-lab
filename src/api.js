// src/api.jsx
import { USE_MOCK } from './dev/useMockData.js';
import { mockFiles, mockFolders, mockMetadata, mockShareLinks } from './dev/fixtures.js';
import { getAuthHeader, touchActivity } from './auth/authStore.js';
import { davFilesUrl, parseMultistatus } from './webdav.js';

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Every real request to Nextcloud goes through here.
 * Adds the Authorization header from stored credentials.
 * Watches for 401 to force logout if the appPassword is revoked.
 */
const authedFetch = async (url, options = {}) => {
  const authHeader = await getAuthHeader();

  console.log('authedFetch →', url);
  console.log('Authorization header:', authHeader ? authHeader.slice(0, 20) + '...' : 'MISSING');

  if (!authHeader) {
    console.warn('authedFetch: no auth header available — credentials missing or session expired');
  }

  const res = await fetch(url, {
    ...options,
    credentials: 'omit',
    headers: {
      ...(options.headers ?? {}),
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
  });

  console.log('Response status:', res.status);
  // if (res.status === 401) {
  //   const { clearCredentials } = await import('./auth/authStore.js');
  //   clearCredentials();
  //   window.location.reload();
  // }

  return res;
};

/**
 * Ensure the theVault root folder exists.
 * PROPFIND checks for it; MKCOL creates it if missing.
 * Reference: https://docs.nextcloud.com/server/33/developer_manual/client_apis/WebDAV/basic.html
 */
const ensureVaultFolder = async () => {
  const url = await davFilesUrl('theVault');

  const checkRes = await authedFetch(url, {
    method: 'PROPFIND',
    headers: {
      'Depth': '0',
      'Content-Type': 'application/xml',
    },
    body: `<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/></d:prop></d:propfind>`,
  });

  if (checkRes.status === 404) {
    const mkcolRes = await authedFetch(url, { method: 'MKCOL' });
    if (!mkcolRes.ok && mkcolRes.status !== 405) {
      throw new Error(`Could not create theVault folder: ${mkcolRes.status}`);
    }
  }
};

/**
 * Convert a raw WebDAV PROPFIND entry into the file shape components expect.
 * Exported for unit testing.
 */
export const entryToFile = (entry) => {
  const match = entry.href.match(/\/remote\.php\/dav\/files\/[^/]+\/(.+)/);
  const path = match ? decodeURIComponent(match[1]) : entry.href;
  const cleanPath = path.replace(/\/$/, '');
  const name = cleanPath.split('/').pop();
  const isFolder = entry.contentType === null && entry.contentLength === null;

  return {
    name,
    path: cleanPath,
    size: entry.contentLength ? parseInt(entry.contentLength, 10) : 0,
    modified: entry.lastModified
      ? Math.floor(new Date(entry.lastModified).getTime() / 1000)
      : 0,
    mimetype: isFolder ? 'httpd/unix-directory' : (entry.contentType ?? 'application/octet-stream'),
    type: isFolder ? 'dir' : 'file',
  };
};

// ─── Public API ───────────────────────────────────────────────────────────────

export const api = {

  initVault: () =>
    USE_MOCK
      ? Promise.resolve({ data: { success: true } })
      : ensureVaultFolder(),

  getFiles: (path = 'theVault') =>
    USE_MOCK
      ? Promise.resolve({ data: path !== 'theVault' ? mockFiles : mockFolders })
      : (async () => {
        const url = await davFilesUrl(path);
        const body = `<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns">
  <d:prop>
    <d:getlastmodified />
    <d:getcontentlength />
    <d:getcontenttype />
    <d:resourcetype />
    <oc:fileid />
  </d:prop>
</d:propfind>`;

        const res = await authedFetch(url, {
          method: 'PROPFIND',
          headers: {
            'Content-Type': 'application/xml',
            'Depth': '1',
          },
          body,
        });

        if (!res.ok) throw new Error(`PROPFIND failed: ${res.status}`);

        const children = parseMultistatus(await res.text()).slice(1).map(entryToFile);
        const filtered = path === 'theVault'
          ? children.filter(f => f.type === 'dir')
          : children.filter(f => f.type === 'file');

        touchActivity();
        return { data: filtered };
      })(),

  streamUrl: async (path) => {
    if (USE_MOCK) return '/mock-audio/test.wav';
    return davFilesUrl(path);
  },

  // Metadata — placeholder until P4
  getMetadata: () =>
    USE_MOCK ? Promise.resolve({ data: mockMetadata }) : Promise.resolve({ data: {} }),

  updateMetadata: () =>
    USE_MOCK ? Promise.resolve({ data: { success: true } }) : Promise.resolve({ data: {} }),

  // Shares — placeholder until P2
  getShares: () =>
    USE_MOCK ? Promise.resolve({ data: mockShareLinks }) : Promise.resolve({ data: [] }),

  createShare: () =>
    USE_MOCK ? Promise.resolve({ data: { id: '2', token: 'newXyz' } }) : Promise.resolve({ data: {} }),

  deleteShare: () =>
    USE_MOCK ? Promise.resolve({ data: { success: true } }) : Promise.resolve({ data: {} }),

  getShareByToken: (token) =>
    USE_MOCK ? getMockShareInfoFromToken(token) : Promise.resolve({ data: {} }),

  getShareContents: () =>
    USE_MOCK ? Promise.resolve({ data: mockFiles }) : Promise.resolve({ data: [] }),

  publicStreamUrl: (token) =>
    USE_MOCK ? '/mock-audio/test.wav' : '',
};

function getMockShareInfoFromToken(token) {
  switch (token) {
    case 'invalid':
      return Promise.reject(new Error('not found'));
    case 'folder':
      return Promise.resolve({ data: { token, fileName: 'ep-demos', mimetype: 'httpd/unix-directory', isFolder: true, hideDownload: false } });
    default:
      return Promise.resolve({ data: { token, fileName: 'track_01_v3.wav', mimetype: 'audio/wav', isFolder: false, hideDownload: false, meta: { bpm: '128', key: 'Am', genre: 'Electronic' } } });
  }
}
