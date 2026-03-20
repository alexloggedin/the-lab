import type { VaultFile, FileMetadata, ShareLink, ShareInfo, ApiResponse, DavEntry } from '../types';
import { USE_MOCK } from '../dev/useMockData';
import { mockFiles, mockFolders, mockMetadata, mockShareLinks } from '../dev/fixtures';
import { getRequestToken, REQUEST_TOKEN_HEADER } from '../auth/session';
import { davFilesUrl, parseMultistatus } from './webdav';
import { ocsListShares, ocsCreateShare, ocsDeleteShare } from './sharesApi';
import { getShareInfo, listShareContents, publicStreamUrl as buildPublicStreamUrl } from './publicShareApi';

/**
 * Session-authenticated fetch.
 * credentials: 'include' sends the Nextcloud session cookie automatically.
 * RequestVerificationToken is Nextcloud's CSRF header name.
 *
 * Reference: https://docs.nextcloud.com/server/33/developer_manual/digging_deeper/csrf.html
 */
const sessionFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const method = (options.method ?? 'GET').toUpperCase();
  console.log(`[api] ${method} ${url}`);

  return fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.headers ?? {}),
      'requesttoken': getRequestToken(), 
    },
  });
};

const ensureVaultFolder = async (): Promise<void> => {
  const url = davFilesUrl('theVault');
  const checkRes = await sessionFetch(url, {
    method: 'PROPFIND',
    headers: { 'Depth': '0', 'Content-Type': 'application/xml' },
    body: `<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/></d:prop></d:propfind>`,
  });
  if (checkRes.status === 404) {
    console.log('[api] theVault folder not found, creating...');
    const mkcolRes = await sessionFetch(url, { method: 'MKCOL' });
    if (!mkcolRes.ok && mkcolRes.status !== 405) {
      throw new Error(`Could not create theVault folder: ${mkcolRes.status}`);
    }
  }
};

export const entryToFile = (entry: DavEntry): VaultFile => {
  const match = entry.href.match(/\/remote\.php\/dav\/files\/[^/]+\/(.+)/);
  const path = match ? decodeURIComponent(match[1]) : entry.href;
  const cleanPath = path.replace(/\/$/, '');
  const name = cleanPath.split('/').pop() ?? cleanPath;
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

export const api = {

  initVault: (): Promise<void | ApiResponse<{ success: boolean }>> =>
    USE_MOCK
      ? Promise.resolve({ data: { success: true } })
      : ensureVaultFolder(),

  getFiles: (path = 'theLAB'): Promise<ApiResponse<VaultFile[]>> =>
    USE_MOCK
      ? Promise.resolve({ data: path !== 'theLAB' ? mockFiles : mockFolders })
      : (async () => {
          const url = davFilesUrl(path);
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
          const res = await sessionFetch(url, {
            method: 'PROPFIND',
            headers: { 'Content-Type': 'application/xml', 'Depth': '1' },
            body,
          });
          if (!res.ok) throw new Error(`PROPFIND failed: ${res.status}`);
          const children = parseMultistatus(await res.text()).slice(1).map(entryToFile);
          const filtered = path === 'theVault'
            ? children.filter(f => f.type === 'dir')
            : children.filter(f => f.type === 'file');
          console.log(`[api] getFiles(${path}) → ${filtered.length} items`);
          return { data: filtered };
        })(),

  /**
   * Returns a root-relative URL for streaming a file.
   * The browser sends the session cookie automatically when fetching this URL.
   * 
   * AudioPlayer and VideoPlayer use this URL to fetch the blob. Because
   * credentials: 'include' is set in those components, the stream is authenticated.
   */
  streamUrl: (path: string): Promise<string> => {
    if (USE_MOCK) return Promise.resolve('/mock-audio/test.wav');
    return Promise.resolve(davFilesUrl(path));
  },

  getMetadata: (_path?: string): Promise<ApiResponse<FileMetadata>> =>
    USE_MOCK ? Promise.resolve({ data: mockMetadata }) : Promise.resolve({ data: {} }),

  updateMetadata: (_path?: string, _meta?: Partial<FileMetadata>): Promise<ApiResponse<{ success: boolean }>> =>
    Promise.resolve({ data: { success: true } }),

  getShares: (): Promise<ApiResponse<ShareLink[]>> =>
    USE_MOCK
      ? Promise.resolve({ data: mockShareLinks })
      : ocsListShares().then(data => ({ data })),

  createShare: (path: string, hideDownload: boolean): Promise<ApiResponse<ShareLink>> =>
    USE_MOCK
      ? Promise.resolve({ data: mockShareLinks[0] })
      : ocsCreateShare({ path, hideDownload }).then(data => ({ data })),

  deleteShare: (id: string): Promise<ApiResponse<{ success: boolean }>> =>
    USE_MOCK
      ? Promise.resolve({ data: { success: true } })
      : ocsDeleteShare(id).then(() => ({ data: { success: true } })),

  getShareByToken: (token: string): Promise<ApiResponse<ShareInfo>> =>
    USE_MOCK
      ? getMockShareInfoFromToken(token)
      : getShareInfo(token).then(data => ({ data })),

  getShareContents: (token: string): Promise<ApiResponse<VaultFile[]>> =>
    USE_MOCK
      ? Promise.resolve({ data: mockFiles })
      : listShareContents(token).then(data => ({ data })),

  publicStreamUrl: (token: string, fileName: string | null = null): string =>
    USE_MOCK ? '/mock-audio/test.wav' : buildPublicStreamUrl(token, fileName),
};

function getMockShareInfoFromToken(token: string): Promise<ApiResponse<ShareInfo>> {
  switch (token) {
    case 'invalid':
      return Promise.reject(new Error('not found'));
    case 'folder':
      return Promise.resolve({ data: { token, fileName: 'ep-demos', mimetype: 'httpd/unix-directory', isFolder: true, hideDownload: false } });
    default:
      return Promise.resolve({ data: { token, fileName: 'track_01_v3.wav', mimetype: 'audio/wav', isFolder: false, hideDownload: false, meta: { bpm: '128', key: 'Am', genre: 'Electronic' } } });
  }
}
