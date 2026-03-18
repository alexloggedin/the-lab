// src/main.jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles/globals.css';
import './styles/auth.css';

createRoot(document.getElementById('vault-root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
