import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { fetchManifestByToken } from '../../api/packApi';
import { publicStreamUrl, getPublicAuthHeader } from '../../api/publicApi';
import AudioPlayer from '../Players/AudioPlayer';
import type { PackManifest, PackEntry } from '../../api/packApi';

export default function PackSharePage() {
  const { token: routerToken } = useParams<{ token: string }>();

  // Also check the DOM attribute for Nextcloud-rendered pages
  const domToken = document.getElementById('vault-root')
    ?.getAttribute('data-pack-token') ?? undefined;

  const token = routerToken ?? domToken;

  const [manifest, setManifest] = useState<PackManifest | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [activeTrack, setActiveTrack] = useState<string | null>(null);  // token of playing track
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetchManifestByToken(token)
      .then(setManifest)
      .catch(err => {
        console.error('[PackSharePage] failed to load manifest:', err);
        setNotFound(true);
      });
  }, [token]);

  const handlePlay = (fileToken: string) => {
    if (activeTrack === fileToken) {
      setIsPlaying(prev => !prev);
    } else {
      setActiveTrack(fileToken);
      setIsPlaying(true);
    }
  };

  if (notFound) {
    return (
      <div className="app-container">
        <div className="topbar"><span className="wordmark">theVault</span></div>
        <p className="muted share-not-found">this pack link is invalid or has expired.</p>
      </div>
    );
  }

  if (!manifest) {
    return (
      <div className="app-container">
        <div className="topbar"><span className="wordmark">theVault</span></div>
        <p className="muted share-loading">loading pack...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="topbar"><span className="wordmark">theVault @ {window.origin.split('/')[2]}</span></div>
      <div className="share-view-content">
        <p className="share-view-filename">
          {manifest.name}{' '} <span className='wordmark muted file-meta'>{manifest.files.length} files</span>
        </p>

        <div className="pack-share-list">
          {manifest.files.map(entry => (
            <PackFileRow
              key={entry.token}
              entry={entry}
              isActive={activeTrack === entry.token}
              isPlaying={activeTrack === entry.token && isPlaying}
              onPlay={() => handlePlay(entry.token)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── PackFileRow ───────────────────────────────────────────────────────────────
//
// Renders a single file row. The stream URL is built from the file's own share
// token — exactly the same as SharedFolderView does for folder share entries.
// Each file's share is a separate OCS share, so each has its own auth token.

interface RowProps {
  entry: PackEntry;
  isActive: boolean;
  isPlaying: boolean;
  onPlay: () => void;
}

function PackFileRow({ entry, isActive, isPlaying, onPlay }: RowProps) {
  // publicStreamUrl(token) → /public.php/dav/files/{token}/
  // For a single-file share, this path IS the file itself
  const streamUrl = publicStreamUrl(entry.token);
  const authHeader = getPublicAuthHeader(entry.token);
  const isAudio = entry.mimetype?.startsWith('audio/');

  return (
    <div className="share-folder-item">
      <div className="file-row">
        <span className="file-name">{entry.filename}</span>
        <div>
          {isAudio && (
            <button
              className={isActive ? 'fbtn on' : 'fbtn'}
              onClick={onPlay}
            >
              {isActive ? (isPlaying ? 'pause' : 'play') : 'play'}
            </button>
          )}
          <a href={streamUrl} download={entry.filename} className="fbtn">
            download
          </a>
        </div>
      </div>

      {isActive && isAudio && (
        <AudioPlayer
          fileUrl={streamUrl}
          authHeader={authHeader}
          isPlaying={isPlaying}
          onPlayPause={(playing) => {
            // If the player calls back with false (finished), update parent state
            if (!playing) onPlay(); // toggle off
          }}
        />
      )}
    </div>
  );
}