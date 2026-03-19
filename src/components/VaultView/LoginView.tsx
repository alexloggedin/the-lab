import { useState } from 'react';

interface Props {
  onStartLogin: (serverUrl: string) => void;
  loginState: 'idle' | 'polling' | 'error';
  loginError: string | null;
  loginUrl: string | null;
}

export default function LoginView({ onStartLogin, loginState, loginError, loginUrl }: Props) {
  const [serverUrl, setServerUrl] = useState<string>('');
  const [warning, setWarning] = useState<string | null>(null);

  const handleSubmit = () => {
    const trimmed = serverUrl.trim();
    if (!trimmed) return;

    const isHttps = trimmed.startsWith('https://');
    const isLocalhost = trimmed.includes('localhost') || trimmed.includes('127.0.0.1');

    if (!isHttps && !isLocalhost) {
      setWarning(
        'This server is not using HTTPS. Your credentials will be transmitted unencrypted. ' +
        'Click connect again to proceed anyway, or use an HTTPS address.'
      );
      // Only block once — second click proceeds
      if (!warning) return;
    }

    setWarning(null);
    onStartLogin(trimmed);
  };

  // Show polling state once the login URL is available
  if (loginState === 'polling' && loginUrl) {
    return (
      <div className="app-container login-container">
        <div className="topbar" style={{ marginBottom: 40 }}>
          <span className="wordmark">theVault</span>
        </div>
        <p className="login-polling-message">
          a nextcloud login window has been opened.
        </p>
        <p className="login-polling-sub">
          complete the login there, then return here.<br />
          this page will update automatically.
        </p>
        <a
          href={loginUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="abtn"
        >
          open login page again
        </a>
        <p className="login-polling-status">waiting...</p>
      </div>
    );
  }

  return (
    <div className="app-container login-container">
      <div className="topbar" style={{ marginBottom: 40 }}>
        <span className="wordmark">theVault</span>
      </div>

      <p className="login-tagline">connect your nextcloud</p>

      <div className="login-input-row">
        <input
          type="text"
          placeholder="https://your.nextcloud.com"
          value={serverUrl}
          onChange={e => { setServerUrl(e.target.value); setWarning(null); }}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        />
        <button
          className="abtn primary login-submit"
          onClick={handleSubmit}
          disabled={loginState === 'polling'}
        >
          {loginState === 'polling' ? 'connecting...' : 'connect'}
        </button>
      </div>

      {warning && (
        <div className="auth-warning auth-warning--danger">
          {warning}
        </div>
      )}

      {loginState === 'error' && loginError && (
        <p className="login-error">{loginError}</p>
      )}
    </div>
  );
}
