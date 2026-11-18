import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Backspace } from '@phosphor-icons/react';
import { canSubmit, keyOfKeyboard, shownAnswer, typeKey } from '../keypadInput';
import { spelKeysOf } from '../spelQuestion';
import { useDuelStore } from './duelStore';
import SpelChoicePad from '../SpelChoicePad';
import type { SpelQuestion } from '../spelQuestion';

interface Props {
    // Which half of the screen: names the keypad for screen readers and tests.
    label: string;
    questionKey: string;
    disabled: boolean;
    onAnswer(given: string): void;
    // 1 speler: the one human keypad also takes a physical keyboard (two players never: neither side may get it).
    keyboard?: boolean;
    // This side's sum and its flash: on word choices (duelStore pad) the choice pad shows its choices instead of the keys.
    question?: Pick<SpelQuestion, 'key' | 'choices' | 'views'> | null;
    feedback?: { given: string; expected: string; correct: boolean } | null;
}

const DIGITS = ['7', '8', '9', '4', '5', '6', '1', '2', '3'];
const KEY_LABEL: Record<string, string> = { '-': '−' };

// One player's keypad. Keys act on pointerdown: two children tap at the same moment and a multi-touch
// screen drops the click of the second touch. A keyboard click (detail 0) still works for a focused key.
export default function DuelKeypad({ label, questionKey, disabled, onAnswer, keyboard = false, question = null, feedback = null }: Props) {
    const [typed, setTyped] = useState({ key: questionKey, value: '' });
    // Taps can land faster than a render: the ref holds what is typed right now.
    const now = useRef(typed);
    const value = typed.key === questionKey ? typed.value : '';
    // The comma / minus when the round's content has them (as SpelKeypad).
    const from = useDuelStore(s => s.from);
    const keys = useMemo(() => (from ? spelKeysOf(from.choice, from.grade) : []), [from]);
    const pad = useDuelStore(s => s.pad);

    const press = (k: string) => {
        if (disabled) return;
        const v = now.current.key === questionKey ? now.current.value : '';
        if (k === 'ok') { if (canSubmit(v)) onAnswer(shownAnswer(v)); return; }
        const next = typeKey(v, k, keys);
        now.current = { key: questionKey, value: next };
        setTyped(now.current);
    };
    const live = useRef(press);
    useLayoutEffect(() => { live.current = press; });
    useEffect(() => {
        // The pad has no field to type in: a focused choice answers on its own Enter.
        if (!keyboard || pad) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
            // A focused button handles its own Enter (Terug, Volgende ronde).
            if ((e.target as HTMLElement | null)?.tagName === 'BUTTON' && e.key === 'Enter') return;
            const k = e.key === 'Enter' ? 'ok' : e.key === 'Backspace' ? 'back' : keyOfKeyboard(e.key, keys);
            if (k === null || (k === 'ok' && e.repeat)) return;
            e.preventDefault();
            live.current(k);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [keyboard, keys, pad]);

    // One listener for the grid: the key under the pointer, by its data-key.
    const keyOf = (e: React.SyntheticEvent) => (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-key]');
    const onDown = (e: React.PointerEvent) => {
        const b = keyOf(e);
        if (!b) return;
        e.preventDefault();
        press(b.dataset.key!);
    };
    const onClick = (e: React.MouseEvent) => { const b = keyOf(e); if (b && e.detail === 0) press(b.dataset.key!); };

    if (pad) {
        // Before the first sum (the ready banner) the pad keeps its place (its empty rows), so nothing jumps.
        return question
            ? <SpelChoicePad className="duel-pad" label={label} choices={question.choices} views={question.views} questionKey={question.key} disabled={disabled} onAnswer={onAnswer} feedback={feedback} />
            : <div className="spel-pad duel-pad is-off" role="group" aria-label={label} />;
    }
    return (
        <div className={`duel-keypad${disabled ? ' is-off' : ''}`} role="group" aria-label={label}>
            <output className="kiosk-math duel-field" aria-label="Antwoord" aria-live="polite">{shownAnswer(value)}</output>
            <div className={`duel-keys${keys.length ? ` has-extra is-${keys.length}` : ''}`} onPointerDown={onDown} onClick={onClick}>
                {DIGITS.map(k => <button key={k} type="button" className="duel-key" data-key={k}>{k}</button>)}
                <button type="button" className="duel-key is-back" data-key="back" aria-label="Laatste cijfer wissen"><Backspace aria-hidden /></button>
                {keys.map((k, i) => <button key={k} type="button" className={`duel-key is-extra${i === 0 && keys.length === 2 ? ' is-first' : ''}`} data-key={k}>{KEY_LABEL[k] ?? k}</button>)}
                <button type="button" className="duel-key is-zero" data-key="0">0</button>
                <button type="button" className="duel-key is-ok" data-key="ok" disabled={disabled || !canSubmit(value)}>OK</button>
            </div>
        </div>
    );
}
