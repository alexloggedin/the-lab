import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import ShareView from './components/ShareView.jsx';
import './styles/globals.css';
import axios from 'axios';

axios.defaults.headers.common['requesttoken'] = window.OC?.requestToken ?? '';

document.addEventListener('DOMContentLoaded', () => {
    const rootEl = document.getElementById('thelab-root');

    const dataToken = rootEl?.dataset?.shareToken;
    const paramToken = new URLSearchParams(window.location.search).get('share');
    const shareToken = dataToken || paramToken;

    console.log('dataToken:', dataToken)
    console.log('paramToken:', paramToken)
    console.log('shareToken:', shareToken)
    console.log('rendering:', shareToken ? 'ShareView' : 'App')

    createRoot(rootEl).render(
        shareToken
            ? <ShareView token={shareToken} />
            : <App />
    );
});
