import { useEffect, useState } from 'react';
import { ListNumbers } from '@phosphor-icons/react';
import { formatMathNumber } from '../../services/math/formatters';
import type { HandigStrategy, StepLine } from '../../services/math/workedSteps';
import { StepLineView } from '../../components/viewer/StepTokens';
import QuestionSteps from './QuestionSteps';
import type { RenderStepsVisual } from '../../components/steps/stepsVisuals';

interface Props {
    lines: StepLine[];
    // Handig rekenen (compenseren, ontbinden): an extra view, the standard steps stay the method.
    handig?: HandigStrategy[];
    onNext(): void;
    // The review hint of the wrong answer, kept in view above the offer.
    hint?: string | null;
    // The card shows a correct way as far as `answered` questions go (descriptor solution; a no-op without one).
    onSolution?(answered: number): void;
    // The type's steps visual (stepsVisualFor), drawn above the lines as far as they are revealed.
    visual?: RenderStepsVisual;
    // A 'card' visual is drawn by the Kiosk under the exercise: it hears how far the lines are revealed (null = none yet).
    onVisual?(revealed: number | null): void;
}

// After a final fout: the pupil may open the worked steps, one Basis line per tap so they can
// think ahead; Alle stappen shows the whole solution at once, optional lines included. Volgende moves on either way. SYNC: tutor StepsView.
export default function StepsPanel({ lines, handig = [], onNext, hint, onSolution, visual, onVisual }: Props) {
    const [open, setOpen] = useState(false);
    const [revealed, setRevealed] = useState(1);
    const [alle, setAlle] = useState(false);
    const [showHandig, setShowHandig] = useState(false);

    const asking = lines.some(l => l.question);
    const basisIdx = lines.flatMap((l, i) => (l.basis ? [i] : []));
    const total = basisIdx.length;
    const upto = basisIdx[Math.min(revealed, total) - 1];
    const done = revealed >= total;
    // Once every Basis line is out, Alle also shows optional lines after the last one.
    const last = done ? lines.length - 1 : upto;
    const shownLines = lines.map((l, i) => ({ l, i })).filter(({ l, i }) => (alle ? i <= last : i <= upto && l.basis));
    // Question steps keep their visual beside the questions; only plain lines hand a 'card' visual to the Kiosk.
    const inCard = visual?.slot === 'card' && !asking;
    useEffect(() => { if (inCard) onVisual?.(open ? upto + 1 : null); }, [inCard, open, upto, onVisual]);
    useEffect(() => () => onVisual?.(null), [onVisual]);

    return (
        <div className="kiosk-steps">
            {!open ? (
                <>
                    {hint && <p className="kiosk-steps-hint-lead">{hint}</p>}
                    <p className="kiosk-steps-lead">Fout. Wil je zien hoe je het uitrekent?</p>
                    <button type="button" className="kiosk-btn kiosk-btn-primary kiosk-btn-big kiosk-steps-pulse" onClick={() => { setOpen(true); onSolution?.(asking ? 0 : Infinity); }} autoFocus>
                        <ListNumbers weight="bold" aria-hidden /> Toon de stappen
                    </button>
                </>
            ) : asking ? <QuestionSteps lines={lines} onReveal={onSolution} visual={visual} /> : (
                <>
                    {!inCard && visual?.(upto + 1)}
                    <ol className="kiosk-steps-lines" aria-live="polite">
                        {shownLines.map(({ l, i }) => (
                            <li key={i} className={`kiosk-math${i === upto ? ' is-new' : ''}${l.basis ? '' : ' is-extra'}`}>
                                <StepLineView line={l} fmt={formatMathNumber} />
                            </li>
                        ))}
                    </ol>
                    {done
                        ? <p className="kiosk-steps-done">Klaar! Kijk nog eens naar je antwoord.</p>
                        : <button type="button" className="kiosk-btn kiosk-btn-primary kiosk-btn-big" onClick={() => setRevealed(r => r + 1)}>Toon de volgende stap</button>}
                    <button type="button" className="kiosk-btn" aria-pressed={alle} onClick={() => { if (!alle) setRevealed(total); setAlle(!alle); }}>
                        {alle ? 'Alle stappen: aan' : 'Alle stappen: uit'}
                    </button>
                    {handig.length > 0 && (
                        <button type="button" className="kiosk-btn" aria-pressed={showHandig} onClick={() => setShowHandig(h => !h)}>
                            {showHandig ? 'Handig rekenen: aan' : 'Handig rekenen'}
                        </button>
                    )}
                    {showHandig && handig.map(h => (
                        <div key={h.name} className="kiosk-steps-handig">
                            <p className="kiosk-steps-lead">{h.name}</p>
                            <ol className="kiosk-steps-lines">
                                {h.lines.map((l, i) => <li key={i} className="kiosk-math"><StepLineView line={l} fmt={formatMathNumber} /></li>)}
                            </ol>
                        </div>
                    ))}
                </>
            )}
            <button type="button" className="kiosk-btn kiosk-btn-big" onClick={onNext}>Volgende oefening</button>
        </div>
    );
}
