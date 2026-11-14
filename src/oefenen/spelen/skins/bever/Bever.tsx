import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { formatMathNumber } from '../../../../services/math/formatters';
import SpelKeypad from '../../SpelKeypad';
import type { SkinEndingProps, SkinProps } from '../types';
import { beverScale, damBreaks, damHeight, levelOf, waterLevel } from './water';
import './bever.css';

// Bever: a beaver builds a dam across a stream, water on the left, dry land on the right. A right answer is
// one more stick; the water rises slowly with the clock and a wave comes with each mistake. Water over the
// dam = the dam breaks (the friendly early end); held till 0:00 = a party. No rAF: the shell's clock drives it.

// The scene's units: viewBox 400 × 300, the stream bed at GROUND, one stick STICK high, the dam centred on DAM_X.
const GROUND = 262;
const STICK = 14;
const DAM_X = 213;
const DAM_W = 54;

// A stick's sideways nudge, so the dam looks piled by paw; the lower sticks are longer (a dam, not a pole).
const jitter = (i: number) => ((i * 7) % 5) - 2;
const stickW = (i: number) => Math.max(DAM_W, DAM_W + 30 - i * 2);
// The end screen's camera: the whole dam, the beaver and a bit of the stream either side.
const ENDING_VIEW = '-140 28 700 262';

export function BeaverArt({ mood = 'busy' }: { mood?: 'busy' | 'laugh' | 'party' }) {
    const happy = mood !== 'busy';
    return (
        <g className="bv-beaver-art">
            <ellipse className="bv-tail" cx="26" cy="-9" rx="22" ry="8" transform="rotate(-18 26 -9)" />
            <path className="bv-tail-line" d="M14 -12 L36 -14 M16 -5 L38 -8" />
            <ellipse className="bv-fur" cx="4" cy="-25" rx="20" ry="24" />
            <ellipse className="bv-belly" cx="-4" cy="-21" rx="11" ry="16" />
            <ellipse className="bv-fur" cx="-6" cy="-3" rx="10" ry="4.5" />
            <circle className="bv-fur" cx="-2" cy="-64" r="5" />
            <circle className="bv-fur" cx="-10" cy="-53" r="16" />
            <ellipse className="bv-snout" cx="-23" cy="-49" rx="10" ry="7.5" />
            <circle className="bv-nose" cx="-31" cy="-52" r="3.5" />
            <rect className="bv-tooth" x="-26" y="-43" width="7" height="8" rx="1.5" />
            {happy ? (
                <>
                    <path className="bv-line" d="M-17 -58 Q-13 -63 -9 -58" />
                    <path className="bv-mouth" d="M-30 -45 Q-24 -36 -16 -44" />
                </>
            ) : (
                <>
                    <circle className="bv-eye" cx="-13" cy="-58" r="3.6" />
                    <circle className="bv-glint" cx="-12" cy="-59" r="1.1" />
                </>
            )}
            <ellipse className="bv-fur bv-arm" cx="-17" cy="-28" rx="5" ry="10" transform="rotate(25 -17 -28)" />
            {mood === 'party' && (
                <g className="bv-hat">
                    <path d="M-20 -66 L-8 -96 L4 -66 Z" />
                    <circle cx="-8" cy="-97" r="4.5" />
                </g>
            )}
        </g>
    );
}

function Stick({ i, className = '' }: { i: number; className?: string }) {
    const w = stickW(i);
    const x = DAM_X - w / 2 + jitter(i);
    const y = GROUND - (i + 1) * STICK;
    return (
        <g className={`bv-stick ${className}`}>
            <rect className={`bv-wood${i % 2 ? ' is-alt' : ''}`} x={x} y={y + 1} width={w} height={STICK - 2} rx="6" />
            <circle className="bv-end" cx={x + 6} cy={y + STICK / 2} r={STICK / 2 - 3} />
        </g>
    );
}

// Small ripples along the water's top, from far left to behind the dam (they slide one period on a loop).
const RIPPLE = `M-2000 0 ${'q20 -6 40 0 '.repeat(56)}`;

// The stream bed, the dry bank on the right, and the water on the left (its top at `water` sticks).
// flood = the dam is gone: the water runs on over the bank.
function Stream({ water, wave = 0, flood = false, children }: { water: number; wave?: number; flood?: boolean; children?: ReactNode }) {
    return (
        <>
            <path className="bv-bank" d={`M${DAM_X + 20} ${GROUND} L${DAM_X + 44} ${GROUND - 10} L2400 ${GROUND - 10} L2400 ${GROUND + 400} L${DAM_X + 20} ${GROUND + 400} Z`} />
            <g className="bv-water" style={{ transform: `translateY(${GROUND - water * STICK}px)` }}>
                <rect className="bv-water-body" x={-2000} y={0} width={flood ? 4400 : 2000 + DAM_X - 10} height={Math.max(0, water * STICK) + 60} />
                <path className="bv-ripple" d={RIPPLE} />
                {wave > 0 && (
                    <g key={wave} className="bv-wave">
                        <path d="M-60 0 Q-30 -26 0 -22 Q18 -20 26 0 Z" />
                    </g>
                )}
            </g>
            {/* Over the water's lower edge, so a rising wave never shows a gap at the bottom. */}
            <rect className="bv-bed" x={-2000} y={GROUND} width={flood ? 4400 : 2000 + DAM_X + 20} height={400} />
            {children}
        </>
    );
}

