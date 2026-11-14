import { useEffect } from 'react';
import { useOefenStore } from './useOefenStore';
import StartScreen from './kiosk/StartScreen';
import Kiosk from './kiosk/Kiosk';
import StatsScreen from './kiosk/StatsScreen';
import ErrorScreen from './kiosk/ErrorScreen';
import ZelfPicker from './zelf/ZelfPicker';
import SpelScreen from './spelen/SpelScreen';
import { useSpelStore } from './spelen/useSpelStore';

// Root of the pupil kiosk (oefenen.html). Routed by the URL hash: #oefen=<payload>.
export default function OefenApp() {
    const sessie = useOefenStore(s => s.sessie);
    const error = useOefenStore(s => s.error);
    const phase = useOefenStore(s => s.phase);
    const load = useOefenStore(s => s.load);
    const spelPhase = useSpelStore(s => s.phase);

    useEffect(() => {
        // main.tsx did the first load before rendering; this follows a link pasted over it.
        const onHash = () => load(window.location.hash);
        window.addEventListener('hashchange', onHash);
        return () => window.removeEventListener('hashchange', onHash);
    }, [load]);

    // A game runs on its own (Zelf oefenen › Spelen); Nakijken hands over to the kiosk below.
    if (spelPhase !== 'idle' && !sessie) return <SpelScreen />;
    // No link at all (no error either): the pupil picks an exercise alone. A broken link still gets its error.
    if (!error && !sessie) return <div className="oefen-app"><ZelfPicker /></div>;
    if (error || !sessie) {
        return <div className="oefen-app"><ErrorScreen message={error} /></div>;
    }
    if (phase === 'start') return <div className="oefen-app"><StartScreen /></div>;
    if (phase === 'locked') return <div className="oefen-app"><main className="kiosk-scroll"><StatsScreen /></main></div>;
    return <Kiosk />;
}
