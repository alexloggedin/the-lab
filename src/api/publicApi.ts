import type { FileStat } from 'webdav';
import type { VaultFile, ShareInfo } from '../types';
import { createPublicDavClient } from './davClient';

// ─── Public DAV client factory ────────────────────────────────────────────────
//
// Public shares use a completely different DAV base URL from the authenticated
// client: /public.php/dav instead of /remote.php/dav.
//
// Auth works differently too: there is no session cookie. Instead, the share
// token acts as the username in a Basic auth header, with an empty password.
// btoa('token:') produces the correct base64 string.
//
// The webdav package handles this automatically when you pass username/password
// to createClient — it adds the Authorization header to every request.
//
// Ref: https://docs.nextcloud.com/server/33/developer_manual/client_apis/WebDAV/basic.html#public-shares


// ─── URL builder ──────────────────────────────────────────────────────────────
//
// Used by AudioPlayer and VideoPlayer when they need a URL to stream from.
// This is a plain string — not a DAV client call — because the browser's
// <audio>/<video> element fetches the URL itself using its own credentials logic.
// We export getPublicAuthHeader separately so those components can pass it
// as a fetch header when building blob URLs.

export function publicStreamUrl(token: string, fileName: string | null = null): string {
  const base = `/public.php/dav/files/${encodeURIComponent(token)}`;
  if (!fileName) return `${base}/`;
  return `${base}/${encodeURIComponent(fileName)}`;
}

export function getPublicAuthHeader(token: string | undefined): string {
  return `Basic ${btoa(`${token ?? ''}:`)}`;
}

// ─── FileStat → VaultFile mapper ──────────────────────────────────────────────
//
// The webdav package returns FileStat objects. For public shares the 'filename'
// field is relative to the DAV base (/public.php/dav), so it looks like:
//   /files/<token>/track_01.wav
// We just want the bare filename for display, which is stat.basename.
// For the path we also use basename because in a public share context the
// "path" is just the filename — there's no user-relative folder hierarchy.

function publicFileStatToVaultFile(stat: FileStat): VaultFile {
  return {
    name: stat.basename,
    path: stat.basename,
    size: stat.size ?? 0,
    modified: Math.floor(new Date(stat.lastmod).getTime() / 1000),
    mimetype: stat.type === 'directory'
      ? 'httpd/unix-directory'
      : (stat.mime ?? 'application/octet-stream'),
    type: stat.type === 'directory' ? 'dir' : 'file',
  };
}

// ─── Exported functions ───────────────────────────────────────────────────────

async function getShareInfo(token: string): Promise<ShareInfo> {
  const client = createPublicDavClient(token);

  // stat() sends a PROPFIND with Depth:0 — just the root of the share.
  // This tells us whether the share is a file or folder, and its MIME type.
  // If the share token is invalid or expired, Nextcloud returns 404 and
  // the package throws an error with a status property.
  //
  // Ref: https://docs.nextcloud.com/server/33/developer_manual/client_apis/WebDAV/basic.html
  let statResult: FileStat;
  try {
    statResult = await client.stat(`/files/${encodeURIComponent(token)}/`,) as FileStat;
  } catch (err: any) {
    if (err?.status === 404 || err?.response?.status === 404) {
      throw new Error('Share not found or has expired');
    }
    throw new Error(`getShareInfo failed: ${err?.message ?? err}`);
  }

  const isFolder = statResult.type === 'directory';

  return {
    token,
    fileName: statResult.basename ?? token,
    mimetype: isFolder ? 'httpd/unix-directory' : (statResult.mime ?? 'application/octet-stream'),
    isFolder,
    hideDownload: false,
  };
}

async function listShareContents(token: string): Promise<VaultFile[]> {
  const client = createPublicDavClient(token);

  // getDirectoryContents sends a PROPFIND with Depth:1 automatically.
  // It returns the folder itself as the first entry, then its children.
  // We slice(1) to skip the folder root entry — same reasoning as the
  // authenticated getFiles function in api.ts.
  const results = await client.getDirectoryContents(
    `/files/${encodeURIComponent(token)}/`
  );

  const stats = Array.isArray(results) ? results : results.data;

  return stats
    .slice(1)                                          // skip the folder root itself
    .filter(stat => stat.type !== 'directory')         // flat list — no subdirectories
    .map(publicFileStatToVaultFile);
}

export { getShareInfo, listShareContents };