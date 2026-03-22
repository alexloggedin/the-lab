// src/api/webdav.ts

import type { DavEntry, FileVersion } from '../types';
import { getRequestToken, REQUEST_TOKEN_HEADER } from '../auth/session';
import { createDavClient } from './davClient';


// ─── Internal helpers ─────────────────────────────────────────────────────

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
  const client = createDavClient();
  const user = (window as any)?.OC?.currentUser ?? 'admin';

  // 'details: true' makes the package return ResponseDataDetailed,
  // which includes raw response properties. We can then look at the
  // parsed props to find oc:fileid.
  //
  // Alternatively, use the custom PROPFIND body to request only fileid:
  const result = await client.getDirectoryContents(
    `/files/${user}/${path}`,
    {
      details: true,
      depth: '0',          // Depth 0 = just this file, no children
      data: `<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns">
  <d:prop><oc:fileid /></d:prop>
</d:propfind>`,
    }
  );

  // With details:true, result.data is FileStat[]
  // The raw props are accessible via result.data[0].props
  const props = (result as any).data?.[0]?.props;
  const fileId = props?.fileid;
  if (!fileId) throw new Error('oc:fileid not found');
  return String(fileId);
};

export const listVersions = async (fileId: string): Promise<FileVersion[]> => {
  const client = createDavClient();
  const user = (window as any)?.OC?.currentUser ?? 'admin';

  const results = await client.getDirectoryContents(
    `/versions/${user}/versions/${fileId}`
  );

  const stats = Array.isArray(results) ? results : results.data;

  // First entry is the versions folder itself — skip it (same as .slice(1))
  return stats.slice(1).map(stat => ({
    versionId: stat.basename,
    href: stat.filename,
    size: stat.size ?? 0,
    modified: Math.floor(new Date(stat.lastmod).getTime() / 1000),
    contentType: stat.mime ?? null,
  }));
};

export const restoreVersion = async (versionHref: string, fileName: string): Promise<void> => {
  const client = createDavClient();
  const user = (window as any)?.OC?.currentUser ?? 'admin';
  const destination = `/versions/${user}/restore/${encodeURIComponent(fileName)}`;

  // moveFile() sends a MOVE request with a Destination header.
  // Docs: https://github.com/perry-mitchell/webdav-client#movefile
  await client.moveFile(versionHref, destination);
};
