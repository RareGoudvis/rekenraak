import { useState } from 'react';
import { formatMathNumber } from '../../services/math/formatters';
import type { StepLine } from '../../services/math/workedSteps';
import { StepLineView } from '../../components/viewer/StepTokens';
import type { RenderStepsVisual } from '../../components/steps/stepsVisuals';

// The kiosk and the stappenhulp (tutor.html) run this one component, so their breukvragen never disagree; only the classes differ.
const LOOKS = {
    kiosk: {
        list: 'kiosk-steps-lines kiosk-steps-questions', item: 'kiosk-math kiosk-steps-q', question: 'kiosk-steps-question', hint: 'kiosk-steps-hint',
        answer: 'kiosk-steps-answer', done: 'kiosk-steps-done', doneText: 'Klaar! Kijk nog eens naar je antwoord.', button: 'kiosk-btn kiosk-btn-primary kiosk-btn-big',
    },
    tutor: {
        list: 'tutor-lines tutor-questions', item: 'tutor-q', question: 'tutor-q-question', hint: 'tutor-q-hint',
        answer: 'tutor-q-answer', done: 'tutor-done', doneText: 'Klaar! Vergelijk met jouw blad.', button: 'tutor-btn tutor-btn-primary',
    },
};

// Question steps (breuk van een hoeveelheid): one question at a time, hint first, the answer on a tap.
// Questions already answered stay above it, so the pupil reads the whole method at the end.
// onReveal(answered): the card beside it fills in the same step (breuk van een hoeveelheid: rows, groups, colour).
// visual: the type's steps visual, drawn above the questions as far as they are answered.
export default function QuestionSteps({ lines, onReveal, look = 'kiosk', visual }: { lines: StepLine[]; onReveal?(answered: number): void; look?: keyof typeof LOOKS; visual?: RenderStepsVisual }) {
    const [revealed, setRevealed] = useState(0);
    const cls = LOOKS[look];
    const current = lines[Math.min(revealed, lines.length - 1)];
    const done = revealed >= lines.length - 1 && !lines[lines.length - 1].question;
    const visible = lines.slice(0, revealed + 1);

    return (
        <>
            {visual?.(revealed)}
            <ol className={cls.list} aria-live="polite">
                {visible.map((l, i) => {
                    const answered = i < revealed || !l.question;
                    return (
                        <li key={i} className={`${cls.item}${i === revealed ? ' is-new' : ''}`}>
                            {l.question && <p className={cls.question}>{l.question}</p>}
                            {l.hint && !answered && <p className={cls.hint}>{l.hint}</p>}
                            {answered && <p className={cls.answer}><StepLineView line={l} fmt={formatMathNumber} /></p>}
                        </li>
                    );
                })}
            </ol>
            {done
                ? <p className={cls.done}>{cls.doneText}</p>
                : current.question && (
                    <button type="button" className={cls.button} onClick={() => { setRevealed(revealed + 1); onReveal?.(revealed + 1); }}>Toon het antwoord</button>
                )}
        </>
    );
}
