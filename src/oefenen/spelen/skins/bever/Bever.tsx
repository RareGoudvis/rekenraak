import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { SpelSignBox } from '../../SpelVisual';
import SpelKeypad from '../../SpelKeypad';
import type { SkinEndingProps, SkinProps } from '../types';
import { beverScale, damBreaks, damHeight, levelOf, waterLevel } from './water';
import { actOf, beaverFace, dayOf, familyMood, type BeaverAct, type FamilyMood } from './family';
import { BabyArt, BeaverArt, Bird, Cloud, Dragonfly, Lodge, Reeds, type BabyLook } from './art';
import './bever.css';

// Bever: a beaver builds a dam across a stream, the pond on the left, his family's lodge on the dry side on
// the right. A right answer is one more stick; the water rises slowly with the clock and a wave comes with
// each mistake. Water over the dam = the dam breaks (the friendly early end); held till 0:00 = a party.
// No rAF: the shell's clock drives the water, CSS loops make the scene live.

// The scene's units: viewBox 400 × 300, the stream bed at GROUND, one stick STICK high, the dam centred on DAM_X
// (bever.css zooms the camera round that foot: SYNC .bv-cam transform-origin).
const GROUND = 262;
const STICK = 10;
const DAM_X = 172;
// One stick = one layer of the dam: a long log across it. The top log is TOP_W long and each one lower SLOPE
// longer, so however high it grows the dam stays a wide wall with sloping faces, never a pole.
const TOP_W = 120;
const SLOPE = 6;
const layerW = (i: number, layers: number) => TOP_W + (layers - 1 - i) * SLOPE;
// A layer's sideways nudge, so the dam looks piled by paw.
const jitter = (i: number) => (((i * 7) % 5) - 2) * 2;
// The dam's downstream foot (a trickle seeps out there), and where the dry bank rises further on.
const footR = (layers: number) => DAM_X + layerW(0, Math.max(1, layers)) / 2;
const BANK_X = 392;
// The family keeps this far from the dam's foot; zoomed far out it grows back up to FAMILY_MIN of its size, so
// the babies stay readable on a phone.
const LODGE_GAP = 60;
const FAMILY_MIN = 0.6;
// The beaver's spots along the top, in turn per new stick (he walks the dam's length).
const SPOTS = [-24, 18, -4, 30];
// The end screen's cameras: the dam with the whole family on top; the burst, the swimmer and the raft.
const ENDING_VIEW = '0 64 390 210';
const BURST_VIEW = '78 150 392 126';

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

// Small ripples along the water's top, from far left to behind the dam (they slide one period on a loop, so
// they end a period short of DAM_X); the flood's run on to the far right.
const RIPPLE = `M-2000 0 ${'q20 -6 40 0 '.repeat(54)}`;
const RIPPLE_FLOOD = `M-2000 0 ${'q20 -6 40 0 '.repeat(110)}`;
// The pond's current: light streaks at three depths and two leaves on the top, all drifting to the dam.
const STREAKS = [[-30, 12, 0], [20, 28, 1], [-60, 44, 2], [44, 18, 3], [-4, 60, 4]] as const;

