import { useEffect, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';

export default function AudioPlayer({ fileUrl, isPlaying, onPlayPause }) {
  const containerRef = useRef(null);
  const ws = useRef(null);

  useEffect(() => {
    ws.current = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#444',
      progressColor: '#ffffff',
      height: 48,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      url: fileUrl,
    });

    ws.current.on('ready', () => {
      console.log('WaveSurfer ready');
      if (isPlaying) ws.current.play();
    });

    // ← add these temporarily
    ws.current.on('error', (err) => {
      console.error('WaveSurfer error:', err);
    });

    ws.current.on('load', (url) => {
      console.log('WaveSurfer loading:', url);
    });

    ws.current.on('finish', () => onPlayPause(false));

    return () => ws.current.destroy();
  }, [fileUrl]);

  // React to isPlaying changes coming from FileRow
  useEffect(() => {
    if (!ws.current) return;
    if (isPlaying) {
      ws.current.play();
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