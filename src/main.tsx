import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles/shares.css';
import './styles/metadata.css';
import './styles/search.css';
import './styles/globals.css';
import './styles/pack.css';

const rootEl = document.getElementById('vault-root');

createRoot(rootEl).render(
  <BrowserRouter><App /></BrowserRouter>
);