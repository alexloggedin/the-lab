// src/components/VideoPlayer.jsx
import { useEffect, useState } from 'react';
import { getAuthHeader } from '../../auth/authStore.ts';
import { USE_MOCK } from '../../dev/useMockData.ts';

interface Props {
  fileUrl: string | null;
  authHeader?: string | null;
}

export default function VideoPlayer({ fileUrl, authHeader = null }: Props) {
  const [blobUrl, setBlobUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    if (!fileUrl) return;
    let objectUrl = "";
    setLoading(true);

    if (USE_MOCK || !fileUrl.startsWith('http') && !fileUrl.startsWith('/')) {
      setBlobUrl(fileUrl);
      return;
    }

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

    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [fileUrl, authHeader]);

  if (loading) return <p className="muted">loading video...</p>;
  if (error) return <p className="muted">could not load: {error}</p>;
  if (!blobUrl) return null;
  return (
    <video controls src={blobUrl}
      style={{ width: '100%', marginTop: 8, borderRadius: 2, background: '#000' }} />
  );
}