// The stream bed, the pond held back on the left (its top at `water` sticks), the dry bank with a trickle on
// the right. flood = the dam is gone: the water runs on over everything. behind = drawn under the water (reeds).
function Stream({ water, dam = 0, wave = 0, flood = false, behind, children }: { water: number; dam?: number; wave?: number; flood?: boolean; behind?: ReactNode; children?: ReactNode }) {
    const foot = footR(dam);
    return (
        <>
            <path className="bv-bank" d={`M${BANK_X} ${GROUND} Q${BANK_X + 16} ${GROUND - 12} ${BANK_X + 40} ${GROUND - 12} L2400 ${GROUND - 12} L2400 ${GROUND + 400} L${BANK_X} ${GROUND + 400} Z`} />
            {behind}
            <g className="bv-water" style={{ transform: `translateY(${GROUND - water * STICK}px)` }}>
                <rect className="bv-water-body" x={-2000} y={0} width={flood ? 4400 : 2000 + DAM_X} height={Math.max(0, water * STICK) + 60} />
                {!flood && STREAKS.map(([x, y, k]) => <path key={k} className="bv-streak" d={`M${x} ${y} h26`} style={{ '--k': k } as CSSProperties} />)}
                <path className="bv-ripple" d={flood ? RIPPLE_FLOOD : RIPPLE} />
                {!flood && [0, 1].map(k => (
                    <g key={k} className="bv-leaf" style={{ '--k': k } as CSSProperties}>
                        <path d="M-9 0 Q0 -8 9 -1 Q0 5 -9 0 Z" />
                    </g>
                ))}
                {wave > 0 && (
                    <g key={wave} className="bv-wave">
                        {/* A curling crest with a drop of spray. */}
                        <path d="M-70 0 Q-38 -4 -22 -22 Q-8 -36 10 -28 Q16 -25 14 -20 Q4 -24 -2 -16 Q4 -6 24 0 Z" />
                        <circle cx="18" cy="-34" r="2.6" />
                    </g>
                )}
            </g>
            {/* Over the water's lower edge, so a rising wave never shows a gap at the bottom. */}
            <rect className="bv-bed" x={-2000} y={GROUND} width={flood ? 4400 : 2000 + BANK_X + 10} height={400} />
            {/* Downstream only a trickle seeps through: a shallow puddle on the dry bed. */}
            {!flood && <path className="bv-trickle" d={`M${foot - 12} ${GROUND} Q${foot - 4} ${GROUND - 8} ${foot + 12} ${GROUND - 6} Q${foot + 30} ${GROUND - 5} ${foot + 44} ${GROUND} Z`} />}
            {children}
        </>
    );
}

