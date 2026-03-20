import SharePage  from './components/Pages/SharePage.tsx';
import VaultPage from './components/Pages/VaultPage';
import { Routes, Route } from 'react-router-dom';

export default function App() {
  // Read at render time, not module evaluation time.
  // By the time React renders, the DOM is fully parsed and
  // data-share-token is reliably available.
  const domShareToken = document.getElementById('vault-root')
    ?.getAttribute('data-share-token') ?? null;

  console.log('[App] domShareToken:', domShareToken);
  console.log('[App] pathname:', window.location.pathname);

  if (domShareToken) {
    console.log('[App] rendering SharePage with DOM token');
    return <SharePage />;
  }

  return (
    <Routes>
      <Route path="/share/:token" element={<SharePage />} />
      <Route path="/*" element={<VaultPage />} />
    </Routes>
  );
}