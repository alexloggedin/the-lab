// src/webdav.js

const davBase = () =>
    window.location.origin; // WebDAV lives at origin, not under /apps/thelab

const currentUser = () =>
    window.OC?.currentUser ?? window.OC?.getCurrentUser()?.uid ?? '';

/**
 * Build the WebDAV files base URL for the current user.
 * e.g. https://cloud.example.com/remote.php/dav/files/admin
 */
export const davFilesUrl = (path = '') => {
    const user = currentUser();
    const base = `${davBase()}/remote.php/dav/files/${encodeURIComponent(user)}`;
    return path ? `${base}/${path.replace(/^\//, '')}` : base;
};

/**
 * Build the WebDAV versions base URL for a given file ID.
 * e.g. https://cloud.example.com/remote.php/dav/versions/admin/versions/12345
 */
export const davVersionsUrl = (fileId) => {
    const user = currentUser();
    return `${davBase()}/remote.php/dav/versions/${encodeURIComponent(user)}/versions/${fileId}`;
};

/**
 * Build the restore target URL for a version MOVE operation.
 * The filename in the restore path must match the original file's name.
 */
export const davRestoreUrl = (fileName) => {
    const user = currentUser();
    return `${davBase()}/remote.php/dav/versions/${encodeURIComponent(user)}/restore/${encodeURIComponent(fileName)}`;
};

/**
 * Parse a WebDAV XML multistatus response body into an array of plain objects.
 * Each <d:response> becomes one object with all its <d:prop> values flattened.
 */
export const parseMultistatus = (xmlText) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');
    const ns = { d: 'DAV:', oc: 'http://owncloud.org/ns' };

    const resolve = (tag, namespace) =>
        doc.createElementNS ? namespace : tag; // guard for environments without NS support

    return Array.from(doc.getElementsByTagNameNS('DAV:', 'response')).map(response => {
        const href = response.getElementsByTagNameNS('DAV:', 'href')[0]?.textContent ?? '';
        const propstat = response.getElementsByTagNameNS('DAV:', 'propstat')[0];
        const props = propstat?.getElementsByTagNameNS('DAV:', 'prop')[0];

        const get = (ns, local) =>
            props?.getElementsByTagNameNS(ns, local)[0]?.textContent ?? null;

        return {
            href,
            lastModified: get('DAV:', 'getlastmodified'),
            contentLength: get('DAV:', 'getcontentlength'),
            contentType: get('DAV:', 'getcontenttype'),
            fileId: get('http://owncloud.org/ns', 'fileid'),
        };
    });
};

/**
 * Get the oc:fileid for a file at the given user-relative path.
 * e.g. getFileId('theLAB/mysong.wav') → '42'
 *
 * Source: https://docs.nextcloud.com/server/latest/developer_manual/client_apis/WebDAV/basic.html
 */
export const getFileId = async (path) => {
    const url = davFilesUrl(path);
    const body = `<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns">
  <d:prop>
    <oc:fileid />
  </d:prop>
</d:propfind>`;

    const res = await fetch(url, {
        method: 'PROPFIND',
        headers: {
            'Content-Type': 'application/xml',
            'Depth': '0',
            'requesttoken': window.OC?.requestToken ?? '',
        },
        body,
    });

    if (!res.ok) throw new Error(`PROPFIND failed: ${res.status}`);
    const xml = await res.text();
    const entries = parseMultistatus(xml);
    const fileId = entries[0]?.fileId;
    if (!fileId) throw new Error('oc:fileid not found in PROPFIND response');
    return fileId;
};

/**
 * List all versions for a file, identified by its oc:fileid.
 *
 * Source: https://docs.nextcloud.com/server/stable/developer_manual/client_apis/WebDAV/versions.html
 */
export const listVersions = async (fileId) => {
    const url = davVersionsUrl(fileId);
    const res = await fetch(url, {
        method: 'PROPFIND',
        headers: {
            'Content-Type': 'application/xml',
            'Depth': '1',
            'requesttoken': window.OC?.requestToken ?? '',
        },
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
    const xml = await res.text();
    const entries = parseMultistatus(xml);

    // The first entry in a Depth:1 PROPFIND is always the collection itself — skip it
    return entries.slice(1).map(entry => ({
        // The version "name" in the href is its Unix timestamp — that is the version ID
        versionId: entry.href.split('/').pop(),
        href: entry.href,
        size: entry.contentLength ? parseInt(entry.contentLength, 10) : 0,
        // lastModified is an RFC 7231 date string — convert to Unix seconds for consistency
        modified: entry.lastModified ? Math.floor(new Date(entry.lastModified).getTime() / 1000) : 0,
        contentType: entry.contentType,
    }));
};

/**
 * Build a URL for streaming (GET) a specific version directly.
 * The version href from PROPFIND is a root-relative path — prepend origin to make it absolute.
 *
 * Source: https://docs.nextcloud.com/server/stable/developer_manual/client_apis/WebDAV/versions.html
 */
export const versionStreamUrl = (versionHref) =>
    `${davBase()}${versionHref}`;

/**
 * Restore a file to a previous version using a WebDAV MOVE.
 * The version resource is moved to the restore collection.
 *
 * Source: https://docs.nextcloud.com/server/stable/developer_manual/client_apis/WebDAV/versions.html
 */
export const restoreVersion = async (versionHref, fileName) => {
    const source = `${davBase()}${versionHref}`;
    const destination = davRestoreUrl(fileName);

    const res = await fetch(source, {
        method: 'MOVE',
        headers: {
            'Destination': destination,
            'requesttoken': window.OC?.requestToken ?? '',
        },
    });

    if (!res.ok) throw new Error(`MOVE (restore) failed: ${res.status}`);
};
