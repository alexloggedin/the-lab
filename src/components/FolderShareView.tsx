import { useState, useEffect } from 'react';
import { api } from '../api.js';
import AudioPlayer from './AudioPlayer.jsx';
import type { VaultFile, ShareInfo } from '../types';

interface Props {
    share: ShareInfo;
    token: string;
}

export default function FolderShareView({ share, token }: Props) {
    const [files, setFiles] = useState<VaultFile[]>([]);
    const [activeFile, setActiveFile] = useState<VaultFile | null>(null);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);

    useEffect(() => {
        api.getShareContents(token)
            .then(res => setFiles(res.data));
    }, [token]);

    const handlePlay = (file: VaultFile) => {
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
                            href={api.publicStreamUrl(token, file.path)}
                            download={file.name}
                        >
                            download
                        </a>
                    </div>

                    {/* Inline player appears only under the active file row */}
                    {activeFile?.path === file.path && (
                        <AudioPlayer
                            fileUrl={api.publicStreamUrl(token, file.path)}
                            isPlaying={isPlaying}
                            onPlayPause={setIsPlaying}
                        />
                    )}
                </div>
            ))}
        </div>
    );
}