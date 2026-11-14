// Dev-only entry of gallery.html: the breuk pictures on the pupil tokens (theme + kiosk css).
import React from 'react';
import ReactDOM from 'react-dom/client';
import '../../../../index.css';
import '@fontsource/nunito/latin-800.css';
import '../../../kiosk/kiosk.css';
import BreukGallery from './BreukGallery';

// theme.css pins the page to one screen with no scroll; the gallery is a long page.
for (const el of [document.documentElement, document.body, document.getElementById('root')!]) Object.assign(el.style, { height: 'auto', overflow: 'visible' });

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode><BreukGallery /></React.StrictMode>,
);
