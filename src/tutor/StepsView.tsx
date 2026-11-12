import { useState } from 'react';
import { formatMathNumber } from '../services/math/formatters';
import { stepText, type StepLine } from '../services/math/workedSteps';

// One sum's worked steps: nothing until the pupil asks, then one Basis line per tap (the newest
// in blue), with Alle stappen adding the optional in-between lines. SYNC: oefenen StepsPanel.
export default function StepsView({ sum, lines }: { sum: string; lines: StepLine[] }) {
    const [revealed, setRevealed] = useState(0);
    const [alle, setAlle] = useState(false);
    const basisIdx = lines.flatMap((l, i) => (l.basis ? [i] : []));
    const total = basisIdx.length;
    const upto = revealed > 0 ? basisIdx[Math.min(revealed, total) - 1] : -1;
    const shown = lines.map((l, i) => ({ l, i })).filter(({ l, i }) => i <= upto && (alle || l.basis));
    const done = total > 0 && revealed >= total;

    return (
        <>
            <div className="tutor-card">
                <div className="tutor-sum">{sum}</div>
                {shown.length > 0 ? (
                    <ol className="tutor-lines" aria-live="polite">
                        {shown.map(({ l, i }) => (
                            <li key={i} className={`${i === upto ? 'is-new' : ''}${l.basis ? '' : ' is-extra'}`}>= {stepText(l.tokens, formatMathNumber)}</li>
                        ))}
                    </ol>
                ) : (
                    <p className="tutor-quiet">Probeer het eerst zelf op je blad. Lukt het niet? Tik op de knop.</p>
                )}
            </div>
            {done
                ? <p className="tutor-done">Klaar! Vergelijk met jouw blad.</p>
                : <button type="button" className="tutor-btn tutor-btn-primary" onClick={() => setRevealed(r => r + 1)}>
                    {revealed === 0 ? 'Toon de eerste stap' : 'Toon de volgende stap'}
                </button>}
            <button type="button" className="tutor-btn" aria-pressed={alle} onClick={() => setAlle(a => !a)}>
                {alle ? 'Alle stappen: aan' : 'Alle stappen: uit'}
            </button>
            {revealed > 0 && <button type="button" className="tutor-btn tutor-btn-quiet" onClick={() => setRevealed(0)}>Opnieuw beginnen</button>}
        </>
    );
}
