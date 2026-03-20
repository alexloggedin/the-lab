import { useState, useEffect } from 'react';
import AudioPlayer from '../Players/AudioPlayer.tsx';
import { listShareContents, publicStreamUrl, getPublicAuthHeader } from '../../api/publicShareApi.js';
import { VaultFile } from '../../types.ts';

interface Props {
    token: string|undefined,
    hideDownload: boolean
}

export default function SharedFolderView({ token, hideDownload }: Props) {
  const [files,      setFiles]      = useState<VaultFile[]>([]);
  const [activeFile, setActiveFile] = useState<VaultFile|null>(null);
  const [isPlaying,  setIsPlaying]  = useState(false);
  const [error,      setError]      = useState<any>(null);

  useEffect(() => {
    if (!token){
        setError('no share token provided');
        return;
    } 
     
    console.log('[FolderShareView] loading contents for token:', token);

    listShareContents(token)
      .then(files => {
        console.log('[FolderShareView] files loaded:', files.length, files.map(f => f.name));
        setFiles(files);
      })
      .catch(err => {
        console.error('[FolderShareView] load error:', err);
        setError('could not load folder contents');
      });
  }, [token]);

  const handlePlay = (file: VaultFile) => {
    if (activeFile?.name === file.name) {
      setIsPlaying(prev => !prev);
    } else {
      setActiveFile(file);
      setIsPlaying(true);
    }
  };

  if (error) return <p className="muted">{error}</p>;
  if (!files.length) return <p className="muted share-loading">loading files...</p>;

  return (
    <div className="share-folder-list">
      {files.map(file => {
        if(!token) return;
        
        const fileStreamUrl = publicStreamUrl(token, file?.name);
        const isAudio       = file.mimetype?.startsWith('audio/');
        const isActive      = activeFile?.name === file.name;

        return (
          <div key={file.name} className="share-folder-item">
            <div className="file-row">
              <span className="file-name">{file.name}</span>
              <span className="file-meta">
                {(file.size / 1024 / 1024).toFixed(1)} MB
              </span>
              {isAudio && (
                <button
                  className={isActive ? 'fbtn on' : 'fbtn'}
                  onClick={() => handlePlay(file)}
                >
                  {isActive ? (isPlaying ? 'pause' : 'play') : 'play'}
                </button>
              )}
              {!hideDownload && (
                <a href={fileStreamUrl} download={file.name} className="fbtn">
                  download
                </a>
              )}
            </div>

            {isActive && isAudio && (
              <AudioPlayer
                fileUrl={fileStreamUrl}
                authHeader={getPublicAuthHeader(token)}
                isPlaying={isPlaying}
                onPlayPause={setIsPlaying}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
