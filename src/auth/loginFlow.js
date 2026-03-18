// src/auth/loginFlow.js

const APP_NAME = 'theVault';

/**
 * Step 1: POST to /index.php/login/v2 to initiate Login Flow V2.
 * Returns { poll: { token, endpoint }, login: <url to open for the user> }
 *
 * Reference: https://docs.nextcloud.com/server/33/developer_manual/client_apis/LoginFlow/index.html#login-flow-v2
 */
export const initiateLoginFlow = async (serverUrl) => {
  const url = `${serverUrl}/index.php/login/v2`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'User-Agent': APP_NAME },
  });

  if (!res.ok) {
    throw new Error(
      `Could not reach Nextcloud at ${serverUrl}. ` +
      `Check the URL and confirm the server is reachable. (${res.status})`
    );
  }

  const data = await res.json();

  if (!data?.poll?.token || !data?.poll?.endpoint || !data?.login) {
    throw new Error('Unexpected response from Nextcloud. Is this a Nextcloud server?');
  }

  return data;
};

/**
 * Step 3: Poll the endpoint with the poll token.
 * Returns credentials object on success, null if not yet authenticated.
 * Throws on hard errors.
 *
 * Nextcloud returns:
 *   200 → { server, loginName, appPassword }
 *   404 → not yet authenticated, keep polling
 */
export const pollForCredentials = async (pollEndpoint, pollToken) => {
  const res = await fetch(pollEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `token=${encodeURIComponent(pollToken)}`,
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Poll request failed: ${res.status}`);

  const data = await res.json();
  return {
    serverUrl:   data.server,
    username:    data.loginName,
    appPassword: data.appPassword,
  };
};
