import { getRequestToken } from './davClient';
import type { OCSParsedResponse, OCSResponseItem } from '../types';

const OCS_BASE = '/ocs/v2.php/apps/files_sharing/api/v1/shares';

// ─── OCS fetch wrapper ────────────────────────────────────────────────────────
//
// OCS is Nextcloud's REST API layer — it is NOT WebDAV, so the webdav package
// doesn't apply here. OCS speaks form-encoded POST bodies and returns JSON.
//
// Two headers are always required:
//   OCS-APIRequest: true    — tells Nextcloud this is an API call, not a page load
//   requesttoken: <token>   — CSRF protection for all state-changing requests
//
// Ref: https://docs.nextcloud.com/server/33/developer_manual/client_apis/OCS/ocs-api-overview.html

async function ocsFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const method = (options.method ?? 'GET').toUpperCase();
  console.log(`[sharesApi] ${method} ${url}`);

  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'OCS-APIRequest': 'true',
      'Accept': 'application/json',
      'requesttoken': getRequestToken(),
      ...(options.headers ?? {}),
    },
  });

  console.log('[sharesApi] response status:', res.status);
  return res;
}

// ─── Response parser ──────────────────────────────────────────────────────────
//
// OCS wraps every response in { ocs: { meta: {...}, data: {...} } }.
// A statuscode of 200 means success. Any other code is treated as an error.
// We parse the JSON once here so individual functions don't have to.

async function parseOCS(res: Response): Promise<OCSResponseItem | OCSResponseItem[]> {
  const json = await res.json();
  console.log('[sharesApi] JSON response:', JSON.stringify(json).slice(0, 200));

  const ocsRes = json as OCSParsedResponse;
  const meta = ocsRes?.ocs?.meta;
  if (!meta) throw new Error('Invalid OCS response structure');
  if (meta.statuscode !== 200) {
    throw new Error(`OCS error ${meta.statuscode}: ${meta.message}`);
  }
  return ocsRes.ocs.data;
}

// ─── Shape normalizer ─────────────────────────────────────────────────────────
//
// The OCS API returns share objects with snake_case keys (item_type, hide_download).
// We normalize them to the camelCase ShareLink shape the rest of the app expects.
//
// The share URL is constructed from window.location.origin + the token, because
// Nextcloud returns an absolute URL using its own origin, which won't work in
// dev mode where the app is served from localhost:5173.

function normalizeShare(item: OCSResponseItem) {
  return {
    id: String(item.id),
    path: item.path,
    url: `${window.location.origin}/share/${item.token}${item.hide_download ? '?hideDownload=1' : ''}`,
    token: item.token,
    expiry: item.expiration ?? '',
    hasPassword: false,
  };
}

// ─── Exported functions ───────────────────────────────────────────────────────

async function ocsListShares() {
  const res = await ocsFetch(OCS_BASE);
  if (!res.ok) throw new Error(`listShares failed: ${res.status}`);

  const data = await parseOCS(res);
  const shares = Array.isArray(data) ? data : (data ? [data] : []);
  return shares.map(normalizeShare);
}

async function ocsCreateShare({ path = '', hideDownload = false }) {
  // shareType 3 = public link share
  // permissions 1 = read-only (correct default for public links)
  // hideDownload is passed as a URL param and also via share attributes below
  //
  // Ref: https://docs.nextcloud.com/server/33/developer_manual/client_apis/OCS/ocs-share-api.html#create-a-new-share
  const body = new URLSearchParams({
    path: path.startsWith('/') ? path : `/${path}`,
    shareType: '3',
    permissions: '1',
    hideDownload: hideDownload ? '1' : '0',
  });

  console.log('[sharesApi] createShare path:', path);

  const res = await ocsFetch(OCS_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) throw new Error(`createShare failed: ${res.status}`);
  const raw = await parseOCS(res);
  return normalizeShare(raw as OCSResponseItem);
}

async function ocsDeleteShare(id: string) {
  // DELETE /shares/<share_id>
  // Ref: https://docs.nextcloud.com/server/33/developer_manual/client_apis/OCS/ocs-share-api.html#delete-share
  const res = await ocsFetch(`${OCS_BASE}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`deleteShare failed: ${res.status}`);
  await parseOCS(res);
}

export { ocsListShares, ocsCreateShare, ocsDeleteShare };