import { createClient } from 'webdav';
import { getRequestToken } from '../auth/session';

/**
 * Creates a webdav client configured for Nextcloud session auth.
 *
 * Key decisions:
 * - Base URL is /remote.php/dav — the root of all DAV operations
 * - No username/password — the browser session cookie handles auth
 * - requesttoken header satisfies Nextcloud's CSRF requirement
 *
 * Docs: https://docs.nextcloud.com/server/33/developer_manual/client_apis/WebDAV/basic.html
 */

export function createDavClient(userSession: Boolean = true) {
  if (userSession) {
    return createClient('/remote.php/dav', {
      headers: {
        requesttoken: getRequestToken(),
      },
    })
  } else {
    return createClient('/public.php/dav', {
      headers: {
        requesttoken: getRequestToken(),
      },
    })
  }
}

const getRequestToken = (): string => {
  if (typeof window !== 'undefined' && (window as any).OC?.requestToken) {
    return (window as any).OC.requestToken;
  }
  // In mock/dev mode window.OC.requestToken is set to 'mock-token' in index.html
  return 'mock-token';
};

