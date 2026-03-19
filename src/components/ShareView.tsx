import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import AudioPlayer from './AudioPlayer.tsx';
import VideoPlayer from './VideoPlayer.tsx';
import FolderShareView from './FolderShareView.tsx';
import { getShareInfo, publicStreamUrl, getPublicAuthHeader } from '../api/publicShareApi.ts';
import type { ShareInfo } from '../types';

export default function ShareView() {
  const { token }          = useParams();
  const [searchParams]     = useSearchParams();
  const hideDownload       = searchParams.get('hideDownload') === '1';

  const [share,    setShare]    = useState<ShareInfo|null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!token) return;
    console.log('[ShareView] loading share for token:', token);

    getShareInfo(token)
      .then(info => {
        console.log('[ShareView] share info:', info);
        setShare({ ...info, hideDownload });
      })
      .catch(err => {
        console.error('[ShareView] share load error:', err.message);
        setNotFound(true);
      });
  }, [token]);

  if (notFound) {
    return (
      <div className="app-container">
        <div className="topbar"><span className="wordmark">theVault</span></div>
        <p className="muted share-not-found">this link is invalid or has expired.</p>
      </div>
    );
  }

  if (!share) {
    return (
      <div className="app-container">
        <div className="topbar"><span className="wordmark">theVault</span></div>
        <p className="muted share-loading">loading...</p>
      </div>
    );
  }

  const isAudio    = share.mimetype?.startsWith('audio/');
  const isVideo    = share.mimetype?.startsWith('video/');
  const streamUrl  = publicStreamUrl(token? token : '');

  return (
    <div className="app-container">
      <div className="topbar"><span className="wordmark">theVault</span></div>

      <div className="share-view-content">
        <p className="share-view-label">
          {share.isFolder ? 'shared folder' : 'shared file'}
        </p>
        <p className="share-view-filename">{share.fileName}</p>

        {share.isFolder ? (
          <FolderShareView token={token} hideDownload={hideDownload} />
        ) : (
          <>
            {isAudio && (
              <AudioPlayer
                fileUrl={streamUrl}
                authHeader={getPublicAuthHeader(token)}
                isPlaying={isPlaying}
                onPlayPause={setIsPlaying}
              />
            )}
            {isVideo && (
              <VideoPlayer
                fileUrl={streamUrl}
                authHeader={getPublicAuthHeader(token)}
              />
            )}

            <div className="share-view-actions">
              <button
                className="abtn"
                onClick={() => setIsPlaying(prev => !prev)}
              >
                {isPlaying ? 'pause' : 'play'}
              </button>

              {!hideDownload && (
                <a href={streamUrl} download={share.fileName} className="abtn">
                  download
                </a>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}