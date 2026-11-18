import type { CSSProperties, Ref } from 'react';
import type { Side } from '../../duel/types';
import { BANK, CURTAIN, TILE } from './geometry';

// Wildwaterrace's drawings (flat fills under the --spel-ink outline; colours and motions in wildwaterrace.css). The
// river is seen from above at an angle and flows to the right; its banks, its flow lines and the trees scroll with
// the rafts (the frame loop moves the groups it is handed). A raft is drawn round its middle (0, 0), its nose to the
// right; two paddlers in it, helmets on. The finish is the waterfall with the lake below it.

export type RaftMood = 'idle' | 'cheer' | 'oops';
const v = (o: Record<string, string | number>) => o as CSSProperties;

/** A deterministic wobble for the banks and the trees (no randomness in a drawing). */
const wob = (i: number, k = 1) => Math.sin(i * 1.7 + k) * 0.5 + Math.sin(i * 0.63 + 2 * k) * 0.5;
const tilesFor = (w: number, tile: number) => Math.ceil(w / tile) + 2;

/** An edge from x0 to x1 around y, a gentle wave every 70 units (tile-periodic when x1 − x0 is a multiple of 70). */
function edge(x0: number, x1: number, y: number, amp: number, k: number): string {
    const pts: string[] = [];
    for (let x = x0, i = 0; x <= x1; x += 70, i++) pts.push(`${x} ${(y + wob(i % 8, k) * amp).toFixed(1)}`);
    return pts.join(' L ');
}

export interface RaftLook {
    mood: RaftMood;
    dizzy?: boolean;
    // Heads down under a branch; drenched after a splash; leaves on the helmets after the branch.
    duck?: boolean;
    wet?: boolean;
    leaves?: boolean;
}

