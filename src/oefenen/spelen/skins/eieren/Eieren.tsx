import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { formatMathNumber } from '../../../../services/math/formatters';
import type { SkinProps } from '../types';
import './eieren.css';

// Eieren zoeken: a spring garden with nine eggs in grass tufts (3 × 3), each with a number. Tap (or 1–9) the
// egg with the answer and it cracks open into a chick, which joins the others in the basket; a wrong egg
// wobbles and stays. Untimed. Everything moves in CSS; nothing moves under reduced motion.

// The chicks the basket can show (the round is 15).
const BASKET = 15;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
// Each egg its own decoration, by position.
const DECOR = ['zigzag', 'dots', 'stripes'] as const;

const EGG = 'M40 4 C62 4 76 40 76 62 C76 84 60 96 40 96 C20 96 4 84 4 62 C4 40 18 4 40 4 Z';
const SHELL_TOP = 'M4 62 C4 40 18 4 40 4 C62 4 76 40 76 62 L66 54 L58 62 L49 53 L40 62 L31 53 L22 62 L13 54 Z';
const SHELL_LOW = 'M4 62 L13 54 L22 62 L31 53 L40 62 L49 53 L58 62 L66 54 L76 62 C76 84 60 96 40 96 C20 96 4 84 4 62 Z';

function Decor({ kind }: { kind: typeof DECOR[number] }) {
    // Above and below the number (its pill covers about y 43 to 69).
    if (kind === 'zigzag') return <path className="egg-decor" d="M14 34 L22 26 L30 34 L38 26 L46 34 L54 26 L62 34 L67 30 M10 80 L18 74 L26 82 L34 74 L42 82 L50 74 L58 82 L66 76 L71 80" />;
    if (kind === 'dots') return <>{[[30, 22], [50, 20], [40, 34], [20, 80], [58, 80], [39, 88]].map(([x, y]) => <circle key={`${x}-${y}`} className="egg-dot" cx={x} cy={y} r="5" />)}</>;
    return <path className="egg-decor" d="M13 32 L67 32 M6 80 L74 80" />;
}

export function Chick({ className = '' }: { className?: string }) {
    return (
        <svg className={`egg-chick ${className}`} viewBox="0 0 60 60" aria-hidden>
            <ellipse className="egg-chick-body" cx="30" cy="36" rx="22" ry="20" />
            <path className="egg-chick-wing" d="M10 38 Q4 30 12 28 Z M50 38 Q56 30 48 28 Z" />
            <path className="egg-chick-tuft" d="M27 17 Q28 8 32 12 Q34 6 36 15" />
            <circle className="egg-chick-eye" cx="23" cy="31" r="3" />
            <circle className="egg-chick-eye" cx="37" cy="31" r="3" />
            <path className="egg-chick-beak" d="M26 37 L34 37 L30 43 Z" />
        </svg>
    );
}

function EggArt({ open, decor }: { open: boolean; decor: typeof DECOR[number] }) {
    return (
        <svg className="egg-art" viewBox="0 0 80 100" aria-hidden>
            {open ? (
                <>
                    <path className="egg-shell egg-shell-top" d={SHELL_TOP} />
                    <path className="egg-shell" d={SHELL_LOW} />
                </>
            ) : (
                <>
                    <path className="egg-shell" d={EGG} />
                    <Decor kind={decor} />
                    <ellipse className="egg-shine" cx="26" cy="28" rx="6" ry="11" transform="rotate(20 26 28)" />
                </>
            )}
        </svg>
    );
}

function Tuft() {
    return (
        <svg className="egg-tuft" viewBox="0 0 120 40" preserveAspectRatio="none" aria-hidden>
            <path d="M2 40 L10 14 L18 30 L26 4 L34 28 L44 10 L52 30 L60 2 L68 30 L78 8 L86 28 L96 6 L102 30 L112 12 L118 40 Z" />
        </svg>
    );
}

function Basket({ chicks, reducedMotion }: { chicks: number; reducedMotion: boolean }) {
    const n = Math.min(chicks, BASKET);
    return (
        <div className={`egg-basket${reducedMotion ? ' is-still' : ''}`} role="img" aria-label={`${n} kuikens in het mandje`}>
            <div className="egg-basket-chicks">
                {Array.from({ length: n }, (_, k) => <span key={k} className="egg-basket-chick" style={{ '--k': k } as CSSProperties}><Chick /></span>)}
            </div>
            <svg className="egg-basket-art" viewBox="0 0 160 90" aria-hidden>
                <path className="egg-basket-handle" d="M18 26 Q80 -40 142 26" />
                <path className="egg-basket-body" d="M6 26 L154 26 L136 86 L24 86 Z" />
                <path className="egg-basket-weave" d="M10 44 L150 44 M15 62 L145 62 M45 26 L52 86 M80 26 L80 86 M115 26 L108 86" />
            </svg>
        </div>
    );
}

export default function Eieren({ question, choices, phase, feedback, onAnswer, progress, reducedMotion }: SkinProps) {
    const [picked, setPicked] = useState<{ key: string; index: number } | null>(null);
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
            const i = KEYS.indexOf(e.key);
            if (i >= 0) { e.preventDefault(); pickRef.current(i); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    if (!question) return <div className="egg-root" />;
    const flash = phase === 'right' || phase === 'wrong';
    const [lhs] = question.text.split('?');

    return (
        <div className={`egg-root${phase === 'help' ? ' is-paused' : ''}${reducedMotion ? ' is-still' : ''}`}>
            <span className="egg-sun" aria-hidden />
            <div className="egg-grass" aria-hidden />
            <div className="egg-top">
                <p className={`egg-sign kiosk-math${flash ? ' is-solved' : ''}`} aria-live="polite">
                    {flash && feedback
                        ? <>{lhs}<span className="egg-sign-answer">{formatMathNumber(Number(feedback.expected))}</span></>
                        : question.text}
                </p>
            </div>
            <div className="egg-field" role="group" aria-label="Kies het antwoord">
                {options.map((c, i) => {
                    const mine = pickedIdx === i;
                    const state = mine ? (feedback?.correct ? ' is-open' : ' is-wobble')
                        : flash && i === answerIdx && !feedback?.correct ? ' is-answer'
                        : flash ? ' is-rest' : '';
                    const open = mine && phase === 'right';
                    return (
                        <div key={`${question.key}-${i}`} className={`egg-spot${state}`} style={{ '--fill': `var(--egg-fill-${i % 6})`, '--i': i } as CSSProperties}>
                            <button type="button" className="egg" disabled={phase !== 'play'} aria-label={formatMathNumber(Number(c))} onClick={() => pick(i)}>
                                {open && <Chick className="is-out" />}
                                <EggArt open={open} decor={DECOR[(i + Math.floor(i / 3)) % DECOR.length]} />
                                {!open && <span className="egg-num kiosk-math" aria-hidden>{formatMathNumber(Number(c))}</span>}
                                <span className="egg-key" aria-hidden>{i + 1}</span>
                            </button>
                            <Tuft />
                        </div>
                    );
                })}
            </div>
            <Basket chicks={progress.right} reducedMotion={reducedMotion} />
        </div>
    );
}
