import type { CSSProperties, ReactNode } from 'react';
import type { Side } from '../../duel/types';
import { TAART } from './rule';

// The Taartgevecht scene: a game-show bake-off stage (curtains, a marquee sign, spotlights, a crowd in front)
// with two contestants behind their counters. Code-drawn SVG, flat fills under the thick ink outline. Every
// loop (breathing, blinking, glances, the bulbs) and every hit (the throw, the pie's arc, the splat, the
// drips) is CSS; React only says which moment it is. The scene is 1000 × 300; everything around it is drawn
// far past the edges so a wide or tall band shows more stage, never an empty strip.

export type Look = 'kid-a' | 'kid-b' | 'robot';
// idle; hit = stunned by a pie; dizzy = a wrong answer locked the keypad; win = bows; lose = licks the cream.
export type Mood = 'idle' | 'hit' | 'dizzy' | 'win' | 'lose';

export interface ContestantView {
    side: Side;
    look: Look;
    mood: Mood;
    // Hits taken this round and the round's lives: how much cream is on the face.
    blobs: number;
    creamed: boolean;
    // Pies thrown (restarts the arm's swing) and hits taken (restarts the jolt).
    thrown: number;
    jolt: number;
    // The latest throw was the round's last pie (the arm swings big).
    finalThrow: boolean;
}

export interface PieFlight { id: number; from: Side; final: boolean; ms: number }
export interface Splat { id: number; side: Side; final: boolean }

const X: Record<Side, number> = { left: 230, right: 770 };
const COUNTER_Y = 212;
// Where a pie leaves the hand and where it hits, in a contestant's own units (facing right).
const RELEASE = { x: 26, y: -124 };
const FACE = { x: 20, y: -100 };

/** A contestant's own units → scene units (the right one is mirrored). */
const toScene = (side: Side, p: { x: number; y: number }) => ({ x: X[side] + (side === 'left' ? p.x : -p.x), y: COUNTER_Y + p.y });

// ── Shapes ───────────────────────────────────────────────────────────────────

/** A lumpy closed blob of radius r (cream), smooth through the lobes' midpoints. */
function blobPath(r: number, seed: number, lobes = 7, lump = 0.2): string {
    const pts = Array.from({ length: lobes }, (_, i) => {
        const a = (i / lobes) * Math.PI * 2 + seed;
        const k = 1 + lump * Math.sin(seed * 3.7 + i * 2.3);
        return [Math.cos(a) * r * k, Math.sin(a) * r * k] as const;
    });
    const mid = (p: readonly number[], q: readonly number[]) => `${((p[0] + q[0]) / 2).toFixed(1)} ${((p[1] + q[1]) / 2).toFixed(1)}`;
    let d = `M${mid(pts[lobes - 1], pts[0])}`;
    for (let i = 0; i < lobes; i++) d += ` Q${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)} ${mid(pts[i], pts[(i + 1) % lobes])}`;
    return `${d} Z`;
}

/** A spiky splash (the moment of the splat): long and short spikes, round-tipped. */
function splashPath(r: number, spikes: number, seed: number): string {
    let d = '';
    for (let i = 0; i < spikes * 2; i++) {
        const a = (i / (spikes * 2)) * Math.PI * 2 + seed;
        const rr = i % 2 ? r * 0.5 : r * (0.85 + 0.25 * Math.abs(Math.sin(seed + i)));
        const x = (Math.cos(a) * rr).toFixed(1);
        const y = (Math.sin(a) * rr).toFixed(1);
        d += i ? ` L${x} ${y}` : `M${x} ${y}`;
    }
    return `${d} Z`;
}

/** A cream pie seen from the side, the cream facing +x: how it flies, cream first. */
function Pie({ big = false }: { big?: boolean }) {
    return (
        <g className={`tg-pie${big ? ' is-big' : ''}`}>
            <path className="tg-tin" d="M-12 -24 L-3 -27 L-3 27 L-12 24 Z" />
            <path className="tg-tin-pleat" d="M-12 -12 H-3 M-12 0 H-3 M-12 12 H-3" />
            <path className="tg-cream" d="M-3 -26 Q12 -28 14 -15 Q22 -9 18 0 Q24 9 14 15 Q12 28 -3 26 Z" />
            <path className="tg-cream-swirl" d="M6 -14 q6 4 0 9 M8 4 q6 4 0 9" />
            <circle className="tg-berry" cx="20" cy="-1" r="5.5" />
        </g>
    );
}

