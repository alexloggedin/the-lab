import { useState, useEffect, useCallback } from 'react';
import { api } from '../../api/api';
import { createPack, listPacks, deletePack } from '../../api/packApi';
import type { Pack } from '../../api/packApi';
import type { VaultFile } from '../../types';

export default function PacksView() {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);   // is the create form open?
  const [saving, setSaving] = useState(false);   // is the API call in flight?
  const [error, setError] = useState<string | null>(null);

  // ── Create form state ──────────────────────────────────────────
  const [packName, setPackName] = useState('');
  const [stagedFiles, setStagedFiles] = useState<VaultFile[]>([]);
  const [allFiles, setAllFiles] = useState<VaultFile[]>([]);
  const [fileQuery, setFileQuery] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  // Load packs and all files on mount
  useEffect(() => {
    setLoading(true);
    Promise.all([listPacks(), api.getAllFiles()])
      .then(([loadedPacks, filesRes]) => {
        setPacks(loadedPacks);
        setAllFiles(filesRes.data);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Filter the file list by the search query
  // We do this inline rather than using filterFiles() because we only
  // need name matching here — no BPM/key/genre filtering needed
  const filteredFiles = fileQuery
    ? allFiles.filter(f =>
      f.name.toLowerCase().includes(fileQuery.toLowerCase()) &&
      !stagedFiles.some(s => s.path === f.path)  // hide already-staged files
    )
    : [];

  const addFile = (file: VaultFile) => {
    setStagedFiles(prev => [...prev, file]);
    setFileQuery('');  // clear the search after adding
  };

  const removeFile = (path: string) => {
    setStagedFiles(prev => prev.filter(f => f.path !== path));
  };

  const handleCreate = async () => {
    if (!packName.trim() || stagedFiles.length === 0) return;

    setSaving(true);
    setError(null);
    try {
      const pack = await createPack(packName.trim(), stagedFiles);
      setPacks(prev => [pack, ...prev]);
      // Reset form
      setPackName('');
      setStagedFiles([]);
      setCreating(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (pack: Pack) => {
    if (!confirm(`Delete pack "${pack.manifest.name}"? The individual file shares will remain active.`)) return;
    try {
      await deletePack(pack);
      setPacks(prev => prev.filter(p => p.manifest.id !== pack.manifest.id));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) return <p className="muted">loading packs...</p>;

  return (
    <div className="packs-view">
      <div className="packs-header">
        <span className="section-label">file packs</span>
        <button
          className={creating ? 'fbtn on' : 'fbtn'}
          onClick={() => setCreating(prev => !prev)}
        >
          {creating ? 'cancel' : '+ new pack'}
        </button>
      </div>

      {error && <p className="share-error">{error}</p>}

      {/* ── Create form ─────────────────────────────────────────── */}
      {creating && (
        <div className="pack-create-form share-panel">
          <input
            type="text"
            placeholder="pack name..."
            value={packName}
            onChange={e => setPackName(e.target.value)}
          />

          {/* File search */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="search files to add..."
              value={fileQuery}
              onChange={e => setFileQuery(e.target.value)}
            />
            {filteredFiles.length > 0 && (
              <div className="pack-file-dropdown">
                {filteredFiles.slice(0, 8).map(file => (
                  <div
                    key={file.path}
                    className="pack-file-option"
                    onClick={() => addFile(file)}
                  >
                    <span>{file.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Staged files */}
          {stagedFiles.length > 0 && (
            <div className="pack-staged-files">
              <span className="share-lbl">files in pack ({stagedFiles.length})</span>
              {stagedFiles.map(file => (
                <div key={file.path} className="pack-staged-item">
                  <span className="file-name">{file.name}</span>
                  <span className="file-meta" style={{ fontSize: 10 }}>
                    {file.path.split('/').slice(0, -1).join('/')}
                  </span>
                  <button className="si-revoke" onClick={() => removeFile(file.path)}>
                    remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              className="abtn primary"
              onClick={handleCreate}
              disabled={saving || !packName.trim() || stagedFiles.length === 0}
            >
              {saving ? 'creating...' : `create pack (${stagedFiles.length} files)`}
            </button>
          </div>
        </div>
      )}

      {/* ── Pack list ───────────────────────────────────────────── */}
      {packs.length === 0 && !creating && (
        <p className="muted" style={{ marginTop: 16 }}>no packs yet.</p>
      )}

      {packs.map(pack => (
        <div key={pack.manifest.id} className="pack-item share-panel">
          <div className="pack-item-header">
            <span style={{ fontSize: 13, color: 'var(--text)' }}>{pack.manifest.name}</span>
            <span className="file-meta">
              {pack.manifest.files.length} files ·{' '}
              {new Date(pack.manifest.created * 1000).toLocaleDateString()}
            </span>
          </div>

          <div className="pack-file-list">
            {pack.manifest.files.map(entry => (
              <div key={entry.token} className="pack-entry-row">
                <span className="file-name" style={{ fontSize: 12 }}>{entry.filename}</span>
              </div>
            ))}
          </div>

          <div className="share-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="abtn" onClick={() => handleCopy(pack.shareUrl)}>
                {copied === pack.shareUrl ? 'copied' : 'copy link'}
              </button>
              <button className="si-revoke" onClick={() => handleDelete(pack)}>
                delete
              </button>
            </div>
            <a className="si-url"
              style={{ fontSize: '10px', overflow: 'hidden' }}
              href={pack.shareUrl}
              >
                {pack.shareUrl}
              </a>
          </div>
        </div>
      ))}
    </div>
  );
}