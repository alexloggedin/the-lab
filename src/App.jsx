// src/App.jsx
import { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth.js';
import LoginPage from './components/LoginPage.jsx';
import ProjectList from './components/ProjectList.jsx';
import { api } from './api.jsx';
import { USE_MOCK } from './dev/useMockData.js';

export default function App() {
  const {
    authStatus, credentials, startLogin, logout,
    loginState, loginError, loginUrl, rotationDue,
  } = useAuth();

  const [folders,   setFolders]   = useState([]);
  const [openFolder, setOpenFolder] = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [initError, setInitError] = useState(null);

  const isReady = authStatus === 'authenticated' || USE_MOCK;

  useEffect(() => {
    if (!isReady) return;

    setLoading(true);
    setInitError(null);

    api.initVault()
      .then(() => api.getFiles('theVault'))
      .then(res => setFolders(res.data))
      .catch(err => setInitError(err.message))
      .finally(() => setLoading(false));
  }, [isReady]);

  // ── Still checking stored credentials ────────────────────────────────────
  if (authStatus === 'loading') {
    return (
      <div className="app-container vault-loading">
        loading...
      </div>
    );
  }

  // ── Not authenticated → show login page ──────────────────────────────────
  if (!isReady) {
    return (
      <LoginPage
        onStartLogin={startLogin}
        loginState={loginState}
        loginError={loginError}
        loginUrl={loginUrl}
      />
    );
  }

  // ── Vault loading ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="app-container vault-loading">
        loading vault...
      </div>
    );
  }

  // ── Vault init error ──────────────────────────────────────────────────────
  if (initError) {
    return (
      <div className="app-container vault-error">
        <p>could not connect to vault: {initError}</p>
        <button className="abtn disconnect-btn" onClick={logout}>
          disconnect
        </button>
      </div>
    );
  }

  // ── Authenticated vault view ──────────────────────────────────────────────
  return (
    <div className="app-container">
      <div className="topbar">
        <span className="wordmark">theVault</span>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {rotationDue && (
            <span
              className="rotation-nudge"
              onClick={logout}
              title="Your login credentials are over 30 days old. Click to re-authenticate."
            >
              re-auth recommended
            </span>
          )}
          <button className="abtn disconnect-btn" onClick={logout}>
            disconnect
          </button>
        </div>
      </div>
      <ProjectList
        folders={folders}
        openFolder={openFolder}
        onFolderClick={setOpenFolder}
      />
    </div>
  );
}
