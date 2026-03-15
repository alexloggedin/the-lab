import { useEffect, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';

export default function AudioPlayer({ fileUrl }) {
  const containerRef = useRef(null);
  const ws           = useRef(null);

  useEffect(() => {
    ws.current = WaveSurfer.create({
      container:     containerRef.current,
      waveColor:     '#444',
      progressColor: '#ffffff',
      height:        48,
      barWidth:      2,
      barGap:        1,
      barRadius:     2,
      url:           fileUrl,
    });
    return () => ws.current.destroy();
  }, [fileUrl]);

  return (
    <div style={{ marginTop: 8 }}>
      <div ref={containerRef} />
      <button onClick={() => ws.current.playPause()}>play / pause</button>
    </div>
  );
}