import { useEffect, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';

export default function AudioPlayer({ fileUrl, isPlaying, onPlayPause }) {
  const containerRef = useRef(null);
  const ws = useRef(null);
  const loaded = useRef(false);  // track whether we've fetched yet

  useEffect(() => {
    ws.current = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#444',
      progressColor: '#ffffff',
      height: 48,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      // ← no url here — don't auto-fetch on mount
    });

    ws.current.on('ready', () => {
      if (isPlaying) ws.current.play();
    });

    ws.current.on('error', (err) => {
      console.error('WaveSurfer error:', err);
    });

    ws.current.on('finish', () => onPlayPause(false));

    return () => {
      ws.current.destroy();
      loaded.current = false;
    };
  }, [fileUrl]);

  // Load and play/pause in response to isPlaying changes
  useEffect(() => {
    if (!ws.current) return;

    if (isPlaying) {
      if (!loaded.current) {
        // First play — load the file now
        loaded.current = true;
        ws.current.load(fileUrl);
        // WaveSurfer will play automatically via the 'ready' handler above
      } else {
        ws.current.play();
      }
    } else {
      ws.current.pause();
    }
  }, [isPlaying]);

  return (
    <div style={{ padding: '12px 0' }}>
      <div ref={containerRef} />
    </div>
  );
}