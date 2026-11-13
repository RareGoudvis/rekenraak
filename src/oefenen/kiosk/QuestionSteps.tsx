import { useState } from 'react';
import { formatMathNumber } from '../../services/math/formatters';
import type { StepLine } from '../../services/math/workedSteps';
import { StepLineView } from '../../components/viewer/StepTokens';

// Question steps (breuk van een hoeveelheid): one question at a time, hint first, the answer on a tap.
// Questions already answered stay above it, so the pupil reads the whole method at the end.
// onReveal(answered): the card beside it fills in the same step (breuk van een hoeveelheid: rows, groups, colour).
export default function QuestionSteps({ lines, onReveal }: { lines: StepLine[]; onReveal?(answered: number): void }) {
    const [revealed, setRevealed] = useState(0);
    const current = lines[Math.min(revealed, lines.length - 1)];
    const done = revealed >= lines.length - 1 && !lines[lines.length - 1].question;
    const visible = lines.slice(0, revealed + 1);

    return (
        <>
            <ol className="kiosk-steps-lines kiosk-steps-questions" aria-live="polite">
                {visible.map((l, i) => {
                    const answered = i < revealed || !l.question;
                    return (
                        <li key={i} className={`kiosk-math kiosk-steps-q${i === revealed ? ' is-new' : ''}`}>
                            {l.question && <p className="kiosk-steps-question">{l.question}</p>}
                            {l.hint && !answered && <p className="kiosk-steps-hint">{l.hint}</p>}
                            {answered && <p className="kiosk-steps-answer"><StepLineView line={l} fmt={formatMathNumber} /></p>}
                        </li>
                    );
                })}
            </ol>
            {done
                ? <p className="kiosk-steps-done">Klaar! Kijk nog eens naar je antwoord.</p>
                : current.question && (
                    <button type="button" className="kiosk-btn kiosk-btn-primary kiosk-btn-big" onClick={() => { setRevealed(revealed + 1); onReveal?.(revealed + 1); }}>Toon het antwoord</button>
                )}
        </>
    );
}