export default function Bever({ question, phase, feedback, onAnswer, onFail, progress, options, reducedMotion }: SkinProps) {
    const level = levelOf(options);
    const elapsed = progress.msTotal !== null && progress.msLeft !== null ? progress.msTotal - progress.msLeft : 0;
    const water = waterLevel(level, elapsed, progress.mistakes);
    const dam = damHeight(progress.right);
    // A stick just landed: it drops in and the beaver hops (keyed per stick). A counted mistake rolls a wave in.
    const [seen, setSeen] = useState({ dam, n: 0, mistakes: progress.mistakes, wave: 0 });
    if (seen.dam !== dam || seen.mistakes !== progress.mistakes) {
        setSeen({ dam, n: seen.n + (seen.dam !== dam ? 1 : 0), mistakes: progress.mistakes, wave: seen.wave + (progress.mistakes > seen.mistakes ? 1 : 0) });
    }
    const wave = seen.wave;

    // The water over the dam: the friendly early end, once. Never under help (the clock stands still there).
    const failed = useRef(false);
    const breaks = damBreaks(water, dam);
    useEffect(() => {
        if (breaks && !failed.current && phase !== 'help') { failed.current = true; onFail(); }
    }, [breaks, phase, onFail]);

    if (!question) return <div className="bv-root" />;
    const flash = phase === 'right' || phase === 'wrong';
    const [lhs] = question.text.split('?');
    const s = beverScale(dam, water);
    const close = dam - water < 1.5;
    const bx = DAM_X + 8 * s;
    const by = GROUND - dam * STICK * s;
    return (
        <div className={`bv-root${phase === 'help' ? ' is-paused' : ''}${reducedMotion ? ' is-still' : ''}${close ? ' is-close' : ''}`}>
            <div className="bv-world">
                <span className="bv-sun" aria-hidden />
                <svg className="bv-svg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMax meet" aria-hidden>
                    <g className="bv-cam" style={{ transform: `scale(${s})` }}>
                        <Stream water={water} wave={reducedMotion ? 0 : wave}>
                            <g className="bv-dam">
                                {Array.from({ length: dam }, (_, i) => (
                                    <Stick key={i} i={i} className={i === dam - 1 && seen.n > 0 ? 'is-new' : ''} />
                                ))}
                            </g>
                        </Stream>
                    </g>
                    <g className="bv-beaver" style={{ transform: `translate(${bx}px, ${by}px) scale(${Math.max(0.55, s)})` }}>
                        <g key={seen.n} className={seen.n > 0 ? 'bv-hop' : ''}><BeaverArt /></g>
                    </g>
                </svg>
            </div>
            <div className="bv-panel">
                <p className="bv-sign kiosk-math" aria-live="polite">
                    {flash && feedback
                        ? <>{lhs}<span className="bv-sign-answer">{formatMathNumber(Number(feedback.expected))}</span></>
                        : question.text}
                </p>
                <SpelKeypad questionKey={question.key} onAnswer={onAnswer} disabled={phase !== 'play'} />
            </div>
        </div>
    );
}

const CONFETTI = 14;

// The end screen: held = a party on the dam; broken = the beaver floats away on a log, laughing.
export function BeverEnding({ outcome, reducedMotion }: SkinEndingProps) {
    const held = outcome !== 'failed';
    return (
        <div className={`spel-ending bv-ending${held ? ' is-party' : ' is-broken'}${reducedMotion ? ' is-still' : ''}`}>
            <svg viewBox={ENDING_VIEW} preserveAspectRatio="xMidYMax meet" aria-hidden>
                <circle className="bv-sun-art" cx="470" cy="70" r="22" />
                {held ? (
                    <Stream water={6}>
                        <g className="bv-dam">{Array.from({ length: 9 }, (_, i) => <Stick key={i} i={i} />)}</g>
                        <g style={{ transform: `translate(${DAM_X + 8}px, ${GROUND - 9 * STICK}px)` }}>
                            <g className="bv-party"><BeaverArt mood="party" /></g>
                        </g>
                    </Stream>
                ) : (
                    <Stream water={2.6} flood>
                        {/* The dam is gone: its sticks drift downstream, the beaver rides a log. */}
                        {[[150, 0], [250, 1], [320, 2], [90, 3]].map(([x, i]) => (
                            <g key={i} className="bv-drift" style={{ '--i': i } as CSSProperties}>
                                <rect className="bv-wood" x={x} y={GROUND - 2.6 * STICK - 6} width="40" height="11" rx="5" transform={`rotate(${(i % 2 ? 1 : -1) * 12} ${x + 20} ${GROUND - 2.6 * STICK})`} />
                            </g>
                        ))}
                        <g className="bv-float" style={{ transform: `translate(200px, ${GROUND - 2.6 * STICK}px)` }}>
                            <g className="bv-bob">
                                <rect className="bv-log" x="-52" y="-10" width="104" height="22" rx="11" />
                                <ellipse className="bv-end" cx="-44" cy="1" rx="6" ry="9" />
                                <g transform="translate(6 -8) rotate(-8)"><BeaverArt mood="laugh" /></g>
                            </g>
                        </g>
                    </Stream>
                )}
            </svg>
            {held && (
                <span className="bv-confetti" aria-hidden>
                    {Array.from({ length: CONFETTI }, (_, i) => (
                        <span key={i} className="bv-bit" style={{ '--i': i, '--x': `${(i * 41) % 100}%`, '--c': `var(--spel-fill-${1 + (i % 5)})` } as CSSProperties} />
                    ))}
                </span>
            )}
        </div>
    );
}
