import type { VaultFile, FileMetadata, ShareLink, ShareInfo, ApiResponse, DavEntry } from '../types';
import { USE_MOCK } from '../dev/useMockData';
import { mockFiles, mockFolders, mockMetadata, mockShareLinks } from '../dev/fixtures';
import { davFilesUrl } from './versionApi';
import { ocsListShares, ocsCreateShare, ocsDeleteShare } from './sharesApi';
import { getShareInfo, listShareContents, publicStreamUrl as buildPublicStreamUrl } from './publicApi';
import type { FileStat } from 'webdav';
import { createInternalDavClient } from './davClient';

const client = createInternalDavClient();
const user = (window as any)?.OC?.currentUser ?? 'admin';

// ─── External API helpers ─────────────────────────────────────────────────────
// ─── Individual function declarations ────────────────────────────────────────

function initVault(): Promise<void | ApiResponse<{ success: boolean }>> {
  return USE_MOCK
    ? Promise.resolve({ data: { success: true } })
    : ensureVaultFolder();
}

//TODO - Refactor this code so that it renders a list of all files from all folders
async function getFiles(path = 'theVault'): Promise<ApiResponse<VaultFile[]>> {
  if (USE_MOCK) {
    return { data: path !== 'theVault' ? mockFiles : mockFolders };
  }

  const results = await client.getDirectoryContents(`/files/${user}/${path}`);
  const stats = Array.isArray(results) ? results : results.data;
  const files = stats.map(fileStatToVaultFile);

  const filtered = path === 'theVault'
    ? files.filter(f => f.type === 'dir')
    : files.filter(f => f.type === 'file');

  return { data: filtered };
}

async function getAllFiles(): Promise<ApiResponse<VaultFile[]>> {
  if (USE_MOCK) return { data: mockFiles };

  const user = (window as any)?.OC?.currentUser ?? 'admin';

  // Step 1: fetch the top-level theVault folder to get all project folders
  const foldersResult = await client.getDirectoryContents(`/files/${user}/theVault`);
  const folderStats = Array.isArray(foldersResult) ? foldersResult : foldersResult.data;

  //TODO - Modify to accept files in the main folder
  const folders = folderStats.filter(s => s.type === 'directory');
  console.log(`[api] getAllFiles first fetch list: `, folders);

  const perFolderResults = await Promise.all(
    folders.map(folder =>
      client
        .getDirectoryContents(folder.filename)
        .then(res => {
          console.log(`[api] getAllFiles second fetch: ${folder.filename}: `, folder)
          const stats = Array.isArray(res) ? res : res.data;
          return stats;
        })
        .catch(err => {
          // If one folder fails, log it but don't crash the whole list.
          // Return an empty array so Promise.all can still resolve.
          console.error(`[api] getAllFiles: failed to fetch ${folder.filename}:`, err);
          return [];
        })
    )
  );

  // Step 3: flatten the array of arrays into a single file list
  // [[file1, file2], [file3]] → [file1, file2, file3]
  const allFiles = perFolderResults
    .flat()
    .map(fileStatToVaultFile);

  return { data: allFiles };
}


function streamUrl(path: string): Promise<string> {
  if (USE_MOCK) return Promise.resolve('/mock-audio/test.wav');
  return Promise.resolve(davFilesUrl(path));
}

function getMetadata(_path?: string): Promise<ApiResponse<FileMetadata>> {
  return USE_MOCK
    ? Promise.resolve({ data: mockMetadata })
    : Promise.resolve({ data: {} });
}

function updateMetadata(
  _path?: string,
  _meta?: Partial<FileMetadata>
): Promise<ApiResponse<{ success: boolean }>> {
  return Promise.resolve({ data: { success: true } });
}

function getShares(): Promise<ApiResponse<ShareLink[]>> {
  return USE_MOCK
    ? Promise.resolve({ data: mockShareLinks })
    : ocsListShares().then(data => ({ data }));
}

function createShare(
  path: string,
  hideDownload: boolean
): Promise<ApiResponse<ShareLink>> {
  return USE_MOCK
    ? Promise.resolve({ data: mockShareLinks[0] })
    : ocsCreateShare({ path, hideDownload }).then(data => ({ data }));
}

function deleteShare(id: string): Promise<ApiResponse<{ success: boolean }>> {
  return USE_MOCK
    ? Promise.resolve({ data: { success: true } })
    : ocsDeleteShare(id).then(() => ({ data: { success: true } }));
}

function getShareByToken(token: string): Promise<ApiResponse<ShareInfo>> {
  return USE_MOCK
    ? getMockShareInfoFromToken(token)
    : getShareInfo(token).then(data => ({ data }));
}

function getShareContents(token: string): Promise<ApiResponse<VaultFile[]>> {
  return USE_MOCK
    ? Promise.resolve({ data: mockFiles })
    : listShareContents(token).then(data => ({ data }));
}

function publicStreamUrl(
  token: string,
  fileName: string | null = null
): string {
  return USE_MOCK
    ? '/mock-audio/test.wav'
    : buildPublicStreamUrl(token, fileName);
}

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

// --- Helpers
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

// ─── API object — a clean manifest of available functions ────────────────────

export const api = {
  initVault,
  getFiles,
  getAllFiles,
  streamUrl,
  getMetadata,
  updateMetadata,
  getShares,
  createShare,
  deleteShare,
  getShareByToken,
  getShareContents,
  publicStreamUrl,
};
