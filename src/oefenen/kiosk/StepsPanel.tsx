import { useEffect, useState } from 'react';
import { ArrowCounterClockwise, ListNumbers } from '@phosphor-icons/react';
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
    // Spelen's "Hoe los ik dit op?": the pupil asked, so the lines show at once and the last button resumes the game.
    startOpen?: boolean;
    nextLabel?: string;
    // The line when every step is shown; Spelen's help has no answer yet to look back at.
    doneText?: string;
    // The kiosk after a fout: the pupil's wrong answer (struck through, grey) and Nog eens proberen.
    given?: string | null;
    onRetry?(): void;
}

// After a final fout: the pupil may open the worked steps, one Basis line per tap so they can
// think ahead; Alle stappen shows the whole solution at once, optional lines included. Volgende moves on either way. SYNC: tutor StepsView.
export default function StepsPanel({ lines, handig = [], onNext, hint, onSolution, visual, onVisual, startOpen = false, nextLabel = 'Volgende oefening', doneText = 'Klaar! Kijk nog eens naar je antwoord.', given, onRetry }: Props) {
    const [open, setOpen] = useState(startOpen);
    const [revealed, setRevealed] = useState(1);
    const [alle, setAlle] = useState(false);
    const [showHandig, setShowHandig] = useState(false);

    const asking = lines.some(l => l.question);
    // No lines, only a picture (MAB for 3 + 4): each tap shows its next stage; revealed 1 = the first view.
    const pictureOnly = lines.length === 0 && !!visual?.stages;
    const basisIdx = lines.flatMap((l, i) => (l.basis ? [i] : []));
    const total = pictureOnly ? visual!.stages! + 1 : basisIdx.length;
    const upto = basisIdx[Math.min(revealed, total) - 1];
    const done = revealed >= total;
    const stage = pictureOnly ? Math.min(revealed, total) - 1 : upto + 1;
    // Once every Basis line is out, Alle also shows optional lines after the last one.
    const last = done ? lines.length - 1 : upto;
    const shownLines = lines.map((l, i) => ({ l, i })).filter(({ l, i }) => (alle ? i <= last : i <= upto && l.basis));
    // Question steps keep their visual beside the questions; only plain lines hand a 'card' visual to the Kiosk.
    const inCard = visual?.slot === 'card' && !asking;
    useEffect(() => { if (inCard) onVisual?.(open ? stage : null); }, [inCard, open, stage, onVisual]);
    useEffect(() => () => onVisual?.(null), [onVisual]);

    // Grey and struck through, never red: what the pupil answered.
    const givenLine = given ? <p className="kiosk-steps-given">Jouw antwoord: <span className="kiosk-math kiosk-struck">{given}</span></p> : null;

    return (
        <div className="kiosk-steps">
            {!open ? (
                <>
                    {hint && <p className="kiosk-steps-hint-lead">{hint}</p>}
                    <p className="kiosk-steps-lead">{pictureOnly ? 'Fout. Wil je het zien met blokjes?' : 'Fout. Wil je zien hoe je het uitrekent?'}</p>
                    {givenLine}
                    <button type="button" className="kiosk-btn kiosk-btn-help kiosk-btn-big kiosk-steps-pulse" onClick={() => { setOpen(true); onSolution?.(asking ? 0 : Infinity); }} autoFocus>
                        <ListNumbers weight="bold" aria-hidden /> {pictureOnly ? 'Toon de blokjes' : 'Toon de stappen'}
                    </button>
                </>
            ) : (
                <>
                    {onRetry && (
                        <div className="kiosk-steps-head">
                            <p className="kiosk-steps-cheer">Bijna! Kijk even mee.</p>
                            {givenLine}
                        </div>
                    )}
                    {asking ? <QuestionSteps lines={lines} onReveal={onSolution} visual={visual} /> : (
                    <>
                        {!inCard && visual?.(stage)}
                        {!pictureOnly && (
                            <ol className="kiosk-steps-lines" aria-live="polite">
                                {shownLines.map(({ l, i }) => (
                                    <li key={i} className={`kiosk-math${i === upto ? ' is-new' : ''}${l.basis ? '' : ' is-extra'}`}>
                                        <StepLineView line={l} fmt={formatMathNumber} />
                                    </li>
                                ))}
                            </ol>
                        )}
                        {done
                            ? <p className="kiosk-steps-done">{doneText}</p>
                            : <button type="button" className="kiosk-btn kiosk-btn-help kiosk-btn-big" onClick={() => setRevealed(r => r + 1)}>Toon de volgende stap</button>}
                        {/* The picture has no optional lines to switch on, so Alle stappen just jumps to the end. */}
                        {pictureOnly
                            ? !done && <button type="button" className="kiosk-btn" onClick={() => setRevealed(total)}>Alle stappen</button>
                            : (
                                <button type="button" className="kiosk-btn" aria-pressed={alle} onClick={() => { if (!alle) setRevealed(total); setAlle(!alle); }}>
                                    {alle ? 'Alle stappen: aan' : 'Alle stappen: uit'}
                                </button>
                            )}
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
                    {onRetry && (
                        <button type="button" className="kiosk-btn kiosk-btn-primary kiosk-btn-big" onClick={onRetry}>
                            <ArrowCounterClockwise weight="bold" aria-hidden /> Nog eens proberen
                        </button>
                    )}
                </>
            )}
            <button type="button" className={`kiosk-btn${onRetry ? ' kiosk-steps-next' : ' kiosk-btn-big'}`} onClick={onNext}>{nextLabel}</button>
        </div>
    );
}
