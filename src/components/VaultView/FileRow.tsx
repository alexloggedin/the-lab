import { useState, useEffect } from 'react';
import AudioPlayer from '../Players/AudioPlayer.tsx';
import VideoPlayer from '../Players/VideoPlayer.tsx';
import VersionHistory from './VersionHistory.tsx';
import ShareModal from './ShareModal.tsx';
import type { VaultFile, FileMetadata } from '../../types.ts';
import MetadataEditor from './MetadataEditor.tsx';

interface Props {
    file: VaultFile;
    meta: FileMetadata | null;
}

interface PillProps {
    value: string | undefined | null
}

type ActivePanel = 'player' | 'history' | 'share' | 'edit' | null;

const Pill = ({ value }: PillProps) => value
    ? <span className="pill">{value}</span>
    : null;

const formatSize = (bytes: number) =>
    (bytes / 1024 / 1024).toFixed(1) + ' MB';

export default function FileRow({ file, meta }: Props) {

    const [activePanel, setActivePanel] = useState<ActivePanel>(null);
    const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [localMeta, setLocalMeta] = useState<FileMetadata | null>(meta);

    const isAudio = file.mimetype?.startsWith('audio/');
    const isVideo = file.mimetype?.startsWith('video/');

    const togglePanel = (panel: ActivePanel) => {
        setActivePanel(prev => prev === panel ? null : panel);
    };

    const handlePlayPause = () => {
        if (activePanel !== 'player') {
            setActivePanel('player');
            setIsPlaying(true);
        } else {
            setIsPlaying(prev => !prev);
        }
    };

    useEffect(() => { setLocalMeta(meta); }, [meta]);

    // In the file-actions div, add:
    <button
        className={activePanel === 'edit' ? 'fbtn on' : 'fbtn'}
        onClick={() => togglePanel('edit')}
    >
        tag
    </button>

    // In the panel rendering section, add:
    {
        activePanel === 'edit' && (
            <MetadataEditor
                filePath={file.path}
                initialMeta={localMeta}
                onSave={(saved) => {
                    setLocalMeta(saved);
                    setActivePanel(null);  // close the editor after saving
                }}
            />
        )
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="file-row">

                <span className="file-name">{file.name}</span>

                <Pill value={localMeta?.bpm ? `${localMeta.bpm} bpm` : null} />
                <Pill value={localMeta?.key} />
                <Pill value={localMeta?.genre?.split(',')[0]} />

                <span className="file-meta">{formatSize(file.size)}</span>

                <div className='file-actions' >
                    {(isAudio || isVideo) && (
                        <button className="fbtn on" onClick={handlePlayPause}>
                            {activePanel !== 'player' ? 'play' : isPlaying ? 'pause' : 'play'}
                        </button>
                    )}
                    {activePanel === 'player' && (
                        <button className="fbtn" onClick={() => {
                            setActivePanel(null);
                            setIsPlaying(false);
                        }}>
                            close
                        </button>
                    )}
                    <button
                        className={activePanel === 'history' ? 'fbtn on' : 'fbtn'}
                        onClick={() => togglePanel('history')}
                    >
                        history
                    </button>
                    <button
                        className={activePanel === 'share' ? 'fbn on' : 'fbtn'}
                        onClick={() => togglePanel('share')}
                    >
                        {activePanel === 'share' ? 'close' : 'share'}
                    </button>
                    <button
                        className={activePanel === 'edit' ? 'fbtn on' : 'fbtn'}
                        onClick={() => togglePanel('edit')}
                    >
                        tag
                    </button>
                </div>
            </div>

            {activePanel === 'edit' && (
                <MetadataEditor
                    filePath={file.path}
                    initialMeta={localMeta}
                    onSave={(saved) => {
                        setLocalMeta(saved);
                        setActivePanel(null);  // close the editor after saving
                    }}
                />
            )}

            {activePanel === 'player' && isAudio && (
                <AudioPlayer
                    fileUrl={resolvedUrl}
                    isPlaying={isPlaying}
                    onPlayPause={setIsPlaying}
                />
            )}

            {activePanel === 'player' && isVideo && (
                <VideoPlayer fileUrl={resolvedUrl} />
            )}

            {activePanel === 'history' && (
                <VersionHistory filePath={file.path} mimeType={file.mimetype} />
            )}

            {activePanel === 'share' && (
                <ShareModal filePath={file.path} fileName={file.name} />
            )}
        </div>
    )
}