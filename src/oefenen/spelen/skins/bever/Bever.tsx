import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { formatMathNumber } from '../../../../services/math/formatters';
import SpelKeypad from '../../SpelKeypad';
import type { SkinEndingProps, SkinProps } from '../types';
import { beverScale, damBreaks, damHeight, levelOf, waterLevel } from './water';
import './bever.css';

// Bever: a beaver builds a dam across a stream, water on the left, dry land on the right. A right answer is
// one more stick; the water rises slowly with the clock and a wave comes with each mistake. Water over the
// dam = the dam breaks (the friendly early end); held till 0:00 = a party. No rAF: the shell's clock drives it.

// The scene's units: viewBox 400 × 300, the stream bed at GROUND, one stick STICK high, the dam centred on DAM_X
// (bever.css zooms the camera round that foot).
const GROUND = 262;
const STICK = 10;
const DAM_X = 265;
// One stick = one layer of the dam: a long log across it. The top log is TOP_W long and each one lower SLOPE
// longer, so however high it grows the dam stays a wide wall with sloping faces, never a pole.
const TOP_W = 130;
const SLOPE = 8;
const layerW = (i: number, layers: number) => TOP_W + (layers - 1 - i) * SLOPE;
// A layer's sideways nudge, so the dam looks piled by paw.
const jitter = (i: number) => (((i * 7) % 5) - 2) * 2;
// The dam's downstream foot (a trickle seeps out there), and where the dry bank rises further on.
const footR = (layers: number) => DAM_X + layerW(0, Math.max(1, layers)) / 2;
const BANK_X = DAM_X + 200;
// The beaver's spots along the top, in turn per new stick (it walks the dam's length).
const SPOTS = [-24, 18, -4, 30];
// The end screen's cameras: the whole dam, the beaver and a bit of the stream either side; the burst closer up.
const ENDING_VIEW = '-140 28 700 262';
const BURST_VIEW = '40 104 490 184';

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

function Stick({ i, layers, className = '' }: { i: number; layers: number; className?: string }) {
    const w = layerW(i, layers);
    const x = DAM_X - w / 2 + jitter(i);
    const y = GROUND - (i + 1) * STICK;
    const mid = y + STICK / 2;
    return (
        <g className={`bv-stick ${className}`}>
            <rect className={`bv-wood${i % 2 ? ' is-alt' : ''}`} x={x} y={y + 1} width={w} height={STICK - 2} rx={STICK / 2 - 1} />
            <path className="bv-grain" d={`M${x + w * 0.3} ${mid} h${w * 0.25}`} />
            <ellipse className="bv-end" cx={x + 5} cy={mid} rx="2.6" ry="2.6" />
            {/* Mud packed in the seam under every other log. */}
            {i % 2 === 1 && <ellipse className="bv-mud" cx={x + w * (0.22 + ((i * 3) % 4) * 0.17)} cy={y + STICK - 1} rx="9" ry="2.6" />}
        </g>
    );
}

// The dam: a wall of logs on a mud core, from the stream bed up; `fresh` = the stick that just landed.
function Dam({ layers, fresh = -1 }: { layers: number; fresh?: number }) {
    const top = GROUND - layers * STICK;
    const wb = layerW(0, layers) / 2;
    const wt = TOP_W / 2;
    return (
        <g className="bv-dam">
            {layers > 0 && <path className="bv-core" d={`M${DAM_X - wb - 2} ${GROUND} L${DAM_X - wt + 2} ${top + 3} L${DAM_X + wt - 2} ${top + 3} L${DAM_X + wb + 2} ${GROUND} Z`} />}
            {Array.from({ length: layers }, (_, i) => <Stick key={i} i={i} layers={layers} className={i === fresh ? 'is-new' : ''} />)}
        </g>
    );
}

// Small ripples along the water's top, from far left to behind the dam (they slide one period on a loop);
// the flood's run on to the far right.
const RIPPLE = `M-2000 0 ${'q20 -6 40 0 '.repeat(56)}`;
const RIPPLE_FLOOD = `M-2000 0 ${'q20 -6 40 0 '.repeat(110)}`;

