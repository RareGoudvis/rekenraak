// Dev-only entry of present.html: the presentation audit (window.__spelAudit), real skins on the pupil css.
import React from 'react';
import ReactDOM from 'react-dom/client';
import { IconContext } from '@phosphor-icons/react';
import '../../../index.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/latin-800.css';
import '@fontsource/nunito/latin-900.css';
import '../../kiosk/kiosk.css';
import { installAudit } from './auditApi';
import { setThousandsSeparator } from '../../../services/math/formatters';
import PresentAudit from './PresentAudit';

// As the pupil page (Kiosk.tsx): a narrow no-break space between thousands.
setThousandsSeparator('\u202F');
installAudit();

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode><IconContext.Provider value={{ size: 24, weight: 'bold' }}><PresentAudit /></IconContext.Provider></React.StrictMode>,
);
