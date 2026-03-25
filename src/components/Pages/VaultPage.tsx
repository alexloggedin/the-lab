// src/components/Pages/VaultPage.tsx

import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import ProjectList from '../VaultView/ProjectList';
import AllFilesView from '../VaultView/AllFilesView';
import PacksView from '../PacksView/PacksView';
import { api } from '../../api/api';
import { USE_MOCK } from '../../dev/useMockData';
import type { VaultFile } from '../../types';

// ViewMode is a union type — TypeScript will error if you try to set it
// to any string other than these two values. This is safer than a boolean
// (which gives you no indication of what true/false means) and cleaner
// than a string with no type constraint.
type ViewMode = 'projects' | 'all-files' | 'shares';

export default function VaultPage() {
  const { authStatus } = useAuth();

  const [folders, setFolders] = useState<VaultFile[]>([]);
  const [openFolder, setOpenFolder] = useState<VaultFile | null>(null);
  const [loading, setLoading] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  // viewMode lives here in VaultPage — it's the parent of both views
  // and is the right place for state that controls which child is shown.
  const [viewMode, setViewMode] = useState<ViewMode>('all-files');

  const isReady = authStatus === 'authenticated' || USE_MOCK;

  useEffect(() => {
    if (!isReady) return;

    setLoading(true);
    setInitError(null);

    api.initVault()
      .then(() => api.getFiles('theVault'))
      .then(res => {
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
        <span className="wordmark">theVault {' '} <span className='muted'>
          @ {window.origin.split('/')[2]}
        </span>
        </span>

        {/* View toggle — two buttons that act as a tab switcher.
            The active view gets the 'on' class from globals.css.
            Switching to 'all-files' mounts AllFilesView, which
            triggers its own useEffect fetch. Switching back unmounts
            it, so the next time it opens it fetches fresh data. */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            className={viewMode === 'all-files' ? 'fbtn on' : 'fbtn'}
            onClick={() => setViewMode('all-files')}
          >
            all files
          </button>
          <button
            className={viewMode === 'projects' ? 'fbtn on' : 'fbtn'}
            onClick={() => setViewMode('projects')}
          >
            projects
          </button>
          <button
            className={viewMode === 'shares' ? 'fbtn on' : 'fbtn'}
            onClick={() => setViewMode('shares')}
          >
            shares
          </button>
        </div>
      </div>

      {viewMode === 'all-files' && (
        <AllFilesView />
      )}

      {viewMode === 'projects' && (
        <ProjectList
          folders={folders}
          openFolder={openFolder}
          onFolderClick={setOpenFolder}
        />
      )}
      {viewMode === 'shares' && (
        <PacksView />
      )}
    </div>
  );
}