import { useState, useEffect } from 'react';
import { api } from '../api.jsx';
import AudioPlayer from './AudioPlayer.jsx';
import VideoPlayer from './VideoPlayer.jsx';
import VersionHistory from './VersionHistory.jsx';
import ShareModal from './ShareModal.jsx';

const Pill = ({ value }) => value
    ? <span className="pill">{value}</span>
    : null;

const formatSize = (bytes) =>
    (bytes / 1024 / 1024).toFixed(1) + ' MB';

export default function FileRow({ file, meta }) {

    const [activePanel, setActivePanel] = useState(null);
    const [resolvedUrl, setResolvedUrl] = useState(null);

    const isAudio = file.mimetype?.startsWith('audio/');
    const isVideo = file.mimetype?.startsWith('video/');

    const [isPlaying, setIsPlaying] = useState(false);

    const togglePanel = (panel) => {
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

    useEffect(() => {
        if (!file.path) return;
        api.streamUrl(file.path).then(setResolvedUrl);
    }, [file.path]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="file-row">
                {meta?.albumArt && (
                    <img
                        src={meta.albumArt}
                        alt="album art"
                        style={{ width: 28, height: 28, borderRadius: 2, objectFit: 'cover', flexShrink: 0 }}
                    />
                )}

                <span className="file-name">{file.name}</span>

                <Pill value={meta?.bpm ? `${meta.bpm} bpm` : null} />
                <Pill value={meta?.key} />
                <Pill value={meta?.genre} />

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
                </div>
            </div>

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