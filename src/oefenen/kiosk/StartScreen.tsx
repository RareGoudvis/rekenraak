import { useEffect, useRef } from 'react';
import { Play } from '@phosphor-icons/react';
import { useOefenStore } from '../useOefenStore';
import { viablePlannedTotal, viableTypes } from '../../services/oefenen/stats';

// Fullscreen hides the browser chrome on a tablet; refused or unsupported is fine.
function tryFullscreen() {
    try {
        const p = document.documentElement.requestFullscreen?.();
        if (p) p.catch(() => { /* refused: keep going in the window */ });
    } catch { /* unsupported (iOS Safari) */ }
}

// The confirm screen after scanning: what this session is, then Start.
export default function StartScreen() {
    const sessie = useOefenStore(s => s.sessie);
    const start = useOefenStore(s => s.start);
    const startRef = useRef<HTMLButtonElement>(null);
    useEffect(() => { startRef.current?.focus({ preventScroll: true }); }, []);
    if (!sessie) return null;

    // A type whose settings generate nothing never comes, so it is neither counted nor listed.
    const types = viableTypes(sessie);
    const n = types.length;
    const total = viablePlannedTotal(sessie);
    const facts = [
        `${n} ${n === 1 ? 'soort' : 'soorten'}`,
        ...(total !== null ? [`${total} oefeningen`] : []),
        ...(sessie.timerMin ? [`${sessie.timerMin} min`] : []),
    ];

    return (
        <main className="oefen-center kiosk-start">
            <p className="kiosk-start-brand">RekenRaak – Oefenmodus</p>
            <h1 className="oefen-title">{sessie.title || 'Oefenen'}</h1>
            <p className="oefen-lead">{facts.join(' · ')}</p>
            <ul className="kiosk-start-types">
                {types.map((t, i) => <li key={i}>{t.label}</li>)}
            </ul>
            {sessie.testMode && <p className="kiosk-start-note">Toets: je ziet pas op het einde wat juist was.</p>}
            <button ref={startRef} type="button" className="kiosk-btn kiosk-btn-primary kiosk-btn-big"
                onClick={() => { tryFullscreen(); start(); }}>
                <Play weight="fill" aria-hidden /> Start
            </button>
        </main>
    );
}
