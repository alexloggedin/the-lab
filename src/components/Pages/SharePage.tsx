import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import SharedFolderView from '../ShareView/SharedFolderView';
import SharedFileView from '../ShareView/SharedFileView';
import { getShareInfo } from '../../api/publicApi';
import type { ShareInfo } from '../../types';

export default function SharePage() {
  // Try React Router first (works in mock/dev mode)
  const { token: routerToken } = useParams();

  // Fall back to the DOM attribute injected by PHP (works in Nextcloud)
  const domToken = document.getElementById('vault-root')
    ?.getAttribute('data-share-token') ?? undefined;

  const token = routerToken ?? domToken;

  const hideDownload = new URLSearchParams(window.location.search).get('hideDownload') === '1';

  const [share, setShare] = useState<ShareInfo | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) return;
    console.log('[SharePage] loading share for token:', token);

    getShareInfo(token)
      .then(info => {
        console.log('[SharePage] share info:', info);
        setShare({ ...info, hideDownload });
      })
      .catch(err => {
        console.error('[SharePage] share load error:', err.message);
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
        <div className="topbar"><span className="wordmark">theLAB</span></div>
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
