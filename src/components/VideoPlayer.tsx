// src/components/VideoPlayer.jsx
import { useEffect, useState } from 'react';
import { getAuthHeader } from '../auth/authStore.js';
import { USE_MOCK } from '../dev/useMockData.js';

interface Props {
  fileUrl: string | null;
}

interface Headers {
  Authorization: string|undefined;
}

export default function VideoPlayer({ fileUrl }: Props) {
  const [blobUrl, setBlobUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<any>(null);

  useEffect(() => {
    if (!fileUrl) return;
    let objectUrl = "";
    setLoading(true);

    const load = async () => {
      try {
        const headers= {};
        if (!USE_MOCK) {
          const auth = await getAuthHeader();
          if (auth) headers.Authorization = auth;
        }
        const res = await fetch(fileUrl, { headers });
        if (!res.ok) throw new Error(`Failed to load video: ${res.status}`);
        objectUrl = URL.createObjectURL(await res.blob());
        setBlobUrl(objectUrl);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    load();
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [fileUrl]);

  if (loading) return <p className="muted">loading video...</p>;
  if (error)   return <p className="muted">could not load: {error}</p>;
  if (!blobUrl) return null;
  return (
    <video controls src={blobUrl}
      style={{ width: '100%', marginTop: 8, borderRadius: 2, background: '#000' }} />
  );
}