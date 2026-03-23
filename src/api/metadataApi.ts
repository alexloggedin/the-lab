import { createInternalDavClient } from './davClient';
import type { FileMetadata } from '../types';

const client = createInternalDavClient();
const user = () => (window as any)?.OC?.currentUser ?? 'admin';

// The XML namespace for our custom properties.
// Must be consistent across all PROPFIND and PROPPATCH calls.
const TV_NS = 'https://thevault.app/ns';

/**
 * PROPFIND request body that asks for our three custom properties.
 * The webdav package's getDirectoryContents() doesn't support custom
 * properties directly, so we use a raw fetch via the client's customRequest.
 *
 * Reference:
 * https://docs.nextcloud.com/server/33/developer_manual/client_apis/WebDAV/basic.html
 */
const PROPFIND_BODY = `<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="DAV:" xmlns:tv="${TV_NS}">
  <d:prop>
    <tv:bpm />
    <tv:key />
    <tv:genre />
  </d:prop>
</d:propfind>`;

/**
 * Read metadata for a single file.
 * Sends a PROPFIND with Depth:0 to the file's DAV path.
 *
 * Returns an empty object if no metadata has been set yet —
 * that's not an error, it just means the file hasn't been tagged.
 */
export async function getFileMeta(path: string): Promise<FileMetadata> {
  const davPath = `/files/${user()}/${path}`;

  const response = await client.customRequest(davPath, {
    method: 'PROPFIND',
    headers: {
      'Depth': '0',
      'Content-Type': 'application/xml',
    },
    data: PROPFIND_BODY,
  });

  // The response body is XML. We parse it to extract our custom props.
  // The webdav package returns the raw response body as a string when
  // you use customRequest — we parse it ourselves.
  const xml = response.data as string;
  return parsePropfindResponse(xml);
}

/**
 * Write metadata for a single file using PROPPATCH.
 * Only the fields present in `meta` are written.
 * To clear a field, pass an empty string.
 *
 * Reference:
 * https://docs.nextcloud.com/server/33/developer_manual/client_apis/WebDAV/basic.html#accessing-and-modifying-file-properties-using-propfind-and-proppatch
 */
export async function setFileMeta(path: string, meta: Partial<FileMetadata>): Promise<void> {
  const davPath = `/files/${user()}/${path}`;

  const propElements = Object.entries(meta)
    .map(([key, value]) => `<tv:${key}>${escapeXml(String(value ?? ''))}</tv:${key}>`)
    .join('\n    ');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<d:propertyupdate xmlns:d="DAV:" xmlns:tv="${TV_NS}">
  <d:set>
    <d:prop>
    ${propElements}
    </d:prop>
  </d:set>
</d:propertyupdate>`;

  await client.customRequest(davPath, {
    method: 'PROPPATCH',
    headers: { 'Content-Type': 'application/xml' },
    data: body,
  });
}

// ─── XML parsing helpers ───────────────────────────────────────────────────────

/**
 * Parse the PROPFIND XML response and extract our custom properties.
 * 
 * The response structure looks like:
 * <d:multistatus>
 *   <d:response>
 *     <d:propstat>
 *       <d:prop>
 *         <tv:bpm>128</tv:bpm>
 *         <tv:key>Am</tv:key>
 *       </d:prop>
 *     </d:propstat>
 *   </d:response>
 * </d:multistatus>
 *
 * We use the browser's built-in DOMParser rather than a library,
 * which avoids adding a dependency.
 */
function parsePropfindResponse(xml: string): FileMetadata {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');

  const getTextContent = (tagLocalName: string): string => {
    // getElementsByTagNameNS with the TV namespace finds our custom elements
    const elements = doc.getElementsByTagNameNS(TV_NS, tagLocalName);
    return elements[0]?.textContent?.trim() ?? '';
  };

  return {
    bpm:   getTextContent('bpm')   || undefined,
    key:   getTextContent('key')   || undefined,
    genre: getTextContent('genre') || undefined,
  };
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}