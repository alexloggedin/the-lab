import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from './hooks/useAuth.js';
import LoginPage from './components/LoginPage.tsx';
import ProjectList from './components/ProjectList.tsx';
import ShareView from './components/ShareView.tsx';
import { api } from './api.ts';
import { USE_MOCK } from './dev/useMockData.ts';
import { VaultFile } from './types.ts';

export default function App() {
  return (
    <Routes>
      {/* Public route — no auth required */}
      <Route path="/share/:token" element={<ShareView />} />

      {/* Authenticated route — the main vault */}
      <Route path="/*" element={<VaultApp />} />
    </Routes>
  );
}

// The authenticated vault view, extracted into its own component
function VaultApp() {
  const {
    authStatus, startLogin, logout,
    loginState, loginError, loginUrl, rotationDue,
  } = useAuth();

  const [folders,    setFolders]    = useState<VaultFile[]>([]);
  const [openFolder, setOpenFolder] = useState<VaultFile|null>(null);
  const [loading,    setLoading]    = useState(false);
  const [initError,  setInitError]  = useState<any>(null);

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

  if (authStatus === 'loading') {
    return <div className="app-container vault-loading">loading...</div>;
  }

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

  if (loading) {
    return <div className="app-container vault-loading">loading vault...</div>;
  }

  if (initError) {
    return (
      <div className="app-container vault-error">
        <p>could not connect to vault: {initError}</p>
        <button className="abtn disconnect-btn" onClick={logout}>disconnect</button>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="topbar">
        <span className="wordmark">theVault</span>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {rotationDue && (
            <span className="rotation-nudge" onClick={logout} title="Credentials are over 30 days old.">
              re-auth recommended
            </span>
          )}
          <button className="abtn disconnect-btn" onClick={logout}>disconnect</button>
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
