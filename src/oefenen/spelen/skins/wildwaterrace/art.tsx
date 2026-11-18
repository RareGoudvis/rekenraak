import type { CSSProperties } from 'react';
import type { Side } from '../../duel/types';
import { BANK, CURTAIN } from './geometry';

// Wildwaterrace's drawings (flat fills under the --spel-ink outline; colours in wildwaterrace.css). The river is
// seen from above at an angle and flows to the right, over the waterfall into the lake. A raft is drawn round its
// middle (0, 0), its nose to the right; the paddlers sit in it, helmets on.

export type RaftMood = 'idle' | 'stroke' | 'wave' | 'eddy' | 'cheer';


/** A deterministic wobble for the banks and the trees (no randomness in a drawing). */
const wob = (i: number, k = 1) => Math.sin(i * 1.7 + k) * 0.5 + Math.sin(i * 0.63 + 2 * k) * 0.5;

/** An edge from x0 to x1 around y, a gentle wave every 70 units. */
function edge(x0: number, x1: number, y: number, amp: number, k: number): string {
    const pts: string[] = [];
    for (let x = x0, i = 0; x <= x1; x += 70, i++) pts.push(`${x} ${(y + wob(i, k) * amp).toFixed(1)}`);
    pts.push(`${x1} ${y}`);
    return pts.join(' L ');
}

/** One paddler in the raft (sitting at x), helmet and life vest on; the paddle strokes from the hands. */
function Paddler({ x, cheer, dizzy }: { x: number; cheer: boolean; dizzy: boolean }) {
    return (
        <g className="ww-paddler" transform={`translate(${x} 0)`}>
            <rect className="ww-vest" x="-10" y="-26" width="20" height="24" rx="8" />
            <path className="ww-vest-strap" d="M-5 -24 L -5 -6 M 5 -24 L 5 -6" />
            <g className={`ww-paddle${cheer ? ' is-up' : ''}`}>
                <path className="ww-shaft" d="M-8 -32 L 14 10" />
                <ellipse className="ww-blade" cx="16" cy="15" rx="6" ry="10" transform="rotate(-28 16 15)" />
                <circle className="ww-hand" cx="-4" cy="-24" r="4" />
                <circle className="ww-hand" cx="6" cy="-5" r="4" />
            </g>
            <circle className="ww-face" cx="0" cy="-36" r="10" />
            {dizzy ? (
                <>
                    <path className="ww-eye-swirl" d="M-5 -37 m -2 0 a 2 2 0 1 1 4 0 a 1 1 0 1 1 -2 0" />
                    <path className="ww-eye-swirl" d="M5 -37 m -2 0 a 2 2 0 1 1 4 0 a 1 1 0 1 1 -2 0" />
                    <ellipse className="ww-mouth" cx="1" cy="-30" rx="2.6" ry="2.2" />
                </>
            ) : (
                <>
                    <circle className="ww-eye" cx="-3" cy="-37" r="1.8" />
                    <circle className="ww-eye" cx="4" cy="-37" r="1.8" />
                    <path className="ww-smile" d={cheer ? 'M-4 -32 Q 1 -26 6 -32 Z' : 'M-3 -31 Q 1 -28 5 -31'} />
                </>
            )}
            <path className="ww-helmet" d="M-11 -38 C -11 -50 11 -50 11 -38 Z" />
            <path className="ww-helmet-rim" d="M-13 -38 L 13 -38" />
            <path className="ww-helmet-stripe" d="M-2 -47 L -2 -39" />
        </g>
    );
}

