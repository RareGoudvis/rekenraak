import { Fragment, useEffect, useLayoutEffect, useRef } from 'react';
import { currentInput, interactionAnswer, typedReady, useOefenStore } from '../useOefenStore';
import Keypad from './Keypad';
import Tray from './Tray';

// What sits between two fields: the sheet's "r" for delen met rest, ':' between uur and min.
const SEPARATOR: Record<string, string> = { 'number+rest': 'r', time: ':' };

/** Size class for the choice buttons: signs and units (< = >, dl) big, numbers (437) one step down, words (even, honderdtallen) at a size a button holds. */
function choiceSizeOf(choices: readonly string[]): '' | ' is-numbers' | ' is-words' {
    if (choices.every(c => c.length <= 2)) return '';
    return choices.some(c => /\p{L}/u.test(c)) ? ' is-words' : ' is-numbers';
}

// A long answer (a breuk takes 24 characters) shrinks to fit its field, at most to half size,
// and shows its end: a keypad tap sets the value without moving the field's own scroll.
function fitField(el: HTMLInputElement | null) {
    if (!el) return;
    el.style.fontSize = '';
    if (el.scrollWidth > el.clientWidth) {
        const base = parseFloat(getComputedStyle(el).fontSize);
        el.style.fontSize = `${Math.max(base / 2, Math.floor(base * el.clientWidth / el.scrollWidth))}px`;
    }
    el.scrollLeft = el.scrollWidth;
}

// The answer side of the kiosk: typed field(s) + keypad, the choice buttons, or a word field.
export default function AnswerInput() {
    const sessie = useOefenStore(s => s.sessie);
    const shown = useOefenStore(s => s.shown);
    const input = useOefenStore(s => s.input);
    const field = useOefenStore(s => s.field);
    const phase = useOefenStore(s => s.phase);
    const interaction = useOefenStore(s => s.interaction);
    const { press, pressExtra, setField, focusField, choose, answer, clearBuild } = useOefenStore.getState();
    const refs = useRef<(HTMLInputElement | null)[]>([]);
    const info = currentInput(sessie, shown);
    const canCheck = typedReady(input, info?.blankFieldsOk ?? false);

    // Focus lands in the answer field on every new exercise and follows the active field.
    useEffect(() => {
        if (phase === 'exercise') refs.current[field]?.focus({ preventScroll: true });
    }, [shown, field, phase]);

    useLayoutEffect(() => {
        refs.current.forEach(fitField);
    }, [input, shown]);

    if (!info) return null;

    // Phase C: the answer is given ON the card; this panel only checks it (and, for cells, types).
    if (info.kind === 'interactive') {
        const ready = interactionAnswer(sessie, shown, interaction)?.ready ?? false;
        // build: the tray of pieces replaces the keypad; what is laid shows on the card.
        if (info.interact === 'build' && shown) {
            return (
                <div className="kiosk-answer">
                    <Tray typeId={sessie!.types[shown.slot].typeId} constraints={shown.constraints} pieces={info.pieces ?? []} />
                    <p className="kiosk-keypad-hint">Tik om te leggen, − om weg te nemen.</p>
                    <div className="kiosk-tray-actions">
                        <button type="button" className="kiosk-btn" onClick={clearBuild} disabled={interaction.build.length === 0}>Wissen</button>
                        <button type="button" className="kiosk-check-wide" onClick={answer} disabled={!ready}>Controleer</button>
                    </div>
                </div>
            );
        }
        const hints = info.extraKeys.flatMap(k => (k.hint ? [k.hint] : []));
        return (
            <div className="kiosk-answer">
                {info.interact === 'fill-cells'
                    ? <Keypad extras={info.keys} actions={info.extraKeys} onAction={pressExtra} onKey={press} onCheck={answer} canCheck={ready} />
                    : <button type="button" className="kiosk-check-wide" onClick={answer} disabled={!ready}>Controleer</button>}
                {hints.map(h => <p key={h} className="kiosk-keypad-hint">{h}</p>)}
            </div>
        );
    }

    if (info.kind === 'choice') {
        const choiceClass = choiceSizeOf(info.choices);
        // A long word (honderdtallen, parallellogram) or number (12 345,67) needs half the panel.
        const longWord = info.choices.some(c => c.length > (choiceClass === ' is-numbers' ? 6 : 9));
        // 5-6 short choices (ha a m² dm² cm²) are a fixed 3x2 grid of keypad-sized buttons, not two tall rows.
        const compact = !longWord && (info.choices.length === 5 || info.choices.length === 6);
        const cols = compact ? 3 : info.choices.length === 2 || info.choices.length === 4 || longWord ? 2 : 3;
        return (
            <div className="kiosk-answer">
                <div className={`kiosk-choices${choiceClass}${compact ? ' is-grid' : ''}`} role="radiogroup" aria-label="Kies het antwoord"
                    // --chars: the longest choice, so the number size fits every button alike (kiosk.css).
                    style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, '--chars': Math.max(...info.choices.map(c => c.length)) } as React.CSSProperties}>
                    {info.choices.map(c => (
                        <button key={c} type="button" role="radio" aria-checked={input[0] === c}
                            className={`kiosk-choice${input[0] === c ? ' is-picked' : ''}`} onClick={() => choose(c)}>
                            {choiceClass === ' is-numbers' ? <span className="kiosk-choice-num">{c}</span> : c}
                        </button>
                    ))}
                </div>
                <button type="button" className="kiosk-check-wide" onClick={answer} disabled={!canCheck}>Controleer</button>
            </div>
        );
    }

    // fraction (breuken herkennen): a stacked breuk, teller over the bar over noemer. The keypad starts
    // in the noemer (field 0); its wide key reads Verder and moves up to the teller until that is filled.
    if (info.kind === 'fraction') {
        const toTeller = field === 0 && (input[1] ?? '') === '';
        const box = (i: number) => (
            <input aria-label={info.labels[i]} placeholder={info.labels[i]} ref={el => { refs.current[i] = el; }}
                className={`kiosk-field${field === i ? ' is-active' : ''}`} inputMode="none" autoCapitalize="off" autoComplete="off" spellCheck={false}
                value={input[i] ?? ''} onChange={e => setField(i, e.target.value)} onFocus={() => focusField(i)} />
        );
        return (
            <div className="kiosk-answer">
                <div className="kiosk-fraction">
                    <label className="kiosk-field-bare">{box(1)}</label>
                    <span className="kiosk-fraction-bar" aria-hidden />
                    <label className="kiosk-field-bare">{box(0)}</label>
                </div>
                <p className="kiosk-keypad-hint">Typ eerst de noemer, dan de teller.</p>
                <Keypad extras={info.keys} onKey={press} canCheck={toTeller ? (input[0] ?? '') !== '' : canCheck}
                    onCheck={toTeller ? () => focusField(1) : answer} checkLabel={toTeller ? 'Verder' : undefined} />
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
                            // A caption above already names the field; the same word inside it again is noise.
                            placeholder={captions ? undefined : label}
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
