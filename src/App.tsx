import VaultPage from './components/Pages/VaultPage';
import PackSharePage from './components/Pages/PackSharePage.tsx';
import { Routes, Route } from 'react-router-dom';

export default function App() {
  // Read at render time, not module evaluation time.
  // By the time React renders, the DOM is fully parsed and
  // data-share-token is reliably available.
  const domShareToken = document.getElementById('vault-root')
    ?.getAttribute('data-share-token') ?? null;

  const domPackToken = document.getElementById('vault-root')
    ?.getAttribute('data-pack-token') ?? null;

  console.log('[App] domShareToken:', domShareToken);
  console.log('[App] pathname:', window.location.pathname);

  if (domPackToken) return <PackSharePage />;

  return (
    <Routes>
      <Route path="/pack/:token" element={<PackSharePage />} />
      <Route path="/*" element={<VaultPage />} />
    </Routes>
  );
}