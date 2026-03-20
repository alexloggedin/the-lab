import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import ProjectList from '../VaultView/ProjectList';
import { api } from '../../api/api';
import { USE_MOCK } from '../../dev/useMockData';
import type { VaultFile } from '../../types';

export default function VaultPage() {
  const { authStatus } = useAuth();

  const [folders,     setFolders]     = useState<VaultFile[]>([]);
  const [openFolder,  setOpenFolder]  = useState<VaultFile | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [initError,   setInitError]   = useState<string | null>(null);

  const isReady = authStatus === 'authenticated' || USE_MOCK;

  useEffect(() => {
    if (!isReady) return;

    console.log('[VaultPage] session ready, initialising vault...');
    setLoading(true);
    setInitError(null);

    api.initVault()
      .then(() => api.getFiles('theVault'))
      .then(res => {
        console.log('[VaultPage] folders loaded:', res.data.length);
        setFolders(res.data);
      })
      .catch(err => {
        console.error('[VaultPage] init error:', err.message);
        setInitError(err.message);
      })
      .finally(() => setLoading(false));
  }, [isReady]);

  if (authStatus === 'loading') {
    return <div className="app-container vault-loading">loading...</div>;
  }

  if (authStatus === 'unauthenticated' && !USE_MOCK) {
    return (
      <div className="app-container vault-loading">
        <p className="muted">session not found — please reload the page.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="app-container vault-loading">loading vault...</div>;
  }

  if (initError) {
    return (
      <div className="app-container vault-error">
        <p>could not connect to vault: {initError}</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="topbar">
        <span className="wordmark">theVault</span>
      </div>
      <ProjectList
        folders={folders}
        openFolder={openFolder}
        onFolderClick={setOpenFolder}
      />
    </div>
  );
}