// The stream bed, the pond held back on the left (its top at `water` sticks), the dry bank with a trickle on
// the right. flood = the dam is gone: the water runs on over everything.
function Stream({ water, dam = 0, wave = 0, flood = false, children }: { water: number; dam?: number; wave?: number; flood?: boolean; children?: ReactNode }) {
    const foot = footR(dam);
    return (
        <>
            <path className="bv-bank" d={`M${BANK_X} ${GROUND} Q${BANK_X + 16} ${GROUND - 12} ${BANK_X + 40} ${GROUND - 12} L2400 ${GROUND - 12} L2400 ${GROUND + 400} L${BANK_X} ${GROUND + 400} Z`} />
            <g className="bv-water" style={{ transform: `translateY(${GROUND - water * STICK}px)` }}>
                <rect className="bv-water-body" x={-2000} y={0} width={flood ? 4400 : 2000 + DAM_X} height={Math.max(0, water * STICK) + 60} />
                <path className="bv-ripple" d={flood ? RIPPLE_FLOOD : RIPPLE} />
                {wave > 0 && (
                    <g key={wave} className="bv-wave">
                        <path d="M-60 0 Q-30 -26 0 -22 Q18 -20 26 0 Z" />
                    </g>
                )}
            </g>
            {/* Over the water's lower edge, so a rising wave never shows a gap at the bottom. */}
            <rect className="bv-bed" x={-2000} y={GROUND} width={flood ? 4400 : 2000 + BANK_X + 10} height={400} />
            {/* Downstream only a trickle seeps through: a shallow puddle on the dry bed. */}
            {!flood && <path className="bv-trickle" d={`M${foot - 16} ${GROUND} Q${foot - 6} ${GROUND - 10} ${foot + 16} ${GROUND - 8} Q${foot + 44} ${GROUND - 7} ${foot + 80} ${GROUND} Z`} />}
            {children}
        </>
    );
}

