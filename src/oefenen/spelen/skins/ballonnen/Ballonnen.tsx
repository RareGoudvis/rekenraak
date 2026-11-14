import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { Star } from '@phosphor-icons/react';
import { formatMathNumber } from '../../../../services/math/formatters';
import type { SkinProps } from '../types';
import './ballonnen.css';

// Ballonnen: the sum on a sign, four balloons rise from the grass. Tap (or 1–4) the right one and it pops;
// a wrong one floats gently away while the right balloon lights up. Drawn in code, animated with transforms only.

const BITS = 10;
// A streak this long earns the "op een rij" ribbon (owner brief: praise, never shame).
const RIBBON_FROM = 3;
const RIBBON_MS = 1400;

function Cloud({ className }: { className: string }) {
    return (
        <svg className={`bal-cloud ${className}`} viewBox="0 0 120 60" aria-hidden>
            <path d="M18 50 Q4 50 6 38 Q8 27 22 29 Q24 12 42 14 Q52 2 68 10 Q84 4 90 20 Q110 18 112 34 Q116 50 98 50 Z" />
        </svg>
    );
}

function BalloonArt() {
    return (
        <svg className="bal-art" viewBox="0 0 100 160" aria-hidden>
            <path className="bal-string" d="M50 110 C 42 124, 58 136, 50 158" />
            <path className="bal-knot" d="M43 112 L57 112 L50 101 Z" />
            <ellipse className="bal-body" cx="50" cy="54" rx="42" ry="50" />
            <ellipse className="bal-shine" cx="33" cy="34" rx="7" ry="13" transform="rotate(25 33 34)" />
        </svg>
    );
}

export default function Ballonnen({ question, choices, phase, feedback, onAnswer, events, reducedMotion }: SkinProps) {
    const [picked, setPicked] = useState<{ key: string; index: number } | null>(null);
    const [ribbon, setRibbon] = useState<{ count: number; at: number } | null>(null);
    const options = choices ?? [];
    const pickedIdx = picked && question && picked.key === question.key ? picked.index : null;
    const answerIdx = feedback ? options.indexOf(feedback.expected) : -1;

    const pick = (i: number) => {
        if (phase !== 'play' || !question || options[i] === undefined) return;
        setPicked({ key: question.key, index: i });
        onAnswer(options[i]);
    };
    const pickRef = useRef(pick);
    useLayoutEffect(() => { pickRef.current = pick; });

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
            const i = ['1', '2', '3', '4'].indexOf(e.key);
            if (i >= 0) { e.preventDefault(); pickRef.current(i); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    useEffect(() => events.on('streak', ({ count }) => { if (count >= RIBBON_FROM) setRibbon({ count, at: Date.now() }); }), [events]);
    useEffect(() => {
        if (!ribbon) return;
        const id = window.setTimeout(() => setRibbon(null), RIBBON_MS);
        return () => window.clearTimeout(id);
    }, [ribbon]);

    if (!question) return <div className="bal-sky" />;
    const flash = phase === 'right' || phase === 'wrong';
    const [lhs] = question.text.split('?');

    return (
        <div className="bal-sky">
            <Cloud className="bal-cloud-a" />
            <Cloud className="bal-cloud-b" />
            <Cloud className="bal-cloud-c" />
            <svg className="bal-hills" viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden>
                <path d="M0 34 Q60 6 130 28 T260 24 T400 20 L400 60 L0 60 Z" />
            </svg>

            <div className="bal-top">
                <p className={`bal-sign kiosk-math${flash ? ' is-solved' : ''}`} aria-live="polite">
                    {flash && feedback
                        ? <>{lhs}<span className="bal-sign-answer">{formatMathNumber(Number(feedback.expected))}</span></>
                        : question.text}
                </p>
                {ribbon && (
                    <p key={ribbon.at} className="bal-ribbon" role="status">
                        <Star weight="fill" aria-hidden /> {ribbon.count} op een rij!
                    </p>
                )}
            </div>

            <div key={question.key} className="bal-row" role="group" aria-label="Kies het antwoord">
                {options.map((c, i) => {
                    const state = pickedIdx === i ? (feedback?.correct ? ' is-popped' : ' is-away')
                        : flash && i === answerIdx && !feedback?.correct ? ' is-answer'
                        : flash ? ' is-rest' : '';
                    return (
                        <div key={`${question.key}-${i}`} className={`bal-slot${state}`}
                            style={{ '--i': i, '--fill': `var(--spel-fill-${(question.index + i) % 6})` } as CSSProperties}>
                            <div className="bal-rise">
                                <div className="bal-bob">
                                    <button type="button" className="bal" onClick={() => pick(i)} disabled={phase !== 'play'}
                                        aria-label={formatMathNumber(Number(c))}>
                                        <BalloonArt />
                                        {i === answerIdx && !feedback?.correct && <span className="bal-ring" aria-hidden />}
                                        <span className="bal-num kiosk-math" aria-hidden>{formatMathNumber(Number(c))}</span>
                                        <span className="bal-key" aria-hidden>{i + 1}</span>
                                    </button>
                                    {state === ' is-popped' && !reducedMotion && (
                                        <span className="bal-burst" aria-hidden>
                                            {Array.from({ length: BITS }, (_, b) => <span key={b} className="bal-bit" style={{ '--a': `${(360 / BITS) * b}deg` } as CSSProperties} />)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
