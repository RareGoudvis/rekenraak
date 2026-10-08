import { Fragment, useEffect, useRef } from 'react';
import { currentInput, useOefenStore } from '../useOefenStore';
import Keypad from './Keypad';

const FIELD_LABEL = { number: ['Antwoord'], 'missing-operand': ['Wat ontbreekt?'], 'number+rest': ['quotiënt', 'rest'] } as const;

// The answer side of the kiosk: typed field(s) + keypad, or the choice buttons.
export default function AnswerInput() {
    const sessie = useOefenStore(s => s.sessie);
    const shown = useOefenStore(s => s.shown);
    const input = useOefenStore(s => s.input);
    const field = useOefenStore(s => s.field);
    const phase = useOefenStore(s => s.phase);
    const { press, setField, focusField, choose, answer } = useOefenStore.getState();
    const refs = useRef<(HTMLInputElement | null)[]>([]);
    const info = currentInput(sessie, shown);
    const canCheck = input.every(v => v.trim() !== '');

    // Focus lands in the answer field on every new exercise and follows the active field.
    useEffect(() => {
        if (phase === 'exercise') refs.current[field]?.focus({ preventScroll: true });
    }, [shown, field, phase]);

    if (!info) return null;

    if (info.kind === 'choice') {
        return (
            <div className="kiosk-answer">
                <div className="kiosk-choices" role="radiogroup" aria-label="Kies het juiste teken">
                    {info.choices.map(c => (
                        <button key={c} type="button" role="radio" aria-checked={input[0] === c}
                            className={`kiosk-choice${input[0] === c ? ' is-picked' : ''}`} onClick={() => choose(c)}>
                            {c}
                        </button>
                    ))}
                </div>
                <button type="button" className="kiosk-check-wide" onClick={answer} disabled={!canCheck}>Controleer</button>
            </div>
        );
    }

    const labels = FIELD_LABEL[info.kind];
    return (
        <div className="kiosk-answer">
            <div className="kiosk-fields">
                {labels.map((label, i) => (
                    <Fragment key={label}>
                        {/* "= q r rest", the sheet's own notation for delen met rest. */}
                        {i > 0 && <span className="kiosk-field-sep" aria-hidden>r</span>}
                        <input
                            aria-label={label}
                            placeholder={label}
                            ref={el => { refs.current[i] = el; }}
                            className={`kiosk-field${field === i && input.length > 1 ? ' is-active' : ''}`}
                            // No on-screen OS keyboard: the keypad is the touch input, a physical
                            // keyboard still types here.
                            inputMode="none"
                            autoComplete="off"
                            spellCheck={false}
                            value={input[i] ?? ''}
                            onChange={e => setField(i, e.target.value)}
                            onFocus={() => focusField(i)}
                        />
                    </Fragment>
                ))}
            </div>
            <Keypad extras={info.keys} onKey={press} onCheck={answer} canCheck={canCheck} />
        </div>
    );
}
