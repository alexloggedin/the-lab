import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles/globals.css';

// Attach Nextcloud's CSRF token to every axios request
// This is required for all POST, PUT, DELETE calls
import axios from 'axios';
axios.defaults.headers.common['requesttoken'] = window.OC?.requestToken ?? '';

createRoot(document.getElementById('thelab-root')).render(<App />);

