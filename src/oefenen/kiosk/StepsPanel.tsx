import { useState } from 'react';
import { ListNumbers } from '@phosphor-icons/react';
import { formatMathNumber } from '../../services/math/formatters';
import { stepText, type StepLine } from '../../services/math/workedSteps';

interface Props {
    lines: StepLine[];
    onNext(): void;
}

// After a final fout: the pupil may open the worked steps, one Basis line per tap so they can
// think ahead, with Alle stappen adding the optional lines. Volgende moves on either way.
export default function StepsPanel({ lines, onNext }: Props) {
    const [open, setOpen] = useState(false);
    const [revealed, setRevealed] = useState(1);
    const [alle, setAlle] = useState(false);

    const basisIdx = lines.flatMap((l, i) => (l.basis ? [i] : []));
    const total = basisIdx.length;
    const upto = basisIdx[Math.min(revealed, total) - 1];
    const shownLines = lines.map((l, i) => ({ l, i })).filter(({ l, i }) => i <= upto && (alle || l.basis));
    const done = revealed >= total;

    return (
        <div className="kiosk-steps">
            {!open ? (
                <>
                    <p className="kiosk-steps-lead">Fout. Wil je zien hoe je het uitrekent?</p>
                    <button type="button" className="kiosk-btn kiosk-btn-primary kiosk-btn-big kiosk-steps-pulse" onClick={() => setOpen(true)} autoFocus>
                        <ListNumbers weight="bold" aria-hidden /> Toon de stappen
                    </button>
                </>
            ) : (
                <>
                    <ol className="kiosk-steps-lines" aria-live="polite">
                        {shownLines.map(({ l, i }) => (
                            <li key={i} className={`kiosk-math${i === upto ? ' is-new' : ''}${l.basis ? '' : ' is-extra'}`}>
                                = {stepText(l.tokens, formatMathNumber)}
                            </li>
                        ))}
                    </ol>
                    {done
                        ? <p className="kiosk-steps-done">Klaar! Kijk nog eens naar je antwoord.</p>
                        : <button type="button" className="kiosk-btn kiosk-btn-primary kiosk-btn-big" onClick={() => setRevealed(r => r + 1)}>Toon de volgende stap</button>}
                    <button type="button" className="kiosk-btn" aria-pressed={alle} onClick={() => setAlle(a => !a)}>
                        {alle ? 'Alle stappen: aan' : 'Alle stappen: uit'}
                    </button>
                </>
            )}
            <button type="button" className="kiosk-btn kiosk-btn-big" onClick={onNext}>Volgende oefening</button>
        </div>
    );
}
