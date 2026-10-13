import { useEffect, useRef, useState } from 'react';
import { StopCircle } from '@phosphor-icons/react';
import { canStop, useOefenStore } from '../useOefenStore';

// An armed Stoppen falls back by itself, so a stray tap does not wait there for a second one.
export const STOP_DISARM_MS = 3000;

// Endless sessions only: the pupil's way to end the run. Two taps (Stoppen, then Ja, stoppen), like Wissen.
export default function StopButton() {
    const sessie = useOefenStore(s => s.sessie);
    const run = useOefenStore(s => s.run);
    const stop = useOefenStore(s => s.stop);
    const [armed, setArmed] = useState(false);
    const box = useRef<HTMLSpanElement>(null);
    const wasArmed = useRef(false);

    useEffect(() => {
        if (!armed) return;
        const id = window.setTimeout(() => setArmed(false), STOP_DISARM_MS);
        return () => window.clearTimeout(id);
    }, [armed]);

    // Keyboard: arming lands on Annuleer (an Enter meant for Controleer must not stop the run);
    // disarming hands the focus back to Stoppen instead of dropping it on the page.
    useEffect(() => {
        const el = box.current;
        if (el && armed) el.querySelector<HTMLButtonElement>('[data-stop="cancel"]')?.focus();
        else if (el && wasArmed.current && (document.activeElement === document.body || el.contains(document.activeElement))) {
            el.querySelector<HTMLButtonElement>('[data-stop="arm"]')?.focus();
        }
        wasArmed.current = armed;
    }, [armed]);

    if (!sessie || !canStop(sessie, run)) return null;

    return (
        <span ref={box} className={`kiosk-stop${armed ? ' is-armed' : ''}`} role="group" aria-label="Stoppen met oefenen">
            {armed ? (
                <>
                    <button key="confirm" type="button" className="kiosk-btn kiosk-btn-danger is-armed" data-stop="confirm" onClick={stop}>Ja, stoppen</button>
                    <button key="cancel" type="button" className="kiosk-btn kiosk-btn-quiet" data-stop="cancel" onClick={() => setArmed(false)}>Annuleer</button>
                </>
            ) : (
                <button key="arm" type="button" className="kiosk-btn kiosk-btn-quiet" data-stop="arm" onClick={() => setArmed(true)}>
                    <StopCircle aria-hidden /> Stoppen
                </button>
            )}
        </span>
    );
}
