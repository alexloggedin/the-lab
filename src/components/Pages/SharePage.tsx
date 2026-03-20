import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import SharedFolderView from '../ShareView/SharedFolderView.tsx';
import SharedFileView from '../ShareView/SharedFileView.tsx';
import { getShareInfo } from '../../api/publicShareApi.ts';
import type { ShareInfo } from '../../types.ts';

export default function SharePage() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const hideDownload = searchParams.get('hideDownload') === '1';

  const [share, setShare] = useState<ShareInfo | null>(null);
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

  return (
    <div className="app-container">
      <div className="topbar"><span className="wordmark">theVault</span></div>

      <div className="share-view-content">
        <p className="share-view-label">
          {share.isFolder ? 'shared folder' : 'shared file'}
        </p>
        <p className="share-view-filename">{share.fileName}</p>

        {share.isFolder ? (
          <SharedFolderView token={token} hideDownload={hideDownload} />
        ) : (
          <SharedFileView token={token} share={share} hideDownload={hideDownload} />
        )}
      </div>
    </div>
  );
}