// src/components/VaultView/AllFilesView.tsx

import { useState, useEffect } from 'react';
import { api } from '../../api/api';
import FileRow from './FileRow';
import type { VaultFile } from '../../types';

// AllFilesView fetches and renders every file in theVault as a flat list,
// regardless of which project folder it lives in.
//
// It receives no folder prop — it does its own fetching on mount.
// This means the fetch only runs when the user actually switches to this view,
// not eagerly when VaultPage first loads.

export default function AllFilesView() {
  const [files, setFiles]   = useState<VaultFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {

    let cancelled = false;

    setLoading(true);
    setError(null);

    api.getAllFiles()
      .then(res => {
        if (!cancelled) {
          // Sort by most recently modified so newest work appears first
          console.log('[AllFilesView] Fetch Results: ', res)
          const sorted = [...res.data].sort((a, b) => b.modified - a.modified);
          setFiles(sorted);
        }
      })
      .catch(err => {
        if (!cancelled) {
          console.error('[AllFilesView] load error:', err);
          setError(err.message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };

  }, []);

  if (loading) {
    return <p className="muted">loading all files...</p>;
  }

  if (error) {
    return <p className="muted">could not load files: {error}</p>;
  }

  if (!files.length) {
    return <p className="muted">no files found.</p>;
  }

  return (
    <div>
      <div className="section-label">
        all files <span style={{ color: 'var(--muted)', fontWeight: 'normal' }}>({files.length})</span>
      </div>

      {files.map(file => (
        ///TODO - Add a filter and search section for all files in folder
        <FileRow
          key={file.path}
          file={file}
          meta={null}
        />
      ))}
    </div>
  );
}