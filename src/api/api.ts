import type { VaultFile, FileMetadata, ShareLink, ShareInfo, ApiResponse, DavEntry } from '../types';
import { USE_MOCK } from '../dev/useMockData';
import { mockFiles, mockFolders, mockMetadata, mockShareLinks } from '../dev/fixtures';
import { getRequestToken, REQUEST_TOKEN_HEADER } from '../auth/session';
import { davFilesUrl, parseMultistatus } from './webdav';
import { ocsListShares, ocsCreateShare, ocsDeleteShare } from './sharesApi';
import { getShareInfo, listShareContents, publicStreamUrl as buildPublicStreamUrl } from './publicShareApi';
import type { FileStat } from 'webdav';
import { createDavClient } from './davClient';

const client = createDavClient();

// ─── External API helpers ─────────────────────────────────────────────────────
export const api = {

  initVault: (): Promise<void | ApiResponse<{ success: boolean }>> =>
    USE_MOCK
      ? Promise.resolve({ data: { success: true } })
      : ensureVaultFolder(),

  getFiles: async (path = 'theVault'): Promise<ApiResponse<VaultFile[]>> => {
    if (USE_MOCK) return { data: path !== 'theVault' ? mockFiles : mockFolders };
    const user = (window as any)?.OC?.currentUser ?? 'admin';

    const results = await client.getDirectoryContents(`/files/${user}/${path}`);

    const stats = Array.isArray(results) ? results : results.data;

    const files = stats.map(fileStatToVaultFile);
    const filtered = path === 'theVault'
      ? files.filter(f => f.type === 'dir')
      : files.filter(f => f.type === 'file');

    return { data: filtered };
  },

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

const ensureVaultFolder = async (): Promise<void> => {
  const user = (window as any)?.OC?.currentUser ?? 'admin';
  const path = `/files/${user}/theVault`;

  try {
    await client.stat(path);
    // stat() succeeds → folder exists, nothing to do
  } catch (err: any) {
    if (err?.status === 404) {
      // stat() threw a 404 → folder doesn't exist, create it
      // createDirectory() sends a MKCOL request
      // Docs: https://github.com/perry-mitchell/webdav-client#createdirectory
      await client.createDirectory(path);
    } else {
      throw err; // unexpected error, propagate it
    }
  }
};

export const fileStatToVaultFile = (stat: FileStat): VaultFile => {
  // Strip /files/username/ from the front — same logic as your current entryToFile
  const match = stat.filename.match(/^\/files\/[^/]+\/(.+)/);
  const path = match ? match[1] : stat.filename;

  return {
    name: stat.basename,
    path: path.replace(/\/$/, ''),
    size: stat.size ?? 0,
    modified: Math.floor(new Date(stat.lastmod).getTime() / 1000),
    mimetype: stat.type === 'directory'
      ? 'httpd/unix-directory'
      : (stat.mime ?? 'application/octet-stream'),
    type: stat.type === 'directory' ? 'dir' : 'file',
  };
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
