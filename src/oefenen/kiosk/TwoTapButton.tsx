import { useEffect, useRef, useState, type ReactNode } from 'react';

// An armed button falls back by itself, so a stray tap does not wait there for a second one.
export const STOP_DISARM_MS = 3000;

interface Props {
    // The first tap's button (icon + text), its group's label, and the confirm button's text.
    label: ReactNode;
    groupLabel: string;
    confirm: string;
    onConfirm: () => void;
    // The first button's name when its visible text is shortened (narrow phones).
    armName?: string;
}

// Two taps (label, then confirm), like Wissen: Stoppen and Terug naar begin.
export default function TwoTapButton({ label, groupLabel, confirm, onConfirm, armName }: Props) {
    const [armed, setArmed] = useState(false);
    const box = useRef<HTMLSpanElement>(null);
    const wasArmed = useRef(false);

    useEffect(() => {
        if (!armed) return;
        const id = window.setTimeout(() => setArmed(false), STOP_DISARM_MS);
        return () => window.clearTimeout(id);
    }, [armed]);

    // Keyboard: arming lands on Annuleer (an Enter meant for Controleer must not confirm);
    // disarming hands the focus back to the first button instead of dropping it on the page.
    useEffect(() => {
        const el = box.current;
        if (el && armed) el.querySelector<HTMLButtonElement>('[data-stop="cancel"]')?.focus();
        else if (el && wasArmed.current && (document.activeElement === document.body || el.contains(document.activeElement))) {
            el.querySelector<HTMLButtonElement>('[data-stop="arm"]')?.focus();
        }
        wasArmed.current = armed;
    }, [armed]);

    return (
        <span ref={box} className={`kiosk-stop${armed ? ' is-armed' : ''}`} role="group" aria-label={groupLabel}>
            {armed ? (
                <>
                    <button key="confirm" type="button" className="kiosk-btn kiosk-btn-danger is-armed" data-stop="confirm" onClick={onConfirm}>{confirm}</button>
                    <button key="cancel" type="button" className="kiosk-btn kiosk-btn-quiet" data-stop="cancel" onClick={() => setArmed(false)}>Annuleer</button>
                </>
            ) : (
                <button key="arm" type="button" className="kiosk-btn kiosk-btn-quiet" data-stop="arm" aria-label={armName} onClick={() => setArmed(true)}>{label}</button>
            )}
        </span>
    );
}
