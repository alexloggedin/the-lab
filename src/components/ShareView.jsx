import { useState, useEffect } from 'react';
import { api } from '../api.js';
import AudioPlayer from './AudioPlayer.jsx';
import VideoPlayer from './VideoPlayer.jsx';
import FolderShareView from './FolderShareView.jsx';

export default function ShareView({ token }) {

  // share: null = loading, populated = loaded
  const [share, setShare] = useState(null);

  // notFound: true triggers the invalid/expired state
  const [notFound, setNotFound] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    console.log(token)
    api.getShareByToken(token)
      .then(res => setShare(res.data))
      .catch(() => setNotFound(true));
  }, [token]);
  // [token] dependency means re-fetch if the token prop changes

  // ─── State: invalid or expired ───────────────────────────────────────────
  if (notFound) {
    return (
      <div className="app-container">
        <div className="topbar">
          <span className="wordmark">theVault</span>
        </div>
        <p className="muted" style={{ marginTop: '48px' }}>
          this link is invalid or has expired.
        </p>
      </div>
    );
  }

  // ─── State: loading ───────────────────────────────────────────────────────
  if (!share) {
    return (
      <div className="app-container">
        <div className="topbar">
          <span className="wordmark">theVault</span>
        </div>
        <p className="muted" style={{ marginTop: '48px' }}>loading...</p>
      </div>
    );
  }

  // ─── State: loaded ────────────────────────────────────────────────────────
  const isAudio = share.mimetype?.startsWith('audio/');
  const isVideo = share.mimetype?.startsWith('video/');

  return (
    <div className="app-container">

      <div className="topbar">
        <span className="wordmark">theVault</span>
      </div>

      <div style={{ padding: '40px 0' }}>

        {/* File header: label, name, metadata pills */}
        <div>
          <p>
            {share.isFolder ? 'shared folder' : 'shared file'}
          </p>

          <p style={{ fontSize: '16px', color: 'var(--text)' }}>
            {share.fileName}
          </p>

          {/* Only render the pill row if there is at least one metadata value */}
          {(share.meta?.bpm || share.meta?.key || share.meta?.genre) && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              {share.meta.bpm && <span className="pill">{share.meta.bpm} bpm</span>}
              {share.meta.key && <span className="pill">{share.meta.key}</span>}
              {share.meta.genre && <span className="pill">{share.meta.genre}</span>}
            </div>
          )}
        </div>

        {share.isFolder
          ? <FolderShareView share={share} token={token} />
          : (
            <>
              {isAudio && (
                <AudioPlayer
                  fileUrl={api.publicStreamUrl(token)}
                  isPlaying={isPlaying}
                  onPlayPause={setIsPlaying}
                />
              )}
              {isVideo && <VideoPlayer fileUrl={api.publicStreamUrl(token)} />}
            </>
          )
        }

        <div>
          {!share.isFolder && (
            <button onClick={() => setIsPlaying(prev => !prev)}>
              {isPlaying ? "Pause" : "Play"}
            </button>
          )}
  
          {/* TODO - Add handling for downloading entire folders */}
          
          {(!share.hideDownload && !share.isFolder) && (
            <a
              href={api.publicStreamUrl(share.token)}
              download={share.fileName}
            >
              download
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
