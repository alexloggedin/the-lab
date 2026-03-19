import { Routes, Route } from 'react-router-dom';
import SharePage from './components/Pages/SharePage.tsx';
import VaultPage from './components/Pages/VaultPage.tsx';

export default function App() {
  return (
    <Routes>
      {/* Public route — no auth required */}
      <Route path="/share/:token" element={<SharePage />} />

      {/* Authenticated route — the main vault */}
      <Route path="/*" element={<VaultPage />} />
    </Routes>
  );
}