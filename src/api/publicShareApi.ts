// src/api/publicShareApi.js

import { VaultFile } from "../types";

/**
 * Build the public DAV base URL for a given share token.
 * Public DAV lives at /public.php/dav/files/:token/
 *
 * Reference: https://docs.nextcloud.com/server/33/developer_manual/client_apis/WebDAV/public-shares.html
 */
const publicDavBase = (token: string) =>
  `/public.php/dav/files/${encodeURIComponent(token)}`;

/**
 * Build the Authorization header for a public share.
 * Public DAV uses Basic Auth where username = token, password = empty string.
 */
const publicAuthHeader = (token: string) =>
  `Basic ${btoa(`${token}:`)}`;

/**
 * Fetch wrapper for public DAV requests.
 * No authStore dependency — uses the share token directly.
 */
const publicFetch = async (url: string, token: string, options = {}) => {
  console.log('[publicShareApi] fetch →', url);

  const res = await fetch(url, {
    ...options,
    credentials: 'omit',
    headers: {
      ...( options.headers ?? {}),
      Authorization: publicAuthHeader(token),
    },
  });

  console.log('[publicShareApi] status:', res.status);
  return res;
};

/**
 * Fetch share info for a single-file share.
 * We do a Depth:0 PROPFIND on the share root to get file metadata.
 * Returns a normalized object matching what ShareView expects.
 *
 * For folders, we do a Depth:1 PROPFIND to get the folder name.
 */
export const getShareInfo = async (token: string) => {
  const url = `${publicDavBase(token)}/`;

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="DAV:">
  <d:prop>
    <d:getcontenttype />
    <d:getcontentlength />
    <d:resourcetype />
    <d:displayname />
  </d:prop>
</d:propfind>`;

  const res = await publicFetch(url, token, {
    method: 'PROPFIND',
    headers: { 'Content-Type': 'application/xml', 'Depth': '0' },
    body,
  });

  if (res.status === 404) throw new Error('Share not found or has expired');
  if (!res.ok) throw new Error(`getShareInfo failed: ${res.status}`);

  const xml      = await res.text();
  console.log('[publicShareApi] getShareInfo XML:', xml.slice(0, 300));

  const parser   = new DOMParser();
  const doc      = parser.parseFromString(xml, 'application/xml');
  const response = doc.getElementsByTagNameNS('DAV:', 'response')[0];
  const props    = response
    ?.getElementsByTagNameNS('DAV:', 'propstat')[0]
    ?.getElementsByTagNameNS('DAV:', 'prop')[0];

  const get = (ns: string, local: string) =>
    props?.getElementsByTagNameNS(ns, local)[0]?.textContent ?? null;

  const resourceType = response?.getElementsByTagNameNS('DAV:', 'resourcetype')[0];
  const isFolder     = !!resourceType?.getElementsByTagNameNS('DAV:', 'collection')[0];
  const contentType  = get('DAV:', 'getcontenttype');
  const displayName  = get('DAV:', 'displayname');

  return {
    token,
    fileName:     displayName ?? token,
    mimetype:     isFolder ? 'httpd/unix-directory' : (contentType ?? 'application/octet-stream'),
    isFolder,
    // hideDownload is NOT available from DAV — it must be stored separately (see Step 7)
    hideDownload: false,
  };
};

/**
 * List the files inside a shared folder (flat — no subdirectory traversal).
 * Returns an array of file objects matching the shape FileRow expects.
 */
export const listShareContents = async (token: string) => {
  const url  = `${publicDavBase(token)}/`;
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="DAV:">
  <d:prop>
    <d:getcontenttype />
    <d:getcontentlength />
    <d:getlastmodified />
    <d:resourcetype />
    <d:displayname />
  </d:prop>
</d:propfind>`;

  const res = await publicFetch(url, token, {
    method: 'PROPFIND',
    headers: { 'Content-Type': 'application/xml', 'Depth': '1' },
    body,
  });

  if (!res.ok) throw new Error(`listShareContents failed: ${res.status}`);

  const xml    = await res.text();
  const parser = new DOMParser();
  const doc    = parser.parseFromString(xml, 'application/xml');

  const parsedData = Array.from(doc.getElementsByTagNameNS('DAV:', 'response'))
    .slice(1) // skip the collection itself (first entry at Depth:1)
    .map(response => {
      const props = response
        ?.getElementsByTagNameNS('DAV:', 'propstat')[0]
        ?.getElementsByTagNameNS('DAV:', 'prop')[0];

      const get = (ns: string, local: string) =>
        props?.getElementsByTagNameNS(ns, local)[0]?.textContent ?? null;

      const resourceType = response.getElementsByTagNameNS('DAV:', 'resourcetype')[0];
      const isFolder     = !!resourceType?.getElementsByTagNameNS('DAV:', 'collection')[0];

      if (isFolder) return null; // skip subdirectories — flat list only

      const displayName  = get('DAV:', 'displayname');
      const contentType  = get('DAV:', 'getcontenttype');
      const contentLength = get('DAV:', 'getcontentlength');
      const lastModified = get('DAV:', 'getlastmodified');

      return {
        name:     displayName ?? '',
        path:     displayName ?? '', // for public shares, path is just the filename
        size:     contentLength ? parseInt(contentLength, 10) : 0,
        modified: lastModified ? Math.floor(new Date(lastModified).getTime() / 1000) : 0,
        mimetype: contentType ?? 'application/octet-stream',
        type:     'file',
      };
    })
    .filter(Boolean); // remove null entries (subdirectories)

    return parsedData as VaultFile[];
};  

/**
 * Build the URL for streaming a file via a public share.
 * For single-file shares: /public.php/dav/files/:token/
 * For files within a folder share: /public.php/dav/files/:token/:filename
 */
export const publicStreamUrl = (token: string, fileName: string|null = null ) => {
  const base = publicDavBase(token);
  if (!fileName) return `${base}/`;
  return `${base}/${encodeURIComponent(fileName)}`;
};

/**
 * Build the Authorization header for use in fetch calls on the share page.
 * Exported so AudioPlayer/VideoPlayer can use it for blob fetching.
 */
export const getPublicAuthHeader = (token: string) => publicAuthHeader(token);
