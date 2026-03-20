// src/api/sharesApi.ts

import { getRequestToken, REQUEST_TOKEN_HEADER } from '../auth/session';
import type { OCSParsedResponse, OCSResponseItem } from '../types';

/**
 * Fetch wrapper for OCS API calls.
 *
 * OCS (Open Collaboration Services) is Nextcloud's REST API layer.
 * It requires:
 *   OCS-APIRequest: true   — identifies this as an API call
 *   Accept: application/json — returns JSON not XML
 *   RequestVerificationToken — CSRF token for mutating requests
 *
 * Session cookie is sent via credentials: 'include'.
 *
 * Reference: https://docs.nextcloud.com/server/33/developer_manual/client_apis/OCS/ocs-api-overview.html
 */
const ocsFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const method = (options.method ?? 'GET').toUpperCase();
  console.log(`[sharesApi] ${method} ${url}`);

  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'OCS-APIRequest': 'true',
      'Accept': 'application/json',
      ...(options.headers ?? {}),
      'requesttoken' : getRequestToken(),
    },
  });

  console.log('[sharesApi] response status:', res.status);
  return res;
};

const OCS_BASE = '/ocs/v2.php/apps/files_sharing/api/v1/shares';

const parseOCS = async (res: Response) => {
  const json = await res.json();
  console.log('[sharesApi] JSON response:', JSON.stringify(json).slice(0, 200));

  const ocsRes = json as OCSParsedResponse;
  const meta = ocsRes?.ocs?.meta;
  if (!meta) throw new Error('Invalid OCS response structure');
  if (meta.statuscode !== 200) {
    throw new Error(`OCS error ${meta.statuscode}: ${meta.message}`);
  }
  return ocsRes.ocs.data;
};

const normalizeShare = (item: OCSResponseItem) => ({
  id: String(item.id),
  path: item.path,
  url: `${window.location.origin}/share/${item.token}${item.hide_download ? '?hideDownload=1' : ''}`,
  token: item.token,
  expiry: item.expiration ?? '',
  hasPassword: false,
});

export const ocsListShares = async () => {
  const res = await ocsFetch(OCS_BASE);
  if (!res.ok) throw new Error(`listShares failed: ${res.status}`);
  const data = await parseOCS(res);
  const shares = Array.isArray(data) ? data : (data ? [data] : []);
  return shares.map(normalizeShare);
};

export const ocsCreateShare = async ({ path = '', hideDownload = false }) => {
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
};

export const ocsDeleteShare = async (id: string) => {
  const res = await ocsFetch(`${OCS_BASE}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`deleteShare failed: ${res.status}`);
  await parseOCS(res);
};