/** A pie on a plate seen from the front (on the counters). */
function TablePie({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
    return (
        <g transform={`translate(${x} ${y}) scale(${s})`}>
            <path className="tg-tin" d="M-26 -10 L26 -10 L21 2 L-21 2 Z" />
            <path className="tg-tin-pleat" d="M-16 -10 L-14 2 M-6 -10 L-5 2 M4 -10 L4 2 M14 -10 L13 2" />
            <path className="tg-cream" d="M-25 -10 Q-26 -20 -16 -20 Q-14 -30 -4 -27 Q2 -36 10 -28 Q20 -30 18 -20 Q27 -20 25 -10 Z" />
            <circle className="tg-berry" cx="2" cy="-30" r="5" />
        </g>
    );
}

// ── The stage ────────────────────────────────────────────────────────────────

function Backdrop() {
    // Rays behind the sign, as on a game show.
    const rays = Array.from({ length: 18 }, (_, i) => {
        const a0 = (i / 18) * Math.PI * 2;
        const a1 = a0 + Math.PI / 18;
        const R = 1400;
        return <path key={i} className="tg-ray" d={`M500 150 L${(500 + Math.cos(a0) * R).toFixed(0)} ${(150 + Math.sin(a0) * R).toFixed(0)} L${(500 + Math.cos(a1) * R).toFixed(0)} ${(150 + Math.sin(a1) * R).toFixed(0)} Z`} />;
    });
    return (
        <g className="tg-backdrop">
            <rect className="tg-wall" x="-3000" y="-1200" width="7000" height="1460" />
            {rays}
            <rect className="tg-floor" x="-3000" y="246" width="7000" height="200" />
            <path className="tg-floor-line" d="M-3000 246 H4000 M-3000 268 H4000 M-3000 292 H4000" />
        </g>
    );
}

function Curtains() {
    const half = (
        <>
            <path className="tg-curtain" d="M-3000 -1200 L160 -1200 L160 0 Q70 110 112 250 L-3000 250 Z" />
            <path className="tg-fold" d="M22 -40 Q10 120 30 250 M60 -40 Q46 100 64 250 M100 -40 Q84 80 92 200 M132 -40 Q110 40 100 150" />
            <path className="tg-tie" d="M58 136 Q90 148 112 140" />
            <circle className="tg-tie-knot" cx="112" cy="140" r="8" />
        </>
    );
    // A scalloped valance with a gold fringe across the top.
    let scallops = 'M-3000 -1200 H4000 V20';
    for (let x = 1400; x > -400; x -= 50) scallops += ` L${x} 20 Q${x - 25} 52 ${x - 50} 20`;
    scallops += ' L-3000 20 Z';
    return (
        <g className="tg-curtains">
            {half}
            <g transform="translate(1000 0) scale(-1 1)">{half}</g>
            <path className="tg-valance" d={scallops} />
        </g>
    );
}

function Marquee() {
    const bulbs: ReactNode[] = [];
    for (let i = 0; i < 14; i++) {
        bulbs.push(<circle key={`t${i}`} className={`tg-bulb is-${i % 2}`} cx={364 + i * 21} cy="46" r="4.5" />);
        bulbs.push(<circle key={`b${i}`} className={`tg-bulb is-${(i + 1) % 2}`} cx={364 + i * 21} cy="96" r="4.5" />);
    }
    return (
        <g className="tg-marquee">
            <path className="tg-wire" d="M400 0 V40 M600 0 V40" />
            <rect className="tg-signboard" x="350" y="38" width="300" height="66" rx="16" />
            {bulbs}
            <text className="tg-signboard-text" x="500" y="81" textAnchor="middle">Taartgevecht</text>
        </g>
    );
}

function Spotlight({ side }: { side: Side }) {
    const x = X[side];
    const src = side === 'left' ? 60 : 940;
    // The beam swings a little about its lamp; the pool of light on the floor stays.
    return (
        <g className={`tg-spot is-${side}`}>
            <ellipse className="tg-pool" cx={x} cy="252" rx="120" ry="12" />
            <g transform={`translate(${src} -30)`}>
                <g className="tg-spot-swing">
                    <path className="tg-beam" d={`M-14 0 L14 0 L${x + 110 - src} 282 L${x - 110 - src} 282 Z`} />
                </g>
            </g>
        </g>
    );
}

/** The big layered cake in the middle: the prize nobody throws. */
function Showpiece() {
    return (
        <g className="tg-showpiece" transform="translate(500 250)">
            <path className="tg-stand" d="M-34 0 L34 0 L12 -14 L12 -30 L-12 -30 L-12 -14 Z" />
            <rect className="tg-plate" x="-58" y="-38" width="116" height="9" rx="4.5" />
            <rect className="tg-tier is-1" x="-50" y="-70" width="100" height="32" rx="6" />
            <rect className="tg-tier is-2" x="-38" y="-98" width="76" height="28" rx="6" />
            <rect className="tg-tier is-3" x="-26" y="-122" width="52" height="24" rx="6" />
            <path className="tg-icing" d="M-50 -62 q8 10 14 0 q8 12 16 0 q8 10 14 0 q8 12 16 0 q8 10 14 0 q8 12 16 0 V-70 H-50 Z" />
            <path className="tg-icing" d="M-38 -91 q8 9 13 0 q8 10 13 0 q8 9 13 0 q8 10 12 0 q8 9 13 0 V-98 H-38 Z" />
            <path className="tg-icing" d="M-26 -116 q7 8 13 0 q7 9 13 0 q7 8 13 0 q7 9 13 0 V-122 H-26 Z" />
            <path className="tg-candle" d="M0 -122 V-140" />
            <path className="tg-flame" d="M0 -158 Q7 -148 0 -141 Q-7 -148 0 -158 Z" />
        </g>
    );
}

function Counter({ side }: { side: Side }) {
    const flip = side === 'right';
    return (
        <g transform={`translate(${X[side]} ${COUNTER_Y})${flip ? ' scale(-1 1)' : ''}`} className={`tg-counter is-${side}`}>
            <rect className="tg-front" x="-112" y="4" width="224" height="100" rx="6" />
            <path className="tg-stripe" d="M-112 30 H112 M-112 52 H112" />
            <rect className="tg-top" x="-122" y="-6" width="244" height="14" rx="5" />
            <TablePie x={74} y={-6} />
            <TablePie x={78} y={-36} s={0.86} />
            <g className="tg-whisk" transform="translate(-84 -6) rotate(-20)">
                <path d="M0 0 V-26" className="tg-whisk-handle" />
                <path d="M0 -26 Q-10 -40 0 -54 Q10 -40 0 -26 M0 -26 Q-4 -40 0 -54 Q4 -40 0 -26" className="tg-whisk-wire" />
            </g>
        </g>
    );
}

// The crowd in front of the stage: dark heads and shoulders, arms up on a hit or a win.
function Crowd({ mood, beat }: { mood: 'calm' | 'ooh' | 'cheer'; beat: number }) {
    const people = Array.from({ length: 30 }, (_, i) => {
        const x = -260 + i * 52 + (i % 3) * 7;
        const h = 6 + ((i * 37) % 5) * 5;
        return (
            <g key={i} transform={`translate(${x} ${292 - h})`}>
                <g className="tg-fan" style={{ '--i': i % 7 } as CSSProperties}>
                    <path className="tg-fan-arms" d="M-16 22 L-26 -10 M16 22 L26 -10" />
                    <path className="tg-fan-body" d="M-26 60 Q-26 22 0 20 Q26 22 26 60 Z" />
                    <circle className="tg-fan-head" cx="0" cy="4" r="16" />
                </g>
            </g>
        );
    });
    return <g key={mood === 'ooh' ? `ooh-${beat}` : mood} className={`tg-crowd is-${mood}`}>{people}</g>;
}

// ── The contestants ──────────────────────────────────────────────────────────

function Eyes({ mood }: { mood: Mood }) {
    if (mood === 'dizzy') {
        return (
            <g className="tg-swirls">
                {[4, 27].map(cx => <circle key={`w${cx}`} className="tg-white" cx={cx} cy="-104" r="9.5" />)}
                {[4, 27].map(cx => <path key={cx} className="tg-swirl" transform={`translate(${cx} -104)`} d="M0 0 m-1 0 a1 1 0 1 1 2 0 a3 3 0 1 1 -5 0 a5 5 0 1 1 9 0 a7 7 0 1 1 -12 2" />)}
            </g>
        );
    }
    if (mood === 'win' || mood === 'lose') {
        return <path className="tg-happy" d="M-4 -102 Q4 -112 12 -102 M19 -102 Q27 -112 35 -102" />;
    }
    const big = mood === 'hit';
    return (
        <g className={`tg-eyes${big ? ' is-big' : ''}`}>
            <circle className="tg-white" cx="4" cy="-104" r={big ? 11 : 8.5} />
            <circle className="tg-white" cx="27" cy="-104" r={big ? 11 : 8.5} />
            <g className="tg-pupils">
                <circle className="tg-pupil" cx="7" cy="-104" r={big ? 2.6 : 4.2} />
                <circle className="tg-pupil" cx="30" cy="-104" r={big ? 2.6 : 4.2} />
                {!big && <><circle className="tg-glint" cx="8.6" cy="-106" r="1.3" /><circle className="tg-glint" cx="31.6" cy="-106" r="1.3" /></>}
            </g>
            {!big && (
                <g className="tg-lids">
                    <ellipse className="tg-lid" cx="4" cy="-104" rx="9.5" ry="9.5" />
                    <ellipse className="tg-lid" cx="27" cy="-104" rx="9.5" ry="9.5" />
                </g>
            )}
        </g>
    );
}

function Mouth({ mood }: { mood: Mood }) {
    switch (mood) {
        case 'hit': return <ellipse className="tg-mouth-o" cx="22" cy="-78" rx="6" ry="8" />;
        case 'dizzy': return <path className="tg-mouth" d="M10 -80 q4 -4 8 0 t8 0 t8 0" />;
        case 'win': return <path className="tg-mouth-open" d="M8 -84 Q22 -84 36 -86 Q32 -66 20 -68 Q10 -70 8 -84 Z" />;
        case 'lose': return (
            <g>
                <path className="tg-mouth" d="M10 -82 Q22 -72 34 -84" />
                <g className="tg-tongue"><path className="tg-tongue-shape" d="M24 -80 Q34 -78 36 -70 Q34 -62 26 -66 Q22 -72 24 -80 Z" /></g>
            </g>
        );
        default: return <path className="tg-mouth" d="M10 -82 Q22 -72 34 -84" />;
    }
}

function Hair({ look }: { look: Look }) {
    if (look === 'kid-a') return <path className="tg-hair" d="M-40 -108 Q-48 -134 -26 -142 L10 -142 Q30 -140 36 -126 Q20 -132 6 -124 Q-2 -132 -14 -124 Q-28 -126 -30 -104 Z" />;
    if (look === 'kid-b') {
        return (
            <g className="tg-hair-b">
                <circle className="tg-hair" cx="-46" cy="-116" r="13" />
                <circle className="tg-hair" cx="-44" cy="-90" r="11" />
                <path className="tg-hair" d="M-40 -104 Q-46 -136 -20 -142 L14 -142 Q34 -138 38 -124 Q24 -126 16 -120 Q8 -128 -4 -122 Q-18 -128 -26 -116 Q-32 -110 -30 -100 Z" />
                <circle className="tg-bow" cx="-50" cy="-130" r="6" />
            </g>
        );
    }
    return (
        <g className="tg-bolts">
            <circle className="tg-bolt" cx="-40" cy="-100" r="7" />
            <path className="tg-antenna" d="M-14 -142 L-22 -166" />
            <circle className="tg-antenna-bulb" cx="-23" cy="-170" r="6" />
        </g>
    );
}

// The cream on a face: blob slots fill front to back as the hits come (the eyes and the mouth stay free, so
// it reads as cream, not a mask); the last pie sticks its tin on the face and covers the front half.
const BLOB_SLOTS = [
    { x: 38, y: -94, r: 14, drip: [2] },
    { x: 0, y: -140, r: 16, drip: [-6, 7] },
    { x: 14, y: -64, r: 11, drip: [] },
    { x: -24, y: -104, r: 13, drip: [4] },
    { x: 33, y: -118, r: 9, drip: [] },
    { x: 6, y: -178, r: 15, drip: [] },
] as const;
const BERRY_SLOTS = new Set([0, 5]);

function Drip({ x, y, len, k }: { x: number; y: number; len: number; k: number }) {
    return (
        <g transform={`translate(${x} ${y})`}>
            <g className="tg-drip" style={{ '--k': k } as CSSProperties}>
                <path className="tg-cream" d={`M-3 -3 V${len} A3 3 0 0 0 3 ${len} V-3 Z`} />
            </g>
            <circle className="tg-drop" cx="0" cy={len + 5} r="3" style={{ '--k': k } as CSSProperties} />
        </g>
    );
}

function Cream({ blobs, creamed }: { blobs: number; creamed: boolean }) {
    return (
        <g className="tg-face-cream">
            {creamed && (
                <g className="tg-cover">
                    <path className="tg-cream" transform="translate(16 -104)" d={blobPath(38, 0.4, 10, 0.14)} />
                    <path className="tg-cream" transform="translate(4 -178)" d={blobPath(20, 1.3, 7, 0.2)} />
                    <path className="tg-cream-shade" d="M-14 -80 Q12 -66 46 -84" />
                    <path className="tg-cream-swirl" d="M-12 -126 q8 6 16 0 q8 -6 16 0 M30 -126 q6 5 12 0 M-16 -92 q6 5 12 0" />
                    {[-10, 12, 34].map((x, k) => <Drip key={x} x={x} y={-72 + (k % 2) * 4} len={5 + (k % 2) * 5} k={k} />)}
                    {/* The eyes peep out of the cream and still blink. */}
                    <circle className="tg-white" cx="6" cy="-106" r="7.5" /><circle className="tg-white" cx="28" cy="-106" r="7.5" />
                    <circle className="tg-pupil" cx="8" cy="-106" r="3.6" /><circle className="tg-pupil" cx="30" cy="-106" r="3.6" />
                    <g className="tg-lids"><ellipse className="tg-lid is-cream" cx="6" cy="-106" rx="8.5" ry="8.5" /><ellipse className="tg-lid is-cream" cx="28" cy="-106" rx="8.5" ry="8.5" /></g>
                    <circle className="tg-berry" cx="44" cy="-92" r="7" />
                    {/* The tin sticks for a moment, then slides off the face. */}
                    <g transform="translate(56 -100)"><g className="tg-tin-slide">
                        <path className="tg-tin" d="M-6 -36 L6 -32 L6 32 L-6 36 Z" />
                        <path className="tg-tin-pleat" d="M-6 -18 H6 M-6 0 H6 M-6 18 H6" />
                    </g></g>
                </g>
            )}
            {!creamed && BLOB_SLOTS.slice(0, blobs).map((s, i) => (
                <g key={i} transform={`translate(${s.x} ${s.y})`}><g className="tg-blob">
                    <path className="tg-cream" d={blobPath(s.r, i * 1.7 + 0.3, 7, 0.24)} />
                    <path className="tg-cream-shade" d={`M${-s.r * 0.6} ${s.r * 0.35} Q0 ${s.r * 0.8} ${s.r * 0.6} ${s.r * 0.35}`} />
                    {s.drip.map((dx, k) => <Drip key={k} x={dx} y={s.r * 0.7} len={4 + ((i + k) % 3) * 3} k={i + k} />)}
                    {BERRY_SLOTS.has(i) && <circle className="tg-berry" cx={s.r * 0.3} cy={-s.r * 0.5} r="4.5" />}
                </g></g>
            ))}
        </g>
    );
}

function Head({ v }: { v: ContestantView }) {
    const robot = v.look === 'robot';
    return (
        <g className="tg-head">
            {!robot && <circle className="tg-ear" cx="-34" cy="-98" r="9" />}
            {robot
                ? <><rect className="tg-skull is-robot" x="-42" y="-144" width="84" height="88" rx="22" /><rect className="tg-screen" x="-22" y="-130" width="64" height="62" rx="14" /></>
                : <circle className="tg-skull" cx="0" cy="-100" r="42" />}
            <Hair look={v.look} />
            {!robot && <circle className="tg-blush" cx="-6" cy="-86" r="7" />}
            {!robot && <circle className="tg-nose" cx="38" cy="-94" r="5.5" />}
            <path className="tg-brows" d={v.mood === 'hit' ? 'M-4 -124 L10 -126 M21 -126 L34 -123' : v.mood === 'dizzy' ? 'M-4 -118 L10 -122 M21 -122 L34 -117' : 'M-4 -120 L10 -121 M21 -121 L34 -119'} />
            <Eyes mood={v.mood} />
            <Mouth mood={v.mood} />
            {/* The chef's hat. */}
            <g className="tg-hat">
                <path className="tg-hat-puff" d="M-30 -148 Q-46 -170 -28 -184 Q-20 -204 0 -196 Q16 -210 30 -192 Q48 -182 34 -148 Z" />
                <rect className="tg-hat-band" x="-34" y="-152" width="70" height="17" rx="5" />
            </g>
            <Cream blobs={v.blobs} creamed={v.creamed} />
            {/* Under a full face of cream the mouth still shows: the loser licks it off. */}
            {v.creamed && <Mouth mood={v.mood} />}
            {v.mood === 'dizzy' && (
                <g transform="translate(6 -112)">
                    <g className="tg-stars">
                        {[0, 1, 2, 3].map(i => <path key={i} className="tg-star" transform={`rotate(${i * 90}) translate(58 0) rotate(${-i * 90})`} d="M0 -12 L3.6 -3.6 L12 0 L3.6 3.6 L0 12 L-3.6 3.6 L-12 0 L-3.6 -3.6 Z" />)}
                    </g>
                </g>
            )}
        </g>
    );
}

/** One contestant behind a counter, feet hidden, in its own units (facing right; the right one is mirrored). */
function Contestant({ v }: { v: ContestantView }) {
    const style = { '--ph': v.side === 'left' ? '0s' : '-1.7s' } as CSSProperties;
    return (
        <g transform={`translate(${X[v.side]} ${COUNTER_Y})${v.side === 'right' ? ' scale(-1 1)' : ''}`}>
            <g className={`tg-who is-${v.side} is-${v.look} is-${v.mood}${v.blobs || v.creamed ? ' is-messy' : ''}`} style={style}>
                <g className="tg-pose">
                    <g key={`j${v.jolt}`} className={v.jolt ? 'tg-jolt' : undefined}>
                        <g className="tg-breathe">
                            {/* The throwing arm, behind the head: wind-up, the swing, a fresh pie. */}
                            <g transform="translate(-24 -52)">
                                <g key={`t${v.thrown}`} className={`tg-arm${v.thrown ? ' is-throw' : ''}${v.finalThrow ? ' is-final' : ''}`}>
                                    <path className="tg-sleeve-ink" d="M0 0 Q-26 -6 -32 -40" /><path className="tg-sleeve" d="M0 0 Q-26 -6 -32 -40" />
                                    <circle className="tg-hand" cx="-32" cy="-42" r="9" />
                                    {v.thrown > 0 && <g className="tg-load-out"><TablePie x={-32} y={-50} s={v.finalThrow ? 1.05 : 0.85} /></g>}
                                    <g className={v.thrown ? 'tg-load-in' : undefined}><TablePie x={-32} y={-50} s={0.85} /></g>
                                </g>
                            </g>
                            <path className="tg-jacket" d="M-38 8 Q-40 -50 -20 -58 L20 -58 Q40 -50 38 8 Z" />
                            <path className="tg-apron" d="M-20 -44 L20 -44 L26 8 L-26 8 Z" />
                            <path className="tg-apron-strap" d="M-20 -44 L-14 -58 M20 -44 L14 -58" />
                            <circle className="tg-button" cx="0" cy="-30" r="3" />
                            <Head v={v} />
                            {/* The front arm: on the counter, wipes the cream off now and then, waves when it wins. */}
                            <g transform="translate(22 -46)">
                                <g className="tg-front-arm">
                                    <path className="tg-sleeve-ink" d="M0 0 Q20 20 30 44" /><path className="tg-sleeve" d="M0 0 Q20 20 30 44" />
                                    <circle className="tg-hand" cx="31" cy="46" r="9" />
                                </g>
                            </g>
                        </g>
                    </g>
                </g>
            </g>
        </g>
    );
}

// A pie in the air: x and y linear, the arc on a third transform (two quadratic halves), spinning; the last
// pie grows on its way, as if it comes at the camera.
function FlyingPie({ f }: { f: PieFlight }) {
    const from = toScene(f.from, RELEASE);
    const to = toScene(f.from === 'left' ? 'right' : 'left', FACE);
    const fly = f.ms - TAART.releaseMs;
    const style = {
        '--dx': `${to.x - from.x}px`, '--dy': `${to.y - from.y}px`, '--arc': `${f.final ? -58 : -52}px`,
        '--turn': `${(f.from === 'left' ? 1 : -1) * (f.final ? 0 : 360)}deg`, '--wait': `${TAART.releaseMs}ms`, '--dur': `${fly}ms`,
    } as CSSProperties;
    return (
        <g transform={`translate(${from.x} ${from.y})`}>
            <g className={`tg-fly${f.final ? ' is-final' : ''}`} style={style}>
                <g className="tg-fly-x"><g className="tg-fly-y"><g className="tg-fly-arc"><g className="tg-fly-grow"><g className="tg-spin">
                    {f.final && <path className="tg-speed" d="M-30 -18 H-70 M-34 0 H-84 M-30 18 H-70" transform={f.from === 'right' ? 'scale(-1 1)' : undefined} />}
                    <g transform={f.from === 'right' ? 'scale(-1 1)' : undefined}><Pie big={f.final} /></g>
                </g></g></g></g></g>
            </g>
        </g>
    );
}

const DROPLETS = Array.from({ length: 14 }, (_, i) => {
    const a = -Math.PI * 0.95 + (i / 13) * Math.PI * 1.5;
    const d = 46 + ((i * 29) % 5) * 12;
    return { dx: Math.cos(a) * d, dy: Math.sin(a) * d * 0.8, r: 3 + (i % 3) * 1.6 };
});

/** The splat on a face: a spiky cream splash, droplets flying off and falling, and a "SPLAT!" sticker. */
function SplatFx({ s }: { s: Splat }) {
    const at = toScene(s.side, FACE);
    // The droplets fly back toward the thrower (the right one is hit from its own front, mirrored).
    const dir = s.side === 'right' ? -1 : 1;
    const big = s.final ? 1.5 : 1;
    return (
        <g transform={`translate(${at.x} ${at.y})`} className={`tg-splat${s.final ? ' is-final' : ''}`}>
            <g className="tg-splash" style={{ '--s': big } as CSSProperties}>
                <path className="tg-cream" d={splashPath(48, 9, s.id % 5)} />
            </g>
            {DROPLETS.map((p, i) => (
                <g key={i} className="tg-droplet" style={{ '--dx': `${(-p.dx * dir * big).toFixed(0)}px`, '--dy': `${(p.dy * big).toFixed(0)}px`, '--k': i % 4 } as CSSProperties}>
                    <circle className="tg-cream" r={p.r * big} />
                </g>
            ))}
            <g transform={`translate(${(s.final ? 150 : 100) * dir} ${s.final ? 36 : 12})`}>
                <g className="tg-pow">
                    <path className="tg-pow-bg" d={splashPath(s.final ? 62 : 48, 11, 1.1)} />
                    <text className="tg-pow-text" x="0" y={s.final ? 10 : 7} textAnchor="middle" style={{ fontSize: s.final ? 30 : 22 } as CSSProperties}>SPLAT!</text>
                </g>
            </g>
        </g>
    );
}

// Paper confetti over the winner's half while the round's win plays.
function StageConfetti({ side }: { side: Side | 'both' }) {
    const x0 = side === 'right' ? 520 : side === 'left' ? 0 : 0;
    const w = side === 'both' ? 1000 : 480;
    return (
        <g className="tg-confetti">
            {Array.from({ length: 34 }, (_, i) => (
                <g key={i} transform={`translate(${x0 + ((i * 97) % w)} -20)`}>
                    <rect className={`tg-bit is-${i % 5}`} x="-5" y="-3" width="10" height="6" rx="1.5"
                        style={{ '--k': (i * 7) % 11, '--sway': `${((i % 4) - 1.5) * 18}px`, '--fall': `${260 + (i % 5) * 18}px` } as CSSProperties} />
                </g>
            ))}
        </g>
    );
}

export interface SceneProps {
    left: ContestantView;
    right: ContestantView;
    flights: PieFlight[];
    splats: Splat[];
    crowd: 'calm' | 'ooh' | 'cheer';
    crowdBeat: number;
    // The last pie is in the air (or just landed): the camera leans in on its target.
    slowmo: { to: Side; key: number } | null;
    confetti: Side | 'both' | null;
}

export function Scene({ left, right, flights, splats, crowd, crowdBeat, slowmo, confetti }: SceneProps) {
    const cam = slowmo ? toScene(slowmo.to, FACE) : null;
    return (
        <svg className="tg-scene" viewBox="0 0 1000 300" preserveAspectRatio="xMidYMax meet" aria-hidden>
            <g key={slowmo ? `cam-${slowmo.key}` : 'cam'} className={cam ? 'tg-cam is-slowmo' : 'tg-cam'}
                style={cam ? { '--cx': `${cam.x}px`, '--cy': '60px' } as CSSProperties : undefined}>
                <Backdrop />
                <Spotlight side="left" />
                <Spotlight side="right" />
                <Curtains />
                <Marquee />
                <Showpiece />
                <Contestant v={left} />
                <Contestant v={right} />
                <Counter side="left" />
                <Counter side="right" />
                {splats.map(s => <SplatFx key={s.id} s={s} />)}
                {flights.map(f => <FlyingPie key={f.id} f={f} />)}
                {confetti && <StageConfetti side={confetti} />}
                <Crowd mood={crowd} beat={crowdBeat} />
            </g>
        </svg>
    );
}

/** The card's picture: the winner's head, clean, with a pie in hand; a draw shows two creamed heads. */
export function CardArt({ winner, looks }: { winner: Side | 'draw' | null; looks: Record<Side, Look> }) {
    if (!winner) return null;
    const head = (side: Side, creamed: boolean) => (
        <g transform="translate(0 200)" className={`tg-who is-${side} is-${looks[side]} is-${creamed ? 'lose' : 'win'}`}>
            <Head v={{ side, look: looks[side], mood: creamed ? 'lose' : 'win', blobs: 0, creamed, thrown: 0, jolt: 0, finalThrow: false }} />
        </g>
    );
    return (
        <svg className="tg-card-art" viewBox={winner === 'draw' ? '-80 0 300 150' : '-70 0 140 150'} aria-hidden>
            {winner === 'draw' ? <>{head('left', true)}<g transform="translate(150 0) scale(-1 1)">{head('right', true)}</g></>
                : <g transform={winner === 'right' ? 'scale(-1 1)' : undefined}>{head(winner, false)}</g>}
        </svg>
    );
}
