import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';

import './styles/shares.css';
import './styles/metadata.css';
import './styles/search.css';
import './styles/globals.css';


const rootEl = document.getElementById('vault-root');

if (!window.crypto?.subtle) {
  rootEl.innerHTML = `
    <div style="font-family:monospace;padding:48px 24px;color:#e8e8e8;">
      <p style="color:#555;margin-bottom:16px;">theVault</p>
      <p>theVault requires a secure connection (HTTPS) to run.</p>
      <p style="color:#555;margin-top:8px;font-size:12px;">
        Open <a href="http://localhost:5173" style="color:#e8e8e8;">
        http://localhost:5173</a> (not 127.0.0.1), or deploy over HTTPS.
      </p>
    </div>
  `;
} else {
  createRoot(rootEl).render(
    <BrowserRouter><App /></BrowserRouter>
  );
}