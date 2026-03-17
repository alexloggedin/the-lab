import { useState, useEffect } from 'react';
import { api } from '../api.jsx';
import AudioPlayer from './AudioPlayer.jsx';

export default function FolderShareView({ share, token }) {
    const [files, setFiles] = useState([]);
    const [activeFile, setActiveFile] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        api.getShareContents(token)
            .then(res => setFiles(res.data));
    }, [token]);

    const handlePlay = (file) => {
        if (activeFile?.path === file.path) {
            // Tapping the active track toggles play/pause
            setIsPlaying(prev => !prev);
        } else {
            // Tapping a different track starts it from the beginning
            setActiveFile(file);
            setIsPlaying(true);
        }
    };

    return (
        <div>
            {files.map(file => (
                <div key={file.path} style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="file-row">
                        <span className="file-name">{file.name}</span>
                        <span className="file-meta">
                            {(file.size / 1024 / 1024).toFixed(1)} MB
                        </span>
                        <button
                            className={activeFile?.path === file.path ? 'fbtn on' : 'fbtn'}
                            onClick={() => handlePlay(file)}
                        >
                            {activeFile?.path === file.path
                                ? (isPlaying ? 'pause' : 'play')
                                : 'play'
                            }
                        </button>
                        <a
                            href={api.publicStreamUrl(token)}
                            download={file.name}
                        >
                            download
                        </a>
                    </div>

                    {/* Inline player appears only under the active file row */}
                    {activeFile?.path === file.path && (
                        <AudioPlayer
                            fileUrl={api.publicStreamUrl(token)}
                            isPlaying={isPlaying}
                            onPlayPause={setIsPlaying}
                        />
                    )}
                </div>
            ))}
        </div>
    );
}