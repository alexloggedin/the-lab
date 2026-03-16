import { useState, useEffect } from 'react';
import { api } from '../api';
import AudioPlayer from './AudioPlayer';

export default function VersionHistory({ filePath, mimeType }) {
  const [versions, setVersions] = useState([]);
  const [previewId, setPreviewId] = useState(null);
  const [previewIsPlaying, setPreviewIsPlaying] = useState(false);

  useEffect(() => {
    api.getVersions(filePath).then(r => setVersions(r.data));
  }, [filePath]);

  const handleRestore = async (versionId) => {
    if (!confirm('Restore this version? The current file will be saved as a new version.')) return;
    await api.restoreVersion(filePath, versionId);
    api.getVersions(filePath).then(r => setVersions(r.data));
  };

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
                setPreviewIsPlaying(opening);
              }}>
                preview
              </button>
              <button onClick={() => handleRestore(v.versionId)}>
                restore
              </button>
            </div>

            {previewId === v.versionId && (
              <AudioPlayer
                fileUrl={api.streamVersion(filePath, v.versionId)}
                isPlaying={previewIsPlaying}
                onPlayPause={setPreviewIsPlaying}
              />
            )}

          </div>
        </div>
      ))}
    </div>
  );
}