/** A raft with two paddlers, its nose to the right (about 110 × 80 units). */
export function Raft({ mood, dizzy }: { mood: RaftMood; dizzy: boolean }) {
    const cheer = mood === 'cheer' || mood === 'wave';
    return (
        <g className="ww-raft-art">
            <ellipse className="ww-raft-shadow" cx="2" cy="14" rx="58" ry="20" />
            <ellipse className="ww-tube" cx="0" cy="0" rx="54" ry="28" />
            <ellipse className="ww-floor" cx="0" cy="-2" rx="40" ry="17" />
            <path className="ww-tube-shine" d="M-34 -22 Q 0 -32 34 -22" />
            {[-44, -22, 22, 44].map(x => <circle key={x} className="ww-rope" cx={x} cy={x === -44 || x === 44 ? -12 : -25} r="2.4" />)}
            <Paddler x={-18} cheer={cheer} dizzy={dizzy} />
            <Paddler x={18} cheer={cheer} dizzy={dizzy} />
            {/* The tube's near half over the paddlers' laps: they sit inside it. */}
            <path className="ww-tube-front" d="M-54 0 C -54 18 -28 28 0 28 C 28 28 54 18 54 0 C 46 12 24 16 0 16 C -24 16 -46 12 -54 0 Z" />
            {[-30, 0, 30].map(x => <circle key={x} className="ww-rope" cx={x} cy="24" r="2.4" />)}
        </g>
    );
}

/** The wave a raft surfs (3 in a row): a curling crest behind and under it. */
export function SurfWave() {
    return (
        <g className="ww-surf">
            <path className="ww-surf-body" d="M-110 30 C -90 0 -60 -34 -22 -36 C 4 -37 18 -24 12 -12 C 4 -20 -10 -20 -16 -10 C 0 0 30 18 70 30 Z" />
            <path className="ww-surf-foam" d="M-60 -24 C -40 -38 -6 -44 12 -12" />
            <path className="ww-surf-foam is-thin" d="M-96 20 C -70 4 -30 10 -6 20" />
        </g>
    );
}

/** The eddy under a raft after a mistake: a swirl that turns and fades. */
export function Eddy() {
    return (
        <g className="ww-eddy">
            <g className="ww-eddy-spin">
                <path d="M0 0 m -6 0 a 6 4 0 1 1 12 0 a 13 8 0 1 1 -26 0 a 22 14 0 1 1 44 0 a 32 20 0 1 1 -64 0 a 42 26 0 1 1 84 0" />
            </g>
        </g>
    );
}

/** The wake behind a raft after a stroke. */
export function Wake() {
    return (
        <g className="ww-wake">
            <path d="M-60 -12 L -96 -26" />
            <path d="M-60 12 L -96 26" />
            <path d="M-70 0 L -112 0" />
        </g>
    );
}

/** A little wave (the streak toward a surf). */
export function Pip({ on }: { on: boolean }) {
    return <path className={`ww-pip${on ? ' is-on' : ''}`} d="M-9 3 C -6 -6 0 -6 1 0 C 2 5 7 5 9 -3" />;
}

/** A tree on the far bank (trunk base at 0, 0): a round one or a pine. */
function Tree({ kind, s }: { kind: 'round' | 'pine'; s: number }) {
    return (
        <g transform={`scale(${s})`}>
            <g className="ww-tree">
                <rect className="ww-trunk" x="-4" y="-20" width="8" height="22" rx="3" />
                {kind === 'pine'
                    ? <path className="ww-pine" d="M0 -78 L 18 -44 L 10 -44 L 24 -16 L -24 -16 L -10 -44 L -18 -44 Z" />
                    : <><circle className="ww-leaf" cx="0" cy="-38" r="20" /><circle className="ww-leaf" cx="-14" cy="-26" r="13" /><circle className="ww-leaf" cx="14" cy="-26" r="13" /></>}
            </g>
        </g>
    );
}

