import { useState, useEffect } from 'react';
import AudioPlayer from '../Players/AudioPlayer.tsx';
import VideoPlayer from '../Players/VideoPlayer.tsx';
import {  publicStreamUrl, getPublicAuthHeader } from '../../api/publicShareApi.ts';
import type { ShareInfo } from '../../types.ts';

interface Props {
    share: ShareInfo,
    token: string|undefined,
    hideDownload: boolean
}

export default function SharedFileView({ share, token, hideDownload }: Props) {

    const [isPlaying, setIsPlaying] = useState(false);

    const isAudio = share.mimetype?.startsWith('audio/');
    const isVideo = share.mimetype?.startsWith('video/');
    const streamUrl = publicStreamUrl(token ? token : '');
    const authHeader = getPublicAuthHeader(token)

    return (
        <>
            {isAudio && (
                <AudioPlayer
                    fileUrl={streamUrl}
                    authHeader={authHeader}
                    isPlaying={isPlaying}
                    onPlayPause={setIsPlaying}
                />
            )}
            {isVideo && (
                <VideoPlayer
                    fileUrl={streamUrl}
                    authHeader={authHeader}
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
    )
}