import type { FileStat, WebDAVClient } from 'webdav';
import type { FileVersion, VaultFile } from '../types';
import { createInternalDavClient } from './davClient';

// ─── Authenticated DAV client factory ────────────────────────────────────────
//
// The base URL is /remote.php/dav — the root of all authenticated DAV
// operations in Nextcloud. Paths passed to client methods are relative
// to this base, so /files/admin/theVault becomes the full URL:
//   /remote.php/dav/files/admin/theVault
//
// Auth is handled by the browser session cookie via credentials: 'include'.
// There is no username/password here — Nextcloud's session middleware
// reads the cookie and identifies the user automatically.
//
// The requesttoken header is Nextcloud's CSRF protection. It must be present
// on all state-changing requests (POST, PUT, DELETE, MOVE, MKCOL, PROPFIND).
//
// Ref: https://docs.nextcloud.com/server/33/developer_manual/digging_deeper/csrf.html
// Ref: https://docs.nextcloud.com/server/33/developer_manual/client_apis/WebDAV/basic.html

const client = createInternalDavClient();
const user = encodeURIComponent((window as any)?.OC?.currentUser ?? 'admin');

// ─── URL builders ─────────────────────────────────────────────────────────────
//
// These build root-relative paths used both as DAV client paths and as
// direct browser fetch URLs (e.g. for streaming audio via AudioPlayer).
// They are exported because api.ts imports davFilesUrl for streamUrl().

export function davFilesUrl(path = ''): string {
  const base = `/remote.php/dav/files/${user}`;
  if (!path) return base;

  const encodedPath = path
    .replace(/^\//, '')
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');

  return `${base}/${encodedPath}`;
}

// versionStreamUrl is exported so VersionHistory can build a URL to pass
// to AudioPlayer for blob fetching. It's just a string — no network call.
export function versionStreamUrl(versionHref: string): string {
  return versionHref;
}

// ─── FileStat → VaultFile mapper ──────────────────────────────────────────────
//
// The webdav package returns FileStat objects after parsing PROPFIND XML.
// This function normalises them into the VaultFile shape the app uses.
// 'filename' from FileStat is a full DAV path like:
//   /files/admin/theVault/ep-demos/track.wav
// We strip the /files/{user}/ prefix to get the user-relative path.

export function fileStatToVaultFile(stat: FileStat): VaultFile {
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
}

// ─── getFileId ────────────────────────────────────────────────────────────────
//
// Resolves a user-relative file path to Nextcloud's internal numeric file ID.
// This ID is needed to query the versions endpoint, which is keyed by file ID
// rather than path.
//
// oc:fileid is a Nextcloud-specific property under the owncloud namespace —
// it is NOT included in a default PROPFIND response. We have to request it
// explicitly by passing a custom XML body via the 'data' option.
//
// The 'details: true' option makes the package return ResponseDataDetailed,
// whose .data entries include a 'props' object containing the custom properties
// we requested. Without details:true, custom props are silently dropped.
//
// Ref: https://docs.nextcloud.com/server/33/developer_manual/client_apis/WebDAV/basic.html#requesting-properties

export async function getFileId(path: string): Promise<string> {

  const result = await client.getDirectoryContents(
    `/files/${user}/${path}`,
    {
      details: true,
      depth: '0',
      data: `<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns">
  <d:prop>
    <oc:fileid />
  </d:prop>
</d:propfind>`,
    }
  );

  // With details:true the return type is ResponseDataDetailed<FileStat[]>.
  // The custom oc:fileid prop is accessible on stat.props — this isn't in
  // the FileStat type definition so we cast through unknown to reach it.
  const stats = (result as any).data as FileStat[];
  const fileId = (stats[0] as any)?.props?.fileid;

  if (!fileId) throw new Error('oc:fileid not found in PROPFIND response');
  return String(fileId);
}

// ─── listVersions ─────────────────────────────────────────────────────────────
//
// Lists all stored versions of a file using the file's numeric ID.
// The versions DAV endpoint lives at a different path from the files endpoint:
//   /remote.php/dav/versions/{user}/versions/{fileId}
//
// The same authenticated client handles this because the base URL is
// /remote.php/dav — we just navigate to a different subtree of it.
//
// The first entry returned by getDirectoryContents is the versions folder
// itself (Depth:1 always includes the root). We slice(1) to skip it,
// exactly as we do in api.ts getFiles().
//
// Ref: https://docs.nextcloud.com/server/33/developer_manual/client_apis/WebDAV/versions.html

export async function listVersions(fileId: string): Promise<FileVersion[]> {

  const results = await client.getDirectoryContents(
    `/versions/${user}/versions/${encodeURIComponent(fileId)}`
  );

  const stats = Array.isArray(results) ? results : results.data;

  return stats.slice(1).map(stat => ({
    versionId: stat.basename,
    href: stat.filename,
    size: stat.size ?? 0,
    modified: Math.floor(new Date(stat.lastmod).getTime() / 1000),
    contentType: stat.mime ?? null,
  }));
}

// ─── restoreVersion ───────────────────────────────────────────────────────────
//
// Restores a previous version by MOVEing it to the special restore folder.
// Nextcloud treats any MOVE into /versions/{user}/restore/ as a restore
// operation — the server handles replacing the current file automatically.
//
// moveFile() in the webdav package sends a MOVE request with a Destination
// header. Both source and destination are paths relative to the DAV base URL
// /remote.php/dav, so we don't include that prefix here.
//
// Ref: https://docs.nextcloud.com/server/33/developer_manual/client_apis/WebDAV/versions.html#restoring-a-version

export async function restoreVersion(versionHref: string, fileName: string): Promise<void> {

  // versionHref arrives as a full DAV path from the PROPFIND response, e.g.:
  //   /remote.php/dav/versions/admin/versions/42/1700000000
  // moveFile() expects paths relative to the base URL /remote.php/dav, so
  // we strip the prefix before passing it in.
  const sourcePath = versionHref.replace('/remote.php/dav', '');
  const destinationPath = `/versions/${encodeURIComponent(user)}/restore/${encodeURIComponent(fileName)}`;

  await client.moveFile(sourcePath, destinationPath);
}