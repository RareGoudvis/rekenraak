import React from 'react';
import ReactDOM from 'react-dom/client';
import { IconContext } from '@phosphor-icons/react';
import TutorApp from './TutorApp';
import { setThousandsSeparator } from '../services/math/formatters';
// Same tokens and sheet fonts as the editor; never imports App or the worksheet store.
import '../index.css';
import './tutor.css';

// U+202F narrow no-break space, as on the Oefenmodus card: a full space is a whole mono cell.
setThousandsSeparator(' ');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <IconContext.Provider value={{ size: 24, weight: 'bold' }}>
      <TutorApp />
    </IconContext.Provider>
  </React.StrictMode>,
);
