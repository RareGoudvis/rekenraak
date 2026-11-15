import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { SkinProps } from '../types';
import { Burst } from '../../scene';
import { SpelChoiceFace, SpelSign } from '../../SpelVisual';
import { choiceLabel, signClass } from '../../spelChoice';
import { GardenBack, GardenFront } from './Garden';
import { eggLooks, eggState, type EggPattern } from './looks';
import './eieren.css';

// Eieren zoeken: a spring garden with nine eggs in grass tufts (3 × 3), each with a number. Tap (or 1–9) the
// egg with the answer and it cracks open into a chick, which joins the others in the basket; a wrong egg
// cracks open too and is empty (a puff, never red). Every question the eggs get new patterns and colours
// (looks.ts). Untimed. Everything moves in CSS; nothing moves under reduced motion.

// The chicks the basket can show (the round is 15).
const BASKET = 15;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

const EGG = 'M40 4 C62 4 76 40 76 62 C76 84 60 96 40 96 C20 96 4 84 4 62 C4 40 18 4 40 4 Z';
const SHELL_TOP = 'M4 62 C4 40 18 4 40 4 C62 4 76 40 76 62 L66 54 L58 62 L49 53 L40 62 L31 53 L22 62 L13 54 Z';
const SHELL_LOW = 'M4 62 L13 54 L22 62 L31 53 L40 62 L49 53 L58 62 L66 54 L76 62 C76 84 60 96 40 96 C20 96 4 84 4 62 Z';

const STAR = 'M0 -7 L2 -2 L7 0 L2 2 L0 7 L-2 2 L-7 0 L-2 -2 Z';

// Patterns sit above and below the number (its pill covers about y 43 to 69); the egg's clip trims them.
function Decor({ kind }: { kind: EggPattern }) {
    switch (kind) {
        case 'zigzag': return <path className="egg-decor" d="M4 34 L12 26 L20 34 L28 26 L36 34 L44 26 L52 34 L60 26 L68 34 L76 26 M4 82 L12 74 L20 82 L28 74 L36 82 L44 74 L52 82 L60 74 L68 82 L76 74" />;
        case 'dots': return <>{[[30, 22], [50, 20], [40, 34], [14, 38], [66, 38], [20, 80], [58, 80], [39, 88], [40, 74]].map(([x, y]) => <circle key={`${x}-${y}`} className="egg-dot" cx={x} cy={y} r="5" />)}</>;
        case 'stripes': return <path className="egg-decor" d="M0 18 L80 18 M0 32 L80 32 M0 78 L80 78 M0 90 L80 90" />;
        case 'waves': return <path className="egg-decor" d="M0 30 Q10 22 20 30 T40 30 T60 30 T80 30 M0 82 Q10 74 20 82 T40 82 T60 82 T80 82" />;
        case 'stars': return <>{[[24, 26], [52, 22], [40, 36], [20, 82], [58, 80], [40, 88]].map(([x, y]) => <path key={`${x}-${y}`} className="egg-dot" d={STAR} transform={`translate(${x} ${y}) scale(1.15)`} />)}</>;
        case 'flowers': return <>{[[26, 28], [54, 28], [22, 82], [58, 82]].map(([x, y]) => (
            <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>{[0, 72, 144, 216, 288].map(a => <circle key={a} className="egg-dot" cx="0" cy="-6" r="4.2" transform={`rotate(${a})`} />)}<circle className="egg-eye" r="3" /></g>
        ))}</>;
        case 'diamonds': return <path className="egg-dot" d="M10 30 L18 22 L26 30 L18 38 Z M30 30 L38 22 L46 30 L38 38 Z M50 30 L58 22 L66 30 L58 38 Z M20 82 L28 74 L36 82 L28 90 Z M44 82 L52 74 L60 82 L52 90 Z" />;
        default: return <path className="egg-dot" d="M0 24 L80 24 L76 34 L66 28 L56 38 L46 28 L36 38 L26 28 L16 38 L6 30 Z M0 76 L10 86 L20 76 L30 86 L40 76 L50 86 L60 76 L70 86 L80 76 L80 100 L0 100 Z" />;
    }
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

function EggArt({ open, decor }: { open: boolean; decor: EggPattern }) {
    const clip = `egg-clip-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
    return (
        <svg className="egg-art" viewBox="0 0 80 100" aria-hidden>
            {open ? (
                <>
                    <defs>
                        <clipPath id={`${clip}-t`}><path d={SHELL_TOP} /></clipPath>
                        <clipPath id={`${clip}-l`}><path d={SHELL_LOW} /></clipPath>
                    </defs>
                    <g className="egg-half egg-half-top">
                        <path className="egg-shell" d={SHELL_TOP} />
                        <g clipPath={`url(#${clip}-t)`}><Decor kind={decor} /></g>
                        <path className="egg-rim" d={SHELL_TOP} />
                    </g>
                    <path className="egg-shell" d={SHELL_LOW} />
                    <g clipPath={`url(#${clip}-l)`}><Decor kind={decor} /></g>
                    <path className="egg-rim" d={SHELL_LOW} />
                    <path className="egg-inner" d="M13 55 L22 62 L31 54 L40 62 L49 54 L58 62 L67 55 Q40 86 13 55 Z" />
                </>
            ) : (
                <>
                    <defs><clipPath id={clip}><path d={EGG} /></clipPath></defs>
                    <path className="egg-shell" d={EGG} />
                    <g clipPath={`url(#${clip})`}><Decor kind={decor} /></g>
                    <path className="egg-rim" d={EGG} />
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

    const looks = useMemo(() => eggLooks(question?.key ?? ''), [question?.key]);
    if (!question) return <div className="egg-root" />;
    const flash = phase === 'right' || phase === 'wrong';

    return (
        <div className={`egg-root${phase === 'help' ? ' is-paused' : ''}${reducedMotion ? ' is-still' : ''}`}>
            <GardenBack reducedMotion={reducedMotion} paused={phase === 'help'} />
            <span className="egg-sun" aria-hidden />
            <div className="egg-grass" aria-hidden />
            <GardenFront />
            <div className="egg-top">
                <p className={`egg-sign kiosk-math${flash ? ' is-solved' : ''}${signClass(question)}`} aria-live="polite">
                    <SpelSign question={question} feedback={feedback} flash={flash} choices={options} answerClassName="egg-sign-answer" />
                </p>
            </div>
            <div className="egg-field" role="group" aria-label="Kies het antwoord">
                {options.map((c, i) => {
                    const st = eggState(i, phase, pickedIdx, answerIdx, feedback?.correct);
                    const open = st === 'chick' || st === 'empty';
                    const look = looks[i];
                    return (
                        <div key={`${question.key}-${i}`} className={`egg-spot is-${st}`}
                            style={{ '--fill': `var(--egg-c${look.base})`, '--accent': `var(--egg-s${look.accent})`, '--i': i } as CSSProperties}>
                            <button type="button" className="egg" disabled={phase !== 'play'} aria-label={choiceLabel(c)} onClick={() => pick(i)}>
                                {st === 'chick' && <Chick className="is-out" />}
                                <EggArt open={open} decor={look.pattern} />
                                {!(st === 'chick') && <span className="egg-num kiosk-math" aria-hidden><SpelChoiceFace value={c} /></span>}
                                {open && <Burst key={`${question.key}-${i}`} kind={st === 'chick' ? 'sparkle' : 'smoke'} x="50%" y={st === 'chick' ? '40%' : '58%'} spread={st === 'chick' ? 90 : 44} count={st === 'chick' ? 10 : undefined} seed={i + 3} reducedMotion={reducedMotion} />}
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