// A local water front over something floating in the flood (its lower part goes under; the clip ends it at the bed).
function Surface({ w }: { w: number }) {
    return (
        <g className="bv-surface">
            <rect className="bv-water-body" x={-w / 2} y={1} width={w} height={60} />
            <path className="bv-surface-line" d={`M${-w / 2} 1 ${'q6 -4 12 0 '.repeat(Math.round(w / 12))}`} />
        </g>
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

// The three babies round the lodge: one plays with a pine cone, one waves from the roof, one hops. Watching
// they stand still and look up at the dam; nervous they huddle at the door, trembling (positions in CSS).
const BABIES = [
    { id: 'cone', x: -52, y: 0 },
    { id: 'roof', x: -6, y: -52 },
    { id: 'hop', x: 44, y: 0 },
] as const;

function Family({ mood }: { mood: FamilyMood }) {
    const look: BabyLook = mood === 'play' ? 'play' : mood;
    return (
        <g className="bv-family">
            <Lodge />
            {BABIES.map(b => (
                <g key={b.id} className={`bv-baby is-${b.id}`} style={{ '--bx': `${b.x}px`, '--by': `${b.y}px` } as CSSProperties}>
                    <g className="bv-baby-move"><BabyArt look={look} cone={b.id === 'cone'} /></g>
                </g>
            ))}
        </g>
    );
}

// The sky over the world box: drifting clouds (lanes slide the whole box width, so they wrap).
const CLOUDS = [
    { y: 6, w: 15, d: 80, at: -10 },
    { y: 17, w: 10, d: 110, at: -70 },
    { y: 28, w: 13, d: 95, at: -45 },
];

export default function Bever({ question, phase, feedback, onAnswer, onFail, progress, options, reducedMotion }: SkinProps) {
    const level = levelOf(options);
    const elapsed = progress.msTotal !== null && progress.msLeft !== null ? progress.msTotal - progress.msLeft : 0;
    const water = waterLevel(level, elapsed, progress.mistakes);
    const dam = damHeight(progress.right);
    // A stick just landed: the beaver carries it in (keyed per stick; what he does after comes with it). A
    // counted mistake rolls a wave in.
    // A cheer lasts till the next answer (the right flash is shorter than his jump); a mistake ends it.
    const [seen, setSeen] = useState<{ dam: number; n: number; mistakes: number; wave: number; act: BeaverAct; cheer: boolean }>(
        { dam, n: 0, mistakes: progress.mistakes, wave: 0, act: 'place', cheer: false });
    if (seen.dam !== dam || seen.mistakes !== progress.mistakes) {
        const placed = seen.dam !== dam;
        const act = placed ? actOf(seen.n + 1, progress.streak) : seen.act;
        setSeen({
            dam,
            n: seen.n + (placed ? 1 : 0),
            mistakes: progress.mistakes,
            wave: seen.wave + (progress.mistakes > seen.mistakes ? 1 : 0),
            act,
            cheer: placed ? act === 'cheer' : false,
        });
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
    const s = beverScale(dam, water);
    const close = dam - water < 1.5;
    const mood = familyMood(dam, water);
    const cheering = seen.cheer && phase !== 'wrong';
    const face = beaverFace(mood, phase === 'wrong', cheering);
    const bx = DAM_X + SPOTS[seen.n % SPOTS.length] * s;
    const by = GROUND - dam * STICK * s;
    // Zoomed far out the family is drawn a bit bigger than the camera, and moves out to keep its gap.
    const k = s < FAMILY_MIN ? FAMILY_MIN / s : 1;
    const lodgeX = footR(dam) + LODGE_GAP * k;
    const cls = ['bv-root', `is-${mood}`, phase === 'help' && 'is-paused', reducedMotion && 'is-still', close && 'is-close', phase === 'wrong' && 'is-wrong', cheering && 'is-cheer']
        .filter(Boolean).join(' ');
    return (
        <div className={cls} style={{ '--bv-day': dayOf(progress.msLeft, progress.msTotal) } as CSSProperties}>
            <div className="bv-world">
                <span className="bv-sun" aria-hidden />
                <div className="bv-clouds" aria-hidden>
                    {CLOUDS.map((c, i) => (
                        <div key={i} className="bv-cloud-lane" style={{ '--y': `${c.y}%`, '--w': `${c.w}%`, '--d': `${c.d}s`, '--at': `${c.at}s`, '--x0': `${(i * 37 + 12) % 90}%` } as CSSProperties}>
                            <Cloud />
                        </div>
                    ))}
                </div>
                <svg className="bv-svg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMax meet" aria-hidden>
                    {!reducedMotion && <g className="bv-birds">{[0, 1].map(i => (
                        <g key={i} className="bv-bird-path" style={{ '--k': i } as CSSProperties}>
                            <g transform={`translate(${-18 * i} ${10 * i}) scale(${1 - 0.25 * i})`}><Bird /></g>
                        </g>
                    ))}</g>}
                    <g className="bv-cam" style={{ transform: `scale(${s})` }}>
                        <Stream water={water} dam={dam} wave={reducedMotion ? 0 : wave} behind={<g transform={`translate(8 ${GROUND})`}><Reeds n={5} h={92} /></g>}>
                            <Dam layers={dam} fresh={seen.n > 0 ? dam - 1 : -1} />
                            {close && <Spill layers={dam} />}
                            <g transform={`translate(${lodgeX} ${GROUND}) scale(${k})`}><Family mood={mood} /></g>
                            <g transform={`translate(${BANK_X - 16} ${GROUND})`}><Reeds n={3} h={62} /></g>
                        </Stream>
                        {!reducedMotion && (
                            <g className="bv-water" style={{ transform: `translateY(${GROUND - water * STICK}px)` }}>
                                <g className="bv-dfly-path"><Dragonfly /></g>
                            </g>
                        )}
                    </g>
                    <g className="bv-beaver" style={{ transform: `translate(${bx}px, ${by}px) scale(${Math.max(0.55, s)})` }}>
                        <g className="bv-flinch">
                            <g key={seen.n} className={seen.n > 0 ? `bv-act is-${seen.act}` : ''}><BeaverArt face={face} carry={seen.n > 0} /></g>
                        </g>
                    </g>
                </svg>
            </div>
            <div className="bv-panel">
                <SpelSignBox className={"bv-sign"} question={question} feedback={feedback} flash={flash} answerClassName="bv-sign-answer" />
                <SpelKeypad questionKey={question.key} onAnswer={onAnswer} disabled={phase !== 'play'} />
            </div>
        </div>
    );
}

const CONFETTI = 14;
// The burst picture: the pond still high behind the stumps (POND sticks), the flood low downstream (FLOOD
// sticks), a loose log's resting spot and tilt on the flood.
const POND = 5.5;
const FLOOD = 1.6;
const BURST_LAYERS = 7;
const POND_Y = GROUND - POND * STICK;
const FLOOD_Y = GROUND - FLOOD * STICK;
const DRIFT = [[474, 8], [236, -10]] as const;
// Where the raft with the babies and the paddling beaver come to rest (the still picture), and where each
// starts (just past the gap, the babies from where their lodge stood).
const RAFT_X = 402;
const SWIM_X = 302;
const RAFT_FROM = 330;
const SWIM_FROM = DAM_X + 44;
// The win: two babies beside their dad on top of the dam (the left one nose to nose with him), one on the roof.
const PARTY_LAYERS = 9;
const PARTY = [{ x: -54, flip: true }, { x: 54, flip: false }] as const;

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

// The end screen: held = the family's party on the dam; broken = the babies float off on a log, waving, and
// their dad paddles after them.
export function BeverEnding({ outcome, reducedMotion }: SkinEndingProps) {
    const held = outcome !== 'failed';
    const top = GROUND - PARTY_LAYERS * STICK;
    const lodgeX = footR(PARTY_LAYERS) + LODGE_GAP;
    // Whatever floats in the flood ends at the stream bed.
    const clip = useId();
    return (
        <div className={`spel-ending bv-ending${held ? ' is-party' : ' is-broken'}${reducedMotion ? ' is-still' : ''}`}>
            <svg viewBox={held ? ENDING_VIEW : BURST_VIEW} preserveAspectRatio="xMidYMax meet" aria-hidden>
                <circle className="bv-sun-art" cx={held ? 350 : 246} cy={held ? 96 : 170} r={held ? 18 : 12} />
                {held ? (
                    <Stream water={6} dam={PARTY_LAYERS} behind={<g transform={`translate(8 ${GROUND})`}><Reeds n={5} h={92} /></g>}>
                        <Dam layers={PARTY_LAYERS} />
                        <g transform={`translate(${lodgeX} ${GROUND})`}><Lodge /></g>
                        <g transform={`translate(${lodgeX - 6} ${GROUND - 52})`}>
                            <g className="bv-party is-baby" style={{ '--k': 2 } as CSSProperties}><BabyArt look="happy" hat /></g>
                        </g>
                        <g transform={`translate(${DAM_X + 2} ${top})`}>
                            <g className="bv-party"><BeaverArt face="laugh" hat /></g>
                        </g>
                        {PARTY.map((b, i) => (
                            <g key={i} transform={`translate(${DAM_X + b.x} ${top})${b.flip ? ' scale(-1 1)' : ''}`}>
                                <g className="bv-party is-baby" style={{ '--k': i } as CSSProperties}><BabyArt look="happy" hat /></g>
                            </g>
                        ))}
                    </Stream>
                ) : (
                    <Stream water={FLOOD} flood behind={<g transform={`translate(84 ${GROUND})`}><Reeds n={3} h={86} /></g>}>
                        {/* Burst: the pond pours through the gap between two stumps of the dam into the low flood. */}
                        <rect className="bv-water-body" x={-2000} y={POND_Y} width={2000 + DAM_X} height={GROUND - POND_Y} />
                        <path className="bv-ripple" d={RIPPLE} style={{ translate: `0 ${POND_Y}px` }} />
                        <path className="bv-gush" d={`M${DAM_X - 18} ${GROUND} L${DAM_X - 18} ${POND_Y} C${DAM_X + 12} ${POND_Y - 3} ${DAM_X + 34} ${POND_Y + 4} ${DAM_X + 62} ${FLOOD_Y} L${DAM_X + 62} ${GROUND} Z`} />
                        <g className="bv-dam is-burst">
                            {[0, 1, 2, 3, 4].map(i => <Stump key={i} i={i} side={-1} />)}
                            {[0, 1, 2].map(i => <Stump key={i} i={i} side={1} />)}
                        </g>
                        <g style={{ transform: `translate(${DAM_X}px, 0)` }}>
                            {[[-14, POND_Y, 6], [0, POND_Y - 2, 5], [52, FLOOD_Y - 1, 7], [64, FLOOD_Y - 4, 5.5], [76, FLOOD_Y, 4.5]].map(([x, y, r], j) => (
                                <circle key={j} className="bv-foam" cx={x} cy={y} r={r} style={{ '--k': j } as CSSProperties} />
                            ))}
                        </g>
                        {/* Two of its logs fly out of the gap and drift downstream. */}
                        {DRIFT.map(([x, r], i) => (
                            <g key={i} className="bv-burst" style={{ '--bx': `${DAM_X - x + 40}px`, '--by': `${-40 - i * 14}px`, '--br': `${(i % 2 ? -1 : 1) * 70}deg`, '--i': i } as CSSProperties}>
                                <g className="bv-drift" style={{ '--i': i } as CSSProperties}>
                                    <rect className="bv-wood" x={x} y={FLOOD_Y - 6} width="40" height="11" rx="5" transform={`rotate(${r} ${x + 20} ${FLOOD_Y})`} />
                                </g>
                            </g>
                        ))}
                        <clipPath id={clip}><rect x={-2000} y={-1000} width={4400} height={1000 + GROUND} /></clipPath>
                        {/* The babies on a log, waving happily; their dad paddles after them, grinning. */}
                        <g clipPath={`url(#${clip})`}>
                            <g transform={`translate(${RAFT_X} ${FLOOD_Y})`}>
                                <g className="bv-raft" style={{ '--from': `${RAFT_FROM - RAFT_X}px` } as CSSProperties}>
                                    <g className="bv-bob">
                                        {[-36, 0, 36].map((x, i) => (
                                            <g key={i} transform={`translate(${x} -8)`}>
                                                <g className="bv-waver" style={{ '--k': i } as CSSProperties}><BabyArt look="happy" /></g>
                                            </g>
                                        ))}
                                        <rect className="bv-log" x="-58" y="-10" width="116" height="20" rx="10" />
                                        <ellipse className="bv-end" cx="-50" cy="0" rx="5.5" ry="8" />
                                    </g>
                                    <Surface w={132} />
                                </g>
                            </g>
                            <g transform={`translate(${SWIM_X} ${FLOOD_Y})`}>
                                <g className="bv-swim" style={{ '--from': `${SWIM_FROM - SWIM_X}px` } as CSSProperties}>
                                    <g className="bv-paddle">
                                        <g transform="translate(0 30) scale(-1 1) rotate(-12)"><BeaverArt face="laugh" /></g>
                                        {[[-34, -6, 3], [-44, -12, 2.4], [-26, -14, 2]].map(([x, y, r], j) => (
                                            <circle key={j} className="bv-drop is-splash" cx={x} cy={y} r={r} style={{ '--k': j } as CSSProperties} />
                                        ))}
                                    </g>
                                    <Surface w={96} />
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
