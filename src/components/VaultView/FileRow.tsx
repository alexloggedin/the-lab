import { useState, useEffect } from 'react';
import AudioPlayer from '../Players/AudioPlayer.tsx';
import VideoPlayer from '../Players/VideoPlayer.tsx';
import VersionHistory from './VersionHistory.tsx';
import ShareModal from './ShareModal.tsx';
import MetadataEditor from './MetadataEditor.tsx';
import { api } from '../../api/api.ts';
import type { VaultFile, FileMetadata } from '../../types.ts';

interface Props {
  file: VaultFile;
  meta: FileMetadata | null;
}

const formatSize = (bytes: number) =>
  (bytes / 1024 / 1024).toFixed(1) + ' MB';

type ActivePanel = 'player' | 'history' | 'share' | 'edit' | null;

export default function FileRow({ file, meta }: Props) {
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [localMeta, setLocalMeta] = useState<FileMetadata | null>(meta);

  const isAudio = file.mimetype?.startsWith('audio/');
  const isVideo = file.mimetype?.startsWith('video/');
  const isPlayable = isAudio || isVideo;

  useEffect(() => {
    if (!file.path) return;
    api.streamUrl(file.path).then(setResolvedUrl);
  }, [file.path]);

  useEffect(() => {
    setLocalMeta(meta);
  }, [meta]);

  const togglePanel = (panel: ActivePanel) => {
    setActivePanel(prev => (prev === panel ? null : panel));
  };

  const handlePlayPause = () => {
    if (activePanel !== 'player') {
      setActivePanel('player');
      setIsPlaying(true);
    } else {
      setIsPlaying(prev => !prev);
    }
  };


  const playIcon = isPlaying && activePanel === 'player' ? '⏸' : '▶';

  return (
    <div
      className={`track-card ${activePanel === 'player' && isPlaying ? 'playing' : ''}`}
    >
      {/* ── Zone 1: Art square ────────────────────────────── */}
      <div className="track-art" onClick={isPlayable ? handlePlayPause : undefined}>
        <span className="track-art-placeholder">♪</span>

        {isPlayable && (
          <div className="track-play-btn">
            <span className="play-circle">{playIcon}</span>
          </div>
        )}
      </div>

      {/* ── Zone 2: Info + panels ─────────────────────────── */}
      <div className="track-info">
        <span className="track-name">{file.name}</span>

        <div className="track-meta-row">
          {localMeta?.bpm && (
            <span className="track-meta-item">{localMeta.bpm} bpm</span>
          )}
          {localMeta?.key && (
            <span className="track-meta-item">{localMeta.key}</span>
          )}
          {localMeta?.genre && (
            <span className="track-meta-item">
              {localMeta.genre.split(',')[0]}
            </span>
          )}
          <span className="track-meta-item">{formatSize(file.size)}</span>
        </div>
      </div>

      {/* Track Action Window*/}
      <div className='track-current-action'>
        {activePanel === 'player' && isAudio && (
          <div className="track-waveform">
            <AudioPlayer
              fileUrl={resolvedUrl}
              isPlaying={isPlaying}
              onPlayPause={setIsPlaying}
            />
          </div>
        )}
        {activePanel === 'player' && isVideo && (
          <VideoPlayer fileUrl={resolvedUrl} isPlaying={isPlaying} onPlayPause={setIsPlaying} />
        )}
        {activePanel === 'history' && (
          <VersionHistory filePath={file.path} mimeType={file.mimetype} />
        )}
        {activePanel === 'share' && (
          <ShareModal filePath={file.path} fileName={file.name} />
        )}
        {activePanel === 'edit' && (
          <MetadataEditor
            filePath={file.path}
            initialMeta={localMeta}
            onSave={saved => {
              setLocalMeta(saved);
              setActivePanel(null);
            }}
          />
        )}
      </div>


      {/* ── Zone 3: Actions ───────────────────────────────── */}
      <div className="track-actions">
        {activePanel != null && (<button
          className={activePanel != null ? 'fbtn on' : 'fbtn'}
          onClick={() => togglePanel(null)}
        >
          close
        </button>)}
        <button
          className={activePanel === 'share' ? 'fbtn on' : 'fbtn'}
          onClick={() => togglePanel('share')}
        >
          share
        </button>
        <button
          className={activePanel === 'history' ? 'fbtn on' : 'fbtn'}
          onClick={() => togglePanel('history')}
        >
          hist
        </button>
        <button
          className={activePanel === 'edit' ? 'fbtn on' : 'fbtn'}
          onClick={() => togglePanel('edit')}
        >
          tag
        </button>
      </div>
    </div>
  );
}