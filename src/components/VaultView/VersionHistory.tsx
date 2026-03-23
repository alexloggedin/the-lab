// src/components/VersionHistory.jsx
import { useState, useEffect } from 'react';
import { getFileId, listVersions, versionStreamUrl, restoreVersion } from '../../api/versionApi.js';
import { USE_MOCK } from '../../dev/useMockData.js';
import { mockVersions } from '../../dev/fixtures.js';
import AudioPlayer from '../Players/AudioPlayer.js';
import type { FileVersion } from '../../types.js';

interface Props {
  filePath: string;
  mimeType: string;
}

export default function VersionHistory({ filePath, mimeType }: Props) {
  const [versions, setVersions] = useState<FileVersion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState<boolean>(false);

  // filePath is the user-relative path, e.g. "theVault/project/song.wav"
  const fileName = filePath.split('/').pop();

  useEffect(() => {
    if (!filePath) return;

    if (USE_MOCK) {
      // Mock mode: use fixture data directly, no WebDAV calls needed
      setVersions(mockVersions);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        // Step 1: Resolve the path to a numeric file ID via WebDAV PROPFIND
        const fileId = await getFileId(filePath);
        if (cancelled) return;

        // Step 2: List all versions for that file ID via WebDAV PROPFIND
        const versionList = await listVersions(fileId);
        if (cancelled) return;

        setVersions(versionList);
      } catch (err:any) {
        if (!cancelled) setError(err.message);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [filePath]);

  const handleRestore = async (version: FileVersion) => {
    if (!confirm('Restore this version? The current file will be saved as a new version.')) return;
    try {
      // Restore via WebDAV MOVE — no PHP route involved
      await restoreVersion(version.href, fileName === undefined ? "" : fileName);
      // Reload the version list after restore
      const fileId = await getFileId(filePath);
      const updated = await listVersions(fileId);
      setVersions(updated);
    } catch (err:any) {
      alert(`Restore failed: ${err.message}`);
    }
  };

  if (error) return <p className="muted">Could not load versions: {error}</p>;
  if (!versions.length) return <p className="muted">No previous versions.</p>;

  return (
    <div className="version-list">
      {versions.map(v => (
        <div key={v.versionId} className="version-row">
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span className="version-date">
                {new Date(v.modified * 1000).toLocaleString()}
              </span>
              <span className="version-size">
                {(v.size / 1024 / 1024).toFixed(1)} MB
              </span>
              <button onClick={() => {
                const opening = previewId !== v.versionId;
                setPreviewId(opening ? v.versionId : null);
                setPreviewPlaying(opening);
              }}>
                preview
              </button>
              <button onClick={() => handleRestore(v)}>
                restore
              </button>
            </div>

            {previewId === v.versionId && (
              <AudioPlayer
                // versionStreamUrl returns an absolute URL for a direct WebDAV GET
                fileUrl={versionStreamUrl(v.href)}
                isPlaying={previewPlaying}
                onPlayPause={setPreviewPlaying}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
