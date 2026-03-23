// src/components/Players/AudioPlayer.tsx

import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';

interface Props {
  fileUrl: string | null;
  isPlaying: boolean;
  onPlayPause: (playing: boolean) => void;
  authHeader?: string | null;
}

export default function AudioPlayer({ fileUrl, isPlaying, onPlayPause, authHeader = null }: Props) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [ready,   setReady]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!fileUrl || !containerRef.current) return;

    console.log('[AudioPlayer] loading:', fileUrl);

    setReady(false);
    setError(null);
    setLoading(true);

    wavesurferRef.current?.destroy();
    wavesurferRef.current = null;

    const style = getComputedStyle(containerRef.current);

    const ws = WaveSurfer.create({
      container:     containerRef.current,
      waveColor:     style.getPropertyValue('--border').trim()  || '#2a2a2a',
      progressColor: style.getPropertyValue('--accent').trim()  || '#ffffff',
      height:        48,
      barWidth:      2,
      barGap:        1,
      cursorWidth:   1,
      fetchParams: authHeader
        ? { credentials: 'omit' as RequestCredentials, headers: { Authorization: authHeader } }
        : { credentials: 'include' as RequestCredentials },
    });

    wavesurferRef.current = ws;

    ws.on('ready', () => {
      console.log('[AudioPlayer] ready, duration:', ws.getDuration().toFixed(1), 's');
      setReady(true);
      setLoading(false);
    });

    ws.on('finish', () => onPlayPause(false));

    ws.on('error', (err) => {
      console.error('[AudioPlayer] error:', err);
      setError(String(err));
      setLoading(false);
    });

    ws.load(fileUrl);

    return () => {
      ws.destroy();
      wavesurferRef.current = null;
    };
  }, [fileUrl, authHeader]);

  useEffect(() => {
    const ws = wavesurferRef.current;
    if (!ws || !ready) return;
     console.log("[AudioPlayer]", ws, ready)
    if (isPlaying) ws.play(); else ws.pause();
  }, [isPlaying, ready]);

  return (
    <div style={{ width: '100%', margin: '8px 0' }}>
      {/* Container is always in the DOM so WaveSurfer can measure its width.
          Visibility is toggled via CSS — never via conditional rendering. */}
      <div
        ref={containerRef}
        style={{ width: '100%', display: loading || error ? 'none' : 'block' }}
      />
      {loading && <p className="muted" style={{ padding: '8px 0' }}>loading audio...</p>}
      {error   && <p className="muted" style={{ padding: '8px 0' }}>{error}</p>}
    </div>
  );
}