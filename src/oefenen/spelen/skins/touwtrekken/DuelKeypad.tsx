import { useMemo, useRef, useState } from 'react';
import { Backspace } from '@phosphor-icons/react';
import { canSubmit, shownAnswer, typeKey } from '../../keypadInput';
import { spelKeysOf } from '../../spelQuestion';
import { useDuelStore } from './duelStore';

interface Props {
    // Which half of the screen: names the keypad for screen readers and tests.
    label: string;
    questionKey: string;
    disabled: boolean;
    onAnswer(given: string): void;
}

const DIGITS = ['7', '8', '9', '4', '5', '6', '1', '2', '3'];
const KEY_LABEL: Record<string, string> = { '-': '−' };

// One player's keypad. Keys act on pointerdown: two children tap at the same moment and a multi-touch
// screen drops the click of the second touch. A keyboard click (detail 0) still works for a focused key.
// No physical keyboard: neither side may get it.
export default function DuelKeypad({ label, questionKey, disabled, onAnswer }: Props) {
    const [typed, setTyped] = useState({ key: questionKey, value: '' });
    // Taps can land faster than a render: the ref holds what is typed right now.
    const now = useRef(typed);
    const value = typed.key === questionKey ? typed.value : '';
    // The comma / minus when the round's content has them (as SpelKeypad).
    const from = useDuelStore(s => s.from);
    const keys = useMemo(() => (from ? spelKeysOf(from.choice, from.grade) : []), [from]);

    const press = (k: string) => {
        if (disabled) return;
        const v = now.current.key === questionKey ? now.current.value : '';
        if (k === 'ok') { if (canSubmit(v)) onAnswer(shownAnswer(v)); return; }
        const next = typeKey(v, k, keys);
        now.current = { key: questionKey, value: next };
        setTyped(now.current);
    };
    // One listener for the grid: the key under the pointer, by its data-key.
    const keyOf = (e: React.SyntheticEvent) => (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-key]');
    const onDown = (e: React.PointerEvent) => {
        const b = keyOf(e);
        if (!b) return;
        e.preventDefault();
        press(b.dataset.key!);
    };
    const onClick = (e: React.MouseEvent) => { const b = keyOf(e); if (b && e.detail === 0) press(b.dataset.key!); };

    return (
        <div className={`tt-keypad${disabled ? ' is-off' : ''}`} role="group" aria-label={label}>
            <output className="kiosk-math tt-field" aria-label="Antwoord" aria-live="polite">{shownAnswer(value)}</output>
            <div className={`tt-keys${keys.length ? ` has-extra is-${keys.length}` : ''}`} onPointerDown={onDown} onClick={onClick}>
                {DIGITS.map(k => <button key={k} type="button" className="tt-key" data-key={k}>{k}</button>)}
                <button type="button" className="tt-key is-back" data-key="back" aria-label="Laatste cijfer wissen"><Backspace aria-hidden /></button>
                {keys.map((k, i) => <button key={k} type="button" className={`tt-key is-extra${i === 0 && keys.length === 2 ? ' is-first' : ''}`} data-key={k}>{KEY_LABEL[k] ?? k}</button>)}
                <button type="button" className="tt-key is-zero" data-key="0">0</button>
                <button type="button" className="tt-key is-ok" data-key="ok" disabled={disabled || !canSubmit(value)}>OK</button>
            </div>
        </div>
    );
}
