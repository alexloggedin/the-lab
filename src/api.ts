// src/api.ts
import type { VaultFile, FileMetadata, ShareLink, ShareInfo, ApiResponse, DavEntry } from './types';
import { USE_MOCK } from './dev/useMockData';
import { mockFiles, mockFolders, mockMetadata, mockShareLinks } from './dev/fixtures';
import { getAuthHeader, touchActivity } from './auth/authStore';
import { davFilesUrl, parseMultistatus } from './webdav';
import { ocsListShares, ocsCreateShare, ocsDeleteShare } from './api/sharesApi.ts';
import { getShareInfo, listShareContents, publicStreamUrl as buildPublicStreamUrl } from './api/publicShareApi.ts';


const authedFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const authHeader = await getAuthHeader();
  const res = await fetch(url, {
    ...options,
    credentials: 'omit',
    headers: {
      ...(options.headers ?? {}),
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
  });
  return res;
};

const ensureVaultFolder = async (): Promise<void> => {
  const url = await davFilesUrl('theVault');
  const checkRes = await authedFetch(url, {
    method: 'PROPFIND',
    headers: { 'Depth': '0', 'Content-Type': 'application/xml' },
    body: `<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/></d:prop></d:propfind>`,
  });
  if (checkRes.status === 404) {
    const mkcolRes = await authedFetch(url, { method: 'MKCOL' });
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

  initVault: (): Promise<ApiResponse<{ success: boolean }> | void> =>
    USE_MOCK
      ? Promise.resolve({ data: { success: true } })
      : ensureVaultFolder(),

  getFiles: (path = 'theVault'): Promise<ApiResponse<VaultFile[]>> =>
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
            headers: { 'Content-Type': 'application/xml', 'Depth': '1' },
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

  streamUrl: async (path: string): Promise<string> => {
    if (USE_MOCK) return '/mock-audio/test.wav';
    return davFilesUrl(path);
  },

  getMetadata: (_path?: string): Promise<ApiResponse<FileMetadata>> =>
    USE_MOCK ? Promise.resolve({ data: mockMetadata }) : Promise.resolve({ data: {} }),

  updateMetadata: (_path?: string, _meta?: Partial<FileMetadata>): Promise<ApiResponse<{ success: boolean }>> =>
    USE_MOCK ? Promise.resolve({ data: { success: true } }) : Promise.resolve({ data: { success: true } }),

  getShares: (): Promise<ApiResponse<ShareLink[]>> =>
    USE_MOCK ? Promise.resolve({ data: mockShareLinks }) : ocsListShares().then(data => ({ data })),

  createShare: (path: string, hideDownload: boolean): Promise<ApiResponse<ShareLink>> =>
    USE_MOCK ? Promise.resolve({ data: mockShareLinks[0]}) : ocsCreateShare({ path, hideDownload }).then(data => ({ data })),

  deleteShare: (id: string): Promise<ApiResponse<{ success: boolean }>> =>
    USE_MOCK ? Promise.resolve({ data: { success: true } }) : ocsDeleteShare(id).then(() => ({ data: { success: true } })),

  getShareByToken: (token: string): Promise<ApiResponse<ShareInfo>> =>
    USE_MOCK ? getMockShareInfoFromToken(token) : getShareInfo(token).then(data => ({ data })),

  getShareContents: (token: string): Promise<ApiResponse<VaultFile[]>> =>
    USE_MOCK ? Promise.resolve({ data: mockFiles }) : listShareContents(token).then(data => ({ data })),

  publicStreamUrl: (token: string, path: string): string =>
    USE_MOCK ? '/mock-audio/test.wav' : '',
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
