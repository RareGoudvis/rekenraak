import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Keypad from '../kiosk/Keypad';
import type { SpelKey } from './accepts';
import { canSubmit, keyOfKeyboard, MAX_ANSWER_CHARS, shownAnswer, typeKey } from './keypadInput';
import { spelKeysOf } from './spelQuestion';
import { useSpelStore } from './useSpelStore';

interface Props {
    // The pupil's number, on Controleer or Enter.
    onAnswer(given: string): void;
    // The question on screen: a new one starts with an empty field.
    questionKey: string;
    // Outside the play phase the keys do nothing.
    disabled?: boolean;
    // A shorter field (Schatkist's 4-digit lock, digits only); absent = MAX_ANSWER_CHARS and the round's keys.
    maxDigits?: number;
    // Told the field's value as it changes (Schatkist shows it in the lock).
    onType?(value: string): void;
}

// For keypad skins (Pinguïntoren, Zombies): the kiosk keypad plus a physical keyboard (digits, Backspace, Enter, and
// the comma / minus when the round's content has them: the same keys for every question, so the keypad never jumps).
export default function SpelKeypad({ onAnswer, questionKey, disabled = false, maxDigits, onType }: Props) {
    const [typed, setTyped] = useState({ key: questionKey, value: '' });
    const value = typed.key === questionKey ? typed.value : '';
    const from = useSpelStore(s => s.from);
    const keys = useMemo<readonly SpelKey[]>(() => (maxDigits === undefined && from ? spelKeysOf(from.choice, from.grade) : []), [from, maxDigits]);

    const press = (k: string) => {
        if (disabled) return;
        setTyped(t => {
            const v = t.key === questionKey ? t.value : '';
            const next = typeKey(v, k, keys, maxDigits ?? MAX_ANSWER_CHARS);
            return next === v && t.key === questionKey ? t : { key: questionKey, value: next };
        });
    };
    const submit = () => { if (!disabled && canSubmit(value)) onAnswer(shownAnswer(value)); };

    // The window listener is set once; it calls the latest handlers through this ref.
    const handlers = useRef({ press, submit, keys });
    useLayoutEffect(() => { handlers.current = { press, submit, keys }; });
    const typedTo = useRef(onType);
    useLayoutEffect(() => { typedTo.current = onType; });
    useEffect(() => { typedTo.current?.(value); }, [value]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
            // A focused button handles its own Enter (Hoe los ik dit op?, Terug).
            if ((e.target as HTMLElement | null)?.tagName === 'BUTTON' && e.key === 'Enter') return;
            if (e.key === 'Enter') { e.preventDefault(); if (!e.repeat) handlers.current.submit(); }
            else if (e.key === 'Backspace') { e.preventDefault(); handlers.current.press('back'); }
            else {
                const k = keyOfKeyboard(e.key, handlers.current.keys);
                if (k !== null) { e.preventDefault(); handlers.current.press(k); }
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    return (
        <div className="spel-keypad">
            <output className="kiosk-field kiosk-math spel-keypad-field" aria-label="Jouw antwoord" aria-live="polite">{shownAnswer(value)}</output>
            <Keypad extras={[...keys]} onKey={press} onCheck={submit} canCheck={!disabled && canSubmit(value)} />
        </div>
    );
}
