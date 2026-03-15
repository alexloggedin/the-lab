export default function VideoPlayer({ fileUrl }) {
  return (
    <video
      controls
      src={fileUrl}
      style={{ width: '100%', marginTop: 8, borderRadius: 2, background: '#000' }}
    />
  );
}