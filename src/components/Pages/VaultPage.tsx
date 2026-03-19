import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth.ts';
import LoginView from '../UserView/LoginView.tsx';
import ProjectList from '../UserView/ProjectList.tsx';
import { api } from '../../api.ts';
import { USE_MOCK } from '../../dev/useMockData.ts';
import { VaultFile } from '../../types.ts';

export default function VaultPage() {
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
      <LoginView
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