/** One paddler in the raft (sitting at x), helmet and life vest on; the paddle strokes from the hands. */
function Paddler({ x, look, k }: { x: number; look: RaftLook; k: number }) {
    const cheer = look.mood === 'cheer';
    return (
        <g className={`ww-paddler${look.duck ? ' is-duck' : ''}`} transform={`translate(${x} 0)`}>
            <rect className="ww-vest" x="-10" y="-26" width="20" height="24" rx="8" />
            <path className="ww-vest-strap" d="M-5 -24 L -5 -6 M 5 -24 L 5 -6" />
            <g className={`ww-paddle${cheer ? ' is-up' : ''}`} style={v({ '--k': k })}>
                <path className="ww-shaft" d="M-8 -32 L 14 10" />
                <ellipse className="ww-blade" cx="16" cy="15" rx="6" ry="10" transform="rotate(-28 16 15)" />
                <circle className="ww-hand" cx="-4" cy="-24" r="4" />
                <circle className="ww-hand" cx="6" cy="-5" r="4" />
            </g>
            <g className="ww-head">
                <circle className="ww-face" cx="0" cy="-36" r="10" />
                {look.dizzy ? (
                    <>
                        <path className="ww-eye-swirl" d="M-5 -37 m -2 0 a 2 2 0 1 1 4 0 a 1 1 0 1 1 -2 0" />
                        <path className="ww-eye-swirl" d="M5 -37 m -2 0 a 2 2 0 1 1 4 0 a 1 1 0 1 1 -2 0" />
                        <ellipse className="ww-mouth" cx="1" cy="-30" rx="2.6" ry="2.2" />
                    </>
                ) : look.mood === 'oops' ? (
                    <>
                        <path className="ww-eye-shut" d="M-6 -38 l4 2 M3 -36 l4 -2" />
                        <ellipse className="ww-mouth" cx="1" cy="-30" rx="3" ry="2.6" />
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
                {look.leaves && <g className="ww-helmet-leaves"><path d="M-8 -48 q6 -10 12 -2 q-6 4 -12 2 Z" /><path d="M2 -50 q8 -6 12 2 q-8 2 -12 -2 Z" /></g>}
                {look.wet && <g className="ww-drips">{[-6, 2, 9].map((dx, i) => <path key={dx} style={v({ '--k': i })} d={`M${dx} -26 q-2 4 0 6 q2 -2 0 -6 Z`} />)}</g>}
            </g>
        </g>
    );
}

/** A raft with two paddlers, its nose to the right (about 110 × 80 units). */
export function Raft({ look }: { look: RaftLook }) {
    return (
        <g className="ww-raft-art">
            <ellipse className="ww-raft-shadow" cx="2" cy="14" rx="58" ry="20" />
            <ellipse className="ww-tube" cx="0" cy="0" rx="54" ry="28" />
            <ellipse className="ww-floor" cx="0" cy="-2" rx="40" ry="17" />
            <path className="ww-tube-shine" d="M-34 -22 Q 0 -32 34 -22" />
            {[-44, -22, 22, 44].map(x => <circle key={x} className="ww-rope" cx={x} cy={x === -44 || x === 44 ? -12 : -25} r="2.4" />)}
            <Paddler x={-18} look={look} k={0} />
            <Paddler x={18} look={look} k={1} />
            {/* The tube's near half over the paddlers' laps: they sit inside it. */}
            <path className="ww-tube-front" d="M-54 0 C -54 18 -28 28 0 28 C 28 28 54 18 54 0 C 46 12 24 16 0 16 C -24 16 -46 12 -54 0 Z" />
            {[-30, 0, 30].map(x => <circle key={x} className="ww-rope" cx={x} cy="24" r="2.4" />)}
        </g>
    );
}

/** The bow wave and the wake while the raft moves (opacity by speed). */
export function Wake({ motionRef }: { motionRef: Ref<SVGGElement> }) {
    return (
        <g ref={motionRef} className="ww-wake">
            <path d="M-60 -16 L -100 -30" /><path d="M-60 16 L -100 30" /><path d="M-70 0 L -118 0" />
            <path className="ww-bow" d="M54 -20 Q 66 0 54 20" />
        </g>
    );
}

/** The wave a raft surfs on a catch-up: a curling crest behind and under it. */
export function SurfWave() {
    return (
        <g className="ww-surf">
            <path className="ww-surf-body" d="M-110 30 C -90 0 -60 -34 -22 -36 C 4 -37 18 -24 12 -12 C 4 -20 -10 -20 -16 -10 C 0 0 30 18 70 30 Z" />
            <path className="ww-surf-foam" d="M-60 -24 C -40 -38 -6 -44 12 -12" />
            <path className="ww-surf-foam is-thin" d="M-96 20 C -70 4 -30 10 -6 20" />
        </g>
    );
}

/** A tree on the far bank (trunk base at 0, 0): a round one or a pine. */
function Tree({ kind, s, k }: { kind: 'round' | 'pine'; s: number; k: number }) {
    return (
        <g transform={`scale(${s})`}>
            <g className="ww-tree" style={v({ '--i': k })}>
                <rect className="ww-trunk" x="-4" y="-20" width="8" height="22" rx="3" />
                {kind === 'pine'
                    ? <path className="ww-pine" d="M0 -78 L 18 -44 L 10 -44 L 24 -16 L -24 -16 L -10 -44 L -18 -44 Z" />
                    : <><circle className="ww-leaf" cx="0" cy="-38" r="20" /><circle className="ww-leaf" cx="-14" cy="-26" r="13" /><circle className="ww-leaf" cx="14" cy="-26" r="13" /></>}
            </g>
        </g>
    );
}

/** The river's fixed parts: the two banks and the water between them (scrolling layers go on top). */
export function RiverBed({ w }: { w: number }) {
    return (
        <g className="ww-river">
            <rect className="ww-grass" x="-20" y="-20" width={w + 40} height={BANK.far + 30} />
            <rect className="ww-grass is-near" x="-20" y={BANK.near - 10} width={w + 40} height={80} />
            <rect className="ww-water" x="-20" y={BANK.far} width={w + 40} height={BANK.near - BANK.far} />
            <rect className="ww-water-deep" x="-20" y={BANK.far + 40} width={w + 40} height={BANK.near - BANK.far - 80} />
        </g>
    );
}

/** The banks' edges, trees and stones in one strip of tiles that scrolls (far bank on top, near bank at the bottom). */
export function Banks({ w, layerRef }: { w: number; layerRef: Ref<SVGGElement> }) {
    const tile = (i: number) => (
        <g key={i} transform={`translate(${i * TILE.bank} 0)`}>
            {/* The fill without its tile ends; the bank's line stroked on its own, so no seam shows between tiles. */}
            <path className="ww-mud" d={`M ${edge(0, TILE.bank, BANK.far - 4, 4, 1)} L ${TILE.bank} ${BANK.far + 10} L 0 ${BANK.far + 10} Z`} />
            <path className="ww-bank-line" d={`M ${edge(0, TILE.bank, BANK.far - 4, 4, 1)}`} />
            <path className="ww-bank-line" d={`M0 ${BANK.far + 10} L ${TILE.bank} ${BANK.far + 10}`} />
            <path className="ww-sand" d={`M ${edge(0, TILE.bank, BANK.near + 10, 4, 2)} L ${TILE.bank} ${BANK.near - 4} L 0 ${BANK.near - 4} Z`} />
            <path className="ww-bank-line" d={`M ${edge(0, TILE.bank, BANK.near + 10, 4, 2)}`} />
            <path className="ww-bank-line" d={`M0 ${BANK.near - 4} L ${TILE.bank} ${BANK.near - 4}`} />
            {[0, 1, 2, 3, 4, 5].map(t => (
                <g key={t} transform={`translate(${30 + t * 92 + wob(t, 3) * 18} ${44 + wob(t, 5) * 10})`}><Tree kind={t % 3 === 1 ? 'pine' : 'round'} s={0.72 + (wob(t, 7) + 1) * 0.12} k={t} /></g>
            ))}
            {[0, 1, 2, 3].map(t => (
                <g key={`r${t}`} className="ww-reeds" transform={`translate(${60 + t * 140 + wob(t, 2) * 30} 298)`}>
                    <path d="M0 0 C -2 -14 -6 -24 -10 -34 M 6 0 C 6 -16 8 -26 12 -38 M -6 0 C -8 -10 -14 -18 -20 -24 M 12 0 C 14 -8 20 -16 26 -20" />
                    <ellipse className="ww-cattail" cx="12" cy="-40" rx="3" ry="7" />
                    <ellipse className="ww-cattail" cx="-10" cy="-36" rx="3" ry="6" />
                </g>
            ))}
            <g transform={`translate(${TILE.bank * 0.4} ${BANK.near + 18})`}><path className="ww-stone" d="M-14 4 C -14 -6 10 -8 14 2 C 10 8 -10 8 -14 4 Z" /></g>
        </g>
    );
    return <g ref={layerRef}>{Array.from({ length: tilesFor(w, TILE.bank) }, (_, i) => tile(i))}</g>;
}

/** One lane's flow lines (scroll with the lane: the raft's speed shows in the water). */
export function Flow({ w, groundRef }: { w: number; groundRef: Ref<SVGGElement> }) {
    return (
        <g ref={groundRef} className="ww-flow">
            {Array.from({ length: tilesFor(w, TILE.flow) }, (_, i) => (
                <g key={i} transform={`translate(${i * TILE.flow} 0)`}>
                    {[[10, -34, 30], [90, -8, 22], [150, 26, 34], [40, 38, 18], [120, -40, 16]].map(([x, y, l], k) => <path key={k} d={`M${x} ${y} l ${l} 0`} />)}
                </g>
            ))}
        </g>
    );
}

/** The finish: the river's lip, the waterfall's curtain and the lake below, across the whole river (x 0 = the lip). */
export function Waterfall({ top, bottom, w }: { top: number; bottom: number; w: number }) {
    const lake = CURTAIN;
    return (
        <g className="ww-falls">
            <rect className="ww-lake" x={lake - 8} y={top + 2} width={w} height={bottom - top - 2} />
            <g className="ww-lake-ripples">
                {[0, 1, 2].map(i => <ellipse key={i} cx={lake + 70 + i * 40} cy={top + 40 + i * 50} rx="24" ry="8" style={v({ '--i': i })} />)}
            </g>
            <g transform={`translate(${lake + 200} ${bottom - 22})`} className="ww-lily"><path d="M0 0 m -14 0 a 14 8 0 1 0 28 0 a 14 8 0 1 0 -28 0 M 0 0 L 12 -4" /><circle className="ww-lily-flower" cx="-4" cy="-3" r="4" /></g>
            <path className="ww-cliff" d={`M-4 ${top - 18} L ${lake + 6} ${top - 30} L ${lake + 6} ${top + 2} L -4 ${top + 6} Z`} />
            <path className="ww-cliff" d={`M-4 ${bottom - 4} L ${lake + 6} ${bottom + 6} L ${lake + 6} ${bottom + 30} L -4 ${bottom + 18} Z`} />
            <rect className="ww-curtain" x={0} y={top + 2} width={CURTAIN} height={bottom - top - 2} />
            <g className="ww-curtain-streaks">
                {Array.from({ length: 9 }, (_, i) => <path key={i} d={`M2 ${top + 14 + i * ((bottom - top - 20) / 9)} l ${CURTAIN - 6} ${4 + (i % 2) * 3}`} style={v({ '--i': i })} />)}
            </g>
            <path className="ww-lip" d={`M-6 ${top + 2} ${Array.from({ length: 10 }, (_, i) => `Q ${i % 2 ? 8 : -8} ${top + 2 + i * ((bottom - top) / 10) + (bottom - top) / 20} -2 ${top + 2 + (i + 1) * ((bottom - top) / 10)}`).join(' ')}`} />
            <g className="ww-mist">
                {[0, 1, 2, 3, 4].map(i => <circle key={i} cx={lake + 8 + (i % 2) * 10} cy={top + 20 + i * ((bottom - top) / 5)} r={14 + (i % 3) * 4} style={v({ '--i': i })} />)}
            </g>
        </g>
    );
}

/** The card's picture: the winner's raft, the paddlers cheering. */
export function CardRaft({ side }: { side: Side }) {
    return (
        <svg className={`ww-card-art is-${side}`} viewBox="-90 -80 180 120" aria-hidden>
            <ellipse className="ww-card-water" cx="0" cy="18" rx="86" ry="22" />
            <g className="ww-bob"><Raft look={{ mood: 'cheer' }} /></g>
        </svg>
    );
}