// Close to the top: the water splashes up over the dam's upstream corner.
function Spill({ layers }: { layers: number }) {
    const x = DAM_X - TOP_W / 2 + 2;
    const y = GROUND - layers * STICK + 2;
    return (
        <g className="bv-spill" style={{ transform: `translate(${x}px, ${y}px)` }}>
            <path className="bv-splash" d="M-18 4 Q-16 -9 -8 -5 Q-3 -17 4 -6 Q10 -12 14 3 Z" />
            {[[-12, -16, 3.2], [9, -19, 2.6]].map(([dx, dy, r], k) => (
                <circle key={k} className="bv-drop" cx={dx} cy={dy} r={r} style={{ '--k': k } as CSSProperties} />
            ))}
        </g>
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
    const bx = DAM_X + SPOTS[seen.n % SPOTS.length] * s;
    const by = GROUND - dam * STICK * s;
    return (
        <div className={`bv-root${phase === 'help' ? ' is-paused' : ''}${reducedMotion ? ' is-still' : ''}${close ? ' is-close' : ''}`}>
            <div className="bv-world">
                <span className="bv-sun" aria-hidden />
                <svg className="bv-svg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMax meet" aria-hidden>
                    <g className="bv-cam" style={{ transform: `scale(${s})` }}>
                        <Stream water={water} dam={dam} wave={reducedMotion ? 0 : wave}>
                            <Dam layers={dam} fresh={seen.n > 0 ? dam - 1 : -1} />
                            {close && <Spill layers={dam} />}
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
// The burst picture: the pond still high behind the stumps (POND sticks), the flood low downstream (FLOOD
// sticks), the loose logs' resting spots and tilts on the flood.
const POND = 5.5;
const FLOOD = 1.6;
const BURST_LAYERS = 7;
const POND_Y = GROUND - POND * STICK;
const FLOOD_Y = GROUND - FLOOD * STICK;
const DRIFT = [[340, -12], [405, 10], [520, -8]] as const;
const RIDER_X = DAM_X + 200;

// Half a log left standing after the burst (side -1 = upstream half), splintered at the gap.
function Stump({ i, side }: { i: number; side: -1 | 1 }) {
    const w = layerW(i, BURST_LAYERS) / 2;
    const gap = 12 + ((i * 5) % 7);
    const x = side < 0 ? DAM_X - w + jitter(i) : DAM_X + gap;
    const len = side < 0 ? w - gap - jitter(i) : w - gap;
    const y = GROUND - (i + 1) * STICK;
    const bx = side < 0 ? x + len : x;
    return (
        <g className="bv-stick">
            <rect className={`bv-wood${i % 2 ? ' is-alt' : ''}`} x={x} y={y + 1} width={len} height={STICK - 2} rx="4" />
            <path className="bv-splinter" d={`M${bx} ${y + 2} l${side * 6} 3 l${-side * 5} 3 l${side * 5} 4`} />
        </g>
    );
}

// The end screen: held = a party on the dam; broken = the beaver floats away on a log, laughing.
export function BeverEnding({ outcome, reducedMotion }: SkinEndingProps) {
    const held = outcome !== 'failed';
    return (
        <div className={`spel-ending bv-ending${held ? ' is-party' : ' is-broken'}${reducedMotion ? ' is-still' : ''}`}>
            <svg viewBox={held ? ENDING_VIEW : BURST_VIEW} preserveAspectRatio="xMidYMax meet" aria-hidden>
                <circle className="bv-sun-art" cx={held ? 470 : 110} cy={held ? 70 : 140} r={held ? 22 : 16} />
                {held ? (
                    <Stream water={6} dam={9}>
                        <Dam layers={9} />
                        <g style={{ transform: `translate(${DAM_X}px, ${GROUND - 9 * STICK}px)` }}>
                            <g className="bv-party"><BeaverArt mood="party" /></g>
                        </g>
                    </Stream>
                ) : (
                    <Stream water={FLOOD} flood>
                        {/* Burst: the pond pours through the gap between two stumps of the dam into the low flood. */}
                        <rect className="bv-water-body" x={-2000} y={POND_Y} width={2000 + DAM_X} height={GROUND - POND_Y} />
                        <path className="bv-ripple" d={RIPPLE} style={{ translate: `0 ${POND_Y}px` }} />
                        <path className="bv-gush" d={`M${DAM_X - 18} ${GROUND} L${DAM_X - 18} ${POND_Y} C${DAM_X + 12} ${POND_Y - 3} ${DAM_X + 34} ${POND_Y + 4} ${DAM_X + 62} ${FLOOD_Y} L${DAM_X + 62} ${GROUND} Z`} />
                        <g className="bv-dam is-burst">
                            {[0, 1, 2, 3, 4].map(i => <Stump key={i} i={i} side={-1} />)}
                            {[0, 1, 2].map(i => <Stump key={i} i={i} side={1} />)}
                        </g>
                        <g style={{ transform: `translate(${DAM_X}px, 0)` }}>
                            {[[-14, POND_Y, 6], [0, POND_Y - 2, 5], [52, FLOOD_Y - 1, 7], [64, FLOOD_Y - 4, 5.5], [76, FLOOD_Y, 4.5]].map(([x, y, r], k) => (
                                <circle key={k} className="bv-foam" cx={x} cy={y} r={r} style={{ '--k': k } as CSSProperties} />
                            ))}
                        </g>
                        {/* Its logs fly out of the gap and drift downstream; the beaver rides one away, laughing. */}
                        {DRIFT.map(([x, r], i) => (
                            <g key={i} className="bv-burst" style={{ '--bx': `${DAM_X - x + 40}px`, '--by': `${-40 - i * 14}px`, '--br': `${(i % 2 ? -1 : 1) * 70}deg`, '--i': i } as CSSProperties}>
                                <g className="bv-drift" style={{ '--i': i } as CSSProperties}>
                                    <rect className="bv-wood" x={x} y={FLOOD_Y - 6} width="40" height="11" rx="5" transform={`rotate(${r} ${x + 20} ${FLOOD_Y})`} />
                                </g>
                            </g>
                        ))}
                        <g className="bv-burst is-rider" style={{ '--bx': '-30px', '--by': '-50px', '--br': '-25deg' } as CSSProperties}>
                            <g className="bv-float" style={{ transform: `translate(${RIDER_X}px, ${FLOOD_Y}px)` }}>
                                <g className="bv-bob">
                                    <rect className="bv-log" x="-52" y="-10" width="104" height="22" rx="11" />
                                    <ellipse className="bv-end" cx="-44" cy="1" rx="6" ry="9" />
                                    <g transform="translate(6 -8) rotate(-8)"><BeaverArt mood="laugh" /></g>
                                </g>
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
