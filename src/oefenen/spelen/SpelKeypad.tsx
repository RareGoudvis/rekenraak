import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Keypad from '../kiosk/Keypad';

interface Props {
    // The pupil's number, on Controleer or Enter.
    onAnswer(given: string): void;
    // The question on screen: a new one starts with an empty field.
    questionKey: string;
    // Outside the play phase the keys do nothing.
    disabled?: boolean;
}

// Game answers stay short: a leerjaar 1–3 sum has at most 4 digits.
const MAX_DIGITS = 6;

// For keypad skins (Pinguïntoren, Zombies): the kiosk keypad plus a physical keyboard (digits, Backspace, Enter).
export default function SpelKeypad({ onAnswer, questionKey, disabled = false }: Props) {
    const [typed, setTyped] = useState({ key: questionKey, value: '' });
    const value = typed.key === questionKey ? typed.value : '';

    const press = (k: string) => {
        if (disabled) return;
        setTyped(t => {
            const v = t.key === questionKey ? t.value : '';
            if (k === 'back') return { key: questionKey, value: v.slice(0, -1) };
            return /^\d$/.test(k) && v.length < MAX_DIGITS ? { key: questionKey, value: v + k } : t;
        });
    };
    const submit = () => { if (!disabled && value !== '') onAnswer(value); };

    // The window listener is set once; it calls the latest handlers through this ref.
    const handlers = useRef({ press, submit });
    useLayoutEffect(() => { handlers.current = { press, submit }; });

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
            // A focused button handles its own Enter (Hoe los ik dit op?, Terug).
            if ((e.target as HTMLElement | null)?.tagName === 'BUTTON' && e.key === 'Enter') return;
            if (e.key === 'Enter') { e.preventDefault(); if (!e.repeat) handlers.current.submit(); }
            else if (e.key === 'Backspace') { e.preventDefault(); handlers.current.press('back'); }
            else if (/^\d$/.test(e.key)) { e.preventDefault(); handlers.current.press(e.key); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    return (
        <div className="spel-keypad">
            <output className="kiosk-field kiosk-math spel-keypad-field" aria-label="Jouw antwoord" aria-live="polite">{value}</output>
            <Keypad extras={[]} onKey={press} onCheck={submit} canCheck={!disabled && value !== ''} />
        </div>
    );
}
