import React from 'react';
import ReactDOM from 'react-dom/client';
import { IconContext } from '@phosphor-icons/react';
import App from './App.tsx';
import './index.css'; // Laadt de CSS-fundering en het thema

// App-wide Phosphor defaults so raw-rendered icons (sidebar theme toggle, modal X,
// panel carets) share one size/weight without per-site props. IconButton overrides
// weight per interaction state.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <IconContext.Provider value={{ size: 18, weight: 'regular' }}>
      <App />
    </IconContext.Provider>
  </React.StrictMode>,
);