import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { getAuthHeader } from '../../auth/authStore.ts';
import { USE_MOCK } from '../../dev/useMockData.ts';

interface Props {
  fileUrl: string | null;
  isPlaying: boolean;
  onPlayPause: (playing: boolean) => void;
  authHeader?: string|null;
}

export default function AudioPlayer({ fileUrl, isPlaying, onPlayPause, authHeader = null }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    if (!fileUrl) return;

    setBlobUrl(null);
    setReady(false);
    setError(null);

    if (USE_MOCK || !fileUrl.startsWith('http') && !fileUrl.startsWith('/')) {
      setBlobUrl(fileUrl);
      return;
    }

    let objectUrl = '';
    setLoading(true);

    // Use provided authHeader, or fall back to stored credentials
    const getHeader = authHeader
      ? Promise.resolve(authHeader)
      : getAuthHeader();

    getHeader.then(header => {
      fetch(fileUrl, {
        credentials: 'omit',
        headers: header ? { Authorization: header } : {},
      })
        .then(res => {
          if (!res.ok) throw new Error(`Failed to load audio: ${res.status}`);
          return res.blob();
        })
        .then(blob => {
          console.log('[AudioPlayer] blob type:', blob.type, 'size:', blob.size);
          objectUrl = URL.createObjectURL(blob);
          setBlobUrl(objectUrl);
        })
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    });

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      wavesurferRef.current?.destroy();
      wavesurferRef.current = null;
    };
  }, [fileUrl, authHeader]);

  // Step 2 — initialize WaveSurfer once blob URL exists and container is mounted
  useEffect(() => {
    if (!blobUrl || !containerRef.current) return;

    // Destroy any previous instance
    wavesurferRef.current?.destroy();
    wavesurferRef.current = null;
    setReady(false);

    const style = getComputedStyle(containerRef.current);

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: style.getPropertyValue('--border').trim() || '#2a2a2a',
      progressColor: style.getPropertyValue('--accent').trim() || '#ffffff',
      height: 48,
      barWidth: 2,
      barGap: 1,
      cursorWidth: 1,
    });

    wavesurferRef.current = ws;

    ws.on('ready', () => {
      setReady(true);
      // If play was requested before decode finished, start now
      if (isPlaying) ws.play();
    });

    ws.on('error', (err) => {
      console.error('WaveSurfer error:', err);
      setError(`Could not decode audio: ${err}`);
    });

    ws.on('finish', () => onPlayPause(false));

    ws.load(blobUrl);

    return () => {
      ws.destroy();
      wavesurferRef.current = null;
    };
  }, [blobUrl]);

  // Step 3 — sync play/pause after WaveSurfer is ready
  useEffect(() => {
    const ws = wavesurferRef.current;
    if (!ws || !ready) return;
    if (isPlaying) ws.play(); else ws.pause();
  }, [isPlaying, ready]);

  if (loading) return <p className="muted" style={{ padding: '8px 0' }}>loading audio...</p>;
  if (error) return <p className="muted" style={{ padding: '8px 0' }}>{error}</p>;

  return <div ref={containerRef} style={{ width: '100%', margin: '8px 0' }} />;
}