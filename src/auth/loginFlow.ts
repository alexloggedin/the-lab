// src/auth/loginFlow.js

const APP_NAME = 'theVault';

/**
 * Strip the origin from an absolute URL, leaving only the path.
 * e.g. "http://localhost:8080/login/v2/poll" → "/login/v2/poll"
 *
 * This is necessary because Nextcloud returns absolute URLs in the login flow
 * response using its own origin. In dev, the proxy rewrites requests through
 * localhost:5173, so we must use root-relative paths to keep requests on the
 * same origin and let the proxy handle forwarding.
 */
const toRelativePath = (absoluteUrl) => {
    try {
        return new URL(absoluteUrl).pathname;
    } catch {
        return absoluteUrl; // already relative, or malformed — return as-is
    }
};

export const initiateLoginFlow = async (serverUrl) => {
    const res = await fetch(`${serverUrl}/index.php/login/v2`, {
        method: 'POST',
        headers: { 'User-Agent': APP_NAME },
    });

    if (!res.ok) {
        throw new Error(
            `Could not reach Nextcloud at ${serverUrl}. ` +
            `Check the URL and confirm the server is reachable. (HTTP ${res.status})`
        );
    }

    const data = await res.json();

    if (!data?.poll?.token || !data?.poll?.endpoint || !data?.login) {
        throw new Error('Unexpected response. Is this a Nextcloud server?');
    }

    // Convert absolute URLs to root-relative paths so they route through the
    // Vite proxy instead of going directly to the Nextcloud origin.
    return {
        poll: {
            token: data.poll.token,
            endpoint: toRelativePath(data.poll.endpoint),
        },
        login: data.login, // login URL intentionally kept absolute — opens in a new tab
    };
};

export const pollForCredentials = async (pollEndpoint, pollToken) => {
    const res = await fetch(pollEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `token=${encodeURIComponent(pollToken)}`,
    });

    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Poll request failed: HTTP ${res.status}`);


    const data = await res.json();
    console.log('raw poll response:', JSON.stringify(data)); // ADD THI
    return {
        serverUrl: data.server,
        username: data.loginName,
        appPassword: data.appPassword,
    };
};