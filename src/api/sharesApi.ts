// src/api/sharesApi.js
import { getAuthHeader, getCredentials } from '../auth/authStore.js';
import { OCSParsedResponse, OCSResponseItem } from '../types.js';

// ─── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Build the OCS share API base URL from stored credentials.
 * OCS requests go to the server origin, not through /remote.php.
 */
const ocsBase = async () => {
    const creds = await getCredentials();
    if (!creds) throw new Error('Not authenticated');
    return `${creds.serverUrl}/ocs/v2.php/apps/files_sharing/api/v1/shares`;
};

/**
 * Authenticated fetch for OCS API calls.
 * OCS requires two extra headers beyond Authorization:
 *   OCS-APIRequest: true   — tells Nextcloud this is an API call, not a web UI request
 *   Accept: application/json — returns JSON instead of XML
 */
const ocsFetch = async (url: string, options = {}) => {
    const authHeader = await getAuthHeader();

    console.log('[sharesApi] ocsFetch →', url);

    const res = await fetch(url, {
        ...options,
        credentials: 'omit',
        headers: {
            'OCS-APIRequest': 'true',
            'Accept': 'application/json',
            ...(options.headers ?? {}),
            ...(authHeader ? { Authorization: authHeader } : {}),
        },
    });

    console.log('[sharesApi] response status:', res.status);
    console.log('[sharesApi] response Object:', res);

    return res;
};

/**
 * Parse the OCS response envelope.
 * OCS wraps all responses in: { ocs: { meta: { status, statuscode }, data: [...] } }
 * A statuscode of 100 means success.
 */
const parseOCS = async (res: Response) => {
    const json = await res.json()
    console.log('[sharesApi] JSON response:', JSON.stringify(json).slice(0,200));

    // transform res into OCSResponse Object
    let ocsRes = json as OCSParsedResponse;

    const meta = ocsRes?.ocs?.meta;
    if (!meta) throw new Error('Invalid OCS response structure');
    if (meta.statuscode !== 200) {
        throw new Error(`OCS error ${meta.statuscode}: ${meta.message}`);
    }
    return ocsRes.ocs.data;
};

/**
 * Normalize a raw OCS share object into the shape ShareModal expects.
 * OCS returns a lot of fields — we extract only what P2 needs.
 * 
 * Raw OCS share fields used:
 *   id          — numeric string, unique share identifier
 *   path        — server-relative path, e.g. "/theVault/project/song.wav"
 *   url         — full public share URL, e.g. "https://nc.example.com/s/AbcXyz"
 *   token       — the share token, e.g. "AbcXyz"
 *   item_type   — "file" or "folder"
 *   hide_download — 0 or 1
 */
const normalizeShare = (item: OCSResponseItem) => ({
    id: String(item.id),
    path: item.path,
    url: `${window.location.origin}/share/${item.token}${item.hide_download ? '?hideDownload=1' : ''}`,  //NOTE - Replace NextCloud URL with VaultInstance URL
    token: item.token,
    expiry: item.expiration? item.expiration : '',
    hasPassword: false
});

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * List all shares owned by the current user.
 * Returns an array of normalized share objects.
 *
 * Reference: https://docs.nextcloud.com/server/33/developer_manual/client_apis/OCS/ocs-share-api.html
 */
export const ocsListShares = async () => {
    const base = await ocsBase();
    const res = await ocsFetch(base);

    if (!res.ok) throw new Error(`listShares failed: ${res.status}`);
    const data = await parseOCS(res);

    // OCS returns a single object (not array) when there is only one share
    const shares = Array.isArray(data) ? data : (data ? [data] : []);
    return shares.map(normalizeShare);
};

/**
 * Create a public share link for a file or folder.
 * shareType 3 = public link (no login required for viewer).
 * permissions 1 = read-only.
 *
 * path must be the Nextcloud-relative path with leading slash,
 * e.g. "/theVault/project/song.wav"
 *
 * Reference: https://docs.nextcloud.com/server/33/developer_manual/client_apis/OCS/ocs-share-api.html
 */
export const ocsCreateShare = async ({ path = '', hideDownload = false }) => {
    const base = await ocsBase();

    // OCS create share uses application/x-www-form-urlencoded body
    const body = new URLSearchParams({
        path: path.startsWith('/') ? path : `/${path}`,
        shareType: '3',   // 3 = public link
        permissions: '1',   // 1 = read only
        hideDownload: hideDownload ? '1' : '0',
    });

    console.log('[sharesApi] createShare path:', path);

    const res = await ocsFetch(base, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
    });

    if (!res.ok) throw new Error(`createShare failed: ${res.status}`);
    const raw = await parseOCS(res);

    // Should not expect array here
    let item = raw as OCSResponseItem;

    return normalizeShare(item);
};

/**
 * Delete a share by its numeric ID.
 */
export const ocsDeleteShare = async (id: string) => {
    const base = await ocsBase();
    const res = await ocsFetch(`${base}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`deleteShare failed: ${res.status}`);
    await parseOCS(res);
};


