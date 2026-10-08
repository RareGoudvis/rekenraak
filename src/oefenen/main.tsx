import React from 'react';
import ReactDOM from 'react-dom/client';
import { IconContext } from '@phosphor-icons/react';
import OefenApp from './OefenApp';
// Same CSS foundation as the worksheet app (tokens, bundled sheet fonts, focus rings); the
// kiosk layer on top. Never imports App: the pupil page must not touch the teacher's sheet.
import '../index.css';
import './kiosk/kiosk.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <IconContext.Provider value={{ size: 24, weight: 'bold' }}>
      <OefenApp />
    </IconContext.Provider>
  </React.StrictMode>,
);
