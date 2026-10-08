import { Fragment, useEffect, useRef } from 'react';
import { currentInput, useOefenStore } from '../useOefenStore';
import Keypad from './Keypad';

// What sits between two fields: the sheet's "r" for delen met rest, ':' between uur and min.
const SEPARATOR: Record<string, string> = { 'number+rest': 'r', time: ':' };

// The answer side of the kiosk: typed field(s) + keypad, the choice buttons, or a word field.
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
        // Signs (< = >) stay big; words (even, honderdtallen) get a size that fits a button.
        const words = info.choices.some(c => c.length > 2);
        // A long word (honderdtallen, parallellogram) needs half the panel, never a mid-word break.
        const longWord = info.choices.some(c => c.length > 9);
        const cols = info.choices.length === 2 || info.choices.length === 4 || longWord ? 2 : 3;
        return (
            <div className="kiosk-answer">
                <div className={`kiosk-choices${words ? ' is-words' : ''}`} role="radiogroup" aria-label="Kies het antwoord"
                    style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
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

    const text = info.kind === 'text';
    const many = info.labels.length > 2;
    const sep = SEPARATOR[info.kind] ?? info.separator;
    // Named fields (kg / g, korting / nieuwe prijs) keep their name visible once typed in;
    // numbered ones (a getallenrij's blanks) read left to right without one.
    const captions = info.kind === 'multi-number' && info.labels.some(l => !/^\d+$/.test(l));
    return (
        <div className="kiosk-answer">
            <div className={`kiosk-fields${many ? ' is-many' : ''}`}>
                {info.labels.map((label, i) => (
                    <Fragment key={`${label}-${i}`}>
                        {i > 0 && sep && <span className="kiosk-field-sep" aria-hidden>{sep}</span>}
                        <label className={captions ? 'kiosk-field-wrap' : 'kiosk-field-bare'}>
                        {captions && <span className="kiosk-field-cap">{label}</span>}
                        <input
                            aria-label={label}
                            placeholder={label}
                            ref={el => { refs.current[i] = el; }}
                            className={`kiosk-field${field === i && input.length > 1 ? ' is-active' : ''}${text ? ' is-text' : ''}`}
                            // No on-screen OS keyboard for numbers: the keypad is the touch input, a
                            // physical keyboard still types here. A word needs the device keyboard.
                            inputMode={text ? 'text' : 'none'}
                            autoCapitalize="off"
                            autoComplete="off"
                            spellCheck={false}
                            value={input[i] ?? ''}
                            onChange={e => setField(i, e.target.value)}
                            onFocus={() => focusField(i)}
                        />
                        </label>
                    </Fragment>
                ))}
            </div>
            {text
                ? <button type="button" className="kiosk-check-wide" onClick={answer} disabled={!canCheck}>Controleer</button>
                : <Keypad extras={info.keys} onKey={press} onCheck={answer} canCheck={canCheck} />}
        </div>
    );
}