/** The river from the start to the lip, the waterfall, the lake below, the banks and their trees. */
export function River({ w, lip }: { w: number; lip: number }) {
    const lake = lip + CURTAIN;
    const trees = [];
    for (let x = 30, i = 0; x < w + 40; x += 92, i++) {
        trees.push(<g key={`t${i}`} transform={`translate(${x + wob(i, 3) * 22} ${44 + wob(i, 5) * 10})`}><Tree kind={i % 3 === 1 ? 'pine' : 'round'} s={0.72 + (wob(i, 7) + 1) * 0.12} /></g>);
    }
    const reeds = [];
    for (let x = 60, i = 0; x < w; x += 170, i++) {
        reeds.push(
            <g key={`r${i}`} className="ww-reeds" transform={`translate(${x + wob(i, 2) * 30} 298)`}>
                <path d="M0 0 C -2 -14 -6 -24 -10 -34 M 6 0 C 6 -16 8 -26 12 -38 M -6 0 C -8 -10 -14 -18 -20 -24 M 12 0 C 14 -8 20 -16 26 -20" />
                <ellipse className="ww-cattail" cx="12" cy="-40" rx="3" ry="7" />
                <ellipse className="ww-cattail" cx="-10" cy="-36" rx="3" ry="6" />
            </g>,
        );
    }
    const flow = [];
    // Twelve dashes repeat every 600 units: the CSS loop slides them one period, so the flow never jumps.
    for (let x = -600, i = 0; x < lip + 50; x += 50, i++) {
        const k = i % 12;
        flow.push(<path key={`f${i}`} d={`M${x} ${BANK.far + 16 + ((k * 37) % 176)} l ${18 + (k % 3) * 8} 0`} />);
    }
    const rocks: [number, number, number][] = [[0.24, 177, 9], [0.45, 84, 15], [0.62, 177, 7], [0.36, 256, 13], [0.8, 254, 12], [0.06, 84, 10]];
    return (
        <g className="ww-river">
            {/* The far bank (top) and the near bank (bottom) under everything. */}
            <rect className="ww-grass" x="-20" y="-20" width={w + 40} height={BANK.far + 30} />
            <rect className="ww-grass is-near" x="-20" y={BANK.near - 10} width={w + 40} height={80} />
            <path className="ww-mud" d={`M-20 ${BANK.far - 6} L ${edge(-20, w + 20, BANK.far - 6, 4, 1)} L ${w + 20} ${BANK.far + 10} L -20 ${BANK.far + 10} Z`} />
            <path className="ww-sand" d={`M-20 ${BANK.near + 14} L ${edge(-20, w + 20, BANK.near + 14, 4, 2)} L ${w + 20} ${BANK.near - 4} L -20 ${BANK.near - 4} Z`} />
            {/* The lake below the falls: deeper, calm, with lily pads. */}
            <path className="ww-lake" d={`M${lake - 8} ${BANK.far - 30} C ${lake + 60} ${BANK.far - 46} ${w + 10} ${BANK.far - 40} ${w + 30} ${BANK.far - 30} L ${w + 30} ${BANK.near + 30} C ${w - 40} ${BANK.near + 40} ${lake + 40} ${BANK.near + 36} ${lake - 8} ${BANK.near + 24} Z`} />
            <g className="ww-lake-ripples">
                {[0, 1, 2].map(i => <ellipse key={i} cx={lake + 60 + i * 30} cy={110 + i * 60} rx="24" ry="8" style={{ '--i': i } as CSSProperties} />)}
            </g>
            <g className="ww-lily" transform={`translate(${w - 30} ${BANK.near + 4})`}><path d="M0 0 m -14 0 a 14 8 0 1 0 28 0 a 14 8 0 1 0 -28 0 M 0 0 L 12 -4" /><circle className="ww-lily-flower" cx="-4" cy="-3" r="4" /></g>
            {/* The river itself, from beyond the left edge to the lip. */}
            <path className="ww-water" d={`M-20 ${BANK.far} L ${edge(-20, lip, BANK.far, 5, 4)} L ${lip} ${BANK.near} L ${edge(-20, lip, BANK.near, 5, 6).split(' L ').reverse().join(' L ')} Z`} />
            <clipPath id="ww-river-clip"><rect x="-20" y={BANK.far + 4} width={lip + 20} height={BANK.near - BANK.far - 8} /></clipPath>
            <g clipPath="url(#ww-river-clip)">
                <g className="ww-flow">{flow}</g>
                <g className="ww-flow is-slow">{flow}</g>
            </g>
            {rocks.map(([f, y, r], i) => {
                const x = Math.round(80 + f * (lip - 160));
                return (
                    <g key={`k${i}`} transform={`translate(${x} ${y})`}>
                        <ellipse className="ww-foam-ring" rx={r + 10} ry={(r + 10) * 0.5} style={{ '--i': i } as CSSProperties} />
                        <path className="ww-rock" d={`M${-r} 2 C ${-r} ${-r * 0.9} ${r * 0.4} ${-r} ${r} ${-r * 0.2} C ${r * 1.1} ${r * 0.4} ${-r * 0.4} ${r * 0.7} ${-r} 2 Z`} />
                    </g>
                );
            })}
            {/* The waterfall: the foamy lip, the rushing curtain, the mist where it meets the lake. */}
            <path className="ww-cliff" d={`M${lip - 4} ${BANK.far - 18} L ${lake + 6} ${BANK.far - 30} L ${lake + 6} ${BANK.far + 2} L ${lip - 4} ${BANK.far + 6} Z`} />
            <path className="ww-cliff" d={`M${lip - 4} ${BANK.near - 4} L ${lake + 6} ${BANK.near + 6} L ${lake + 6} ${BANK.near + 30} L ${lip - 4} ${BANK.near + 18} Z`} />
            <rect className="ww-curtain" x={lip} y={BANK.far + 2} width={CURTAIN} height={BANK.near - BANK.far - 2} />
            <g className="ww-curtain-streaks">
                {Array.from({ length: 9 }, (_, i) => <path key={i} d={`M${lip + 2} ${BANK.far + 14 + i * 21} l ${CURTAIN - 6} ${4 + (i % 2) * 3}`} style={{ '--i': i } as CSSProperties} />)}
            </g>
            <path className="ww-lip" d={`M${lip - 6} ${BANK.far + 2} ${Array.from({ length: 10 }, (_, i) => `Q ${lip + (i % 2 ? 8 : -8)} ${BANK.far + 2 + i * 19.4 + 9.7} ${lip - 2} ${BANK.far + 2 + (i + 1) * 19.4}`).join(' ')}`} />
            <g className="ww-mist">
                {[0, 1, 2, 3, 4].map(i => <circle key={i} cx={lake + 8 + (i % 2) * 10} cy={BANK.far + 20 + i * 42} r={14 + (i % 3) * 4} style={{ '--i': i } as CSSProperties} />)}
            </g>
            {/* Life on the banks: trees sway, reeds in front, birds over the far bank. */}
            <g className="ww-trees">{trees}</g>
            <g className="ww-birds">
                <path className="ww-bird" d="M-10 0 Q -5 -6 0 0 Q 5 -6 10 0" />
                <path className="ww-bird is-2" d="M-8 0 Q -4 -5 0 0 Q 4 -5 8 0" transform="translate(30 12)" />
            </g>
            <g className="ww-fish-at" transform={`translate(${Math.round(lip * 0.52)} 210)`}>
                <g className="ww-fish"><path d="M-12 0 C -6 -8 8 -8 12 0 C 8 8 -6 8 -12 0 Z M -12 0 L -20 -7 L -20 7 Z" /><circle className="ww-fish-eye" cx="6" cy="-1.5" r="1.6" /></g>
            </g>
            {reeds}
        </g>
    );
}

/** The card's picture: the winner's raft, the paddlers cheering, a splash. */
export function CardRaft({ side }: { side: Side }) {
    return (
        <svg className={`ww-card-art is-${side}`} viewBox="-90 -80 180 120" aria-hidden>
            <ellipse className="ww-card-water" cx="0" cy="18" rx="86" ry="22" />
            <g className="ww-bob"><Raft mood="cheer" dizzy={false} /></g>
        </svg>
    );
}
