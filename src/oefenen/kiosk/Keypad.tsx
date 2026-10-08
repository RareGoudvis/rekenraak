import { Backspace } from '@phosphor-icons/react';

interface Props {
    // Extra keys for this type's settings (',' '-' '/' ' '), from descriptor.keys(c).
    extras: string[];
    // Descriptor action keys (Lenen): a word key in the same column, after the extras.
    actions?: { id: string; label: string }[];
    onAction?(id: string): void;
    onKey(key: string): void;
    onCheck(): void;
    canCheck: boolean;
}

const EXTRA_LABEL: Record<string, string> = { ' ': 'spatie', '-': '−' };

// mousedown would move focus off the answer field; keep it there so a physical keyboard
// and the keypad can be mixed on a Chromebook.
const keepFocus = (e: React.MouseEvent) => e.preventDefault();

// Phone-style 7-8-9 on top. The right column holds ⌫ and the extra keys, ⌫ growing into
// the rows the extras leave free; 0 and a two-wide Controleer share the bottom row (a
// one-wide column is too narrow for the word at kiosk size on a landscape phone).
export default function Keypad({ extras, actions = [], onAction, onKey, onCheck, canCheck }: Props) {
    const shownActions = actions.slice(0, Math.max(0, 2 - extras.length));
    const shown = extras.slice(0, 2 - shownActions.length);
    const slots = shown.length + shownActions.length;
    const key = (k: string, extraClass = '', style?: React.CSSProperties) => (
        <button key={k} type="button" className={`kiosk-key${extraClass}`} style={style} onMouseDown={keepFocus} onClick={() => onKey(k)}
            aria-label={k === ' ' ? 'spatie' : undefined}>
            {EXTRA_LABEL[k] ?? k}
        </button>
    );
    return (
        <div className="kiosk-keypad" role="group" aria-label="Cijfers">
            {['7', '8', '9', '4', '5', '6', '1', '2', '3'].map(k => key(k))}
            <button type="button" className="kiosk-key kiosk-key-back" style={{ gridRow: `1 / span ${3 - slots}` }}
                onMouseDown={keepFocus} onClick={() => onKey('back')} aria-label="Laatste teken wissen">
                <Backspace />
            </button>
            {shown.map((k, i) => key(k, ` kiosk-key-extra${k === ' ' ? ' kiosk-key-word' : ''}`, { gridRow: 4 - slots + i }))}
            {shownActions.map((a, i) => (
                <button key={`action-${a.id}`} type="button" className="kiosk-key kiosk-key-extra kiosk-key-word" style={{ gridRow: 4 - slots + shown.length + i }}
                    onMouseDown={keepFocus} onClick={() => onAction?.(a.id)} data-kiosk-action={a.id}>
                    {a.label}
                </button>
            ))}
            {key('0', ' kiosk-key-zero')}
            <button type="button" className="kiosk-key kiosk-key-check" onMouseDown={keepFocus} onClick={onCheck} disabled={!canCheck}>
                Controleer
            </button>
        </div>
    );
}
