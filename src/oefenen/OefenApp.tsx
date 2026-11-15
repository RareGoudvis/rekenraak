import { useEffect } from 'react';
import { useOefenStore } from './useOefenStore';
import StartScreen from './kiosk/StartScreen';
import Kiosk from './kiosk/Kiosk';
import StatsScreen from './kiosk/StatsScreen';
import ErrorScreen from './kiosk/ErrorScreen';
import KidBackdrop from './kiosk/KidBackdrop';
import ZelfPicker from './zelf/ZelfPicker';
import SpelScreen from './spelen/SpelScreen';
import { useSpelStore } from './spelen/useSpelStore';
import { exitFullscreen } from './kiosk/fullscreen';

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

    // Back on the picker (after an oefening or a game): the browser chrome returns; starting the next one goes fullscreen again.
    const onPicker = !error && !sessie && spelPhase === 'idle';
    useEffect(() => { if (onPicker) exitFullscreen(); }, [onPicker]);

    // A game runs on its own (Zelf oefenen › Spelen); Nakijken hands over to the kiosk below.
    if (spelPhase !== 'idle' && !sessie) return <SpelScreen />;
    // No link at all (no error either): the pupil picks an exercise alone. A broken link still gets its error.
    if (!error && !sessie) return <div className="oefen-app"><ZelfPicker /></div>;
    if (error || !sessie) {
        return <div className="oefen-app"><KidBackdrop /><ErrorScreen message={error} /></div>;
    }
    if (phase === 'start') return <div className="oefen-app"><KidBackdrop grade={sessie.grade} /><StartScreen /></div>;
    if (phase === 'locked') return <div className="oefen-app"><KidBackdrop clouds={false} extra="confetti" grade={sessie.grade} /><main className="kiosk-scroll"><StatsScreen /></main></div>;
    return <Kiosk />;
}
