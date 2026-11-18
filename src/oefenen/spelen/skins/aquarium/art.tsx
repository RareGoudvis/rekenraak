import type { CSSProperties } from 'react';
import type { ItemKind } from './tank';
import { CABINET_Y, FLOOR_Y, GLASS, SAND_Y, WATER_TOP } from './tank';

// Aquarium's drawings, flat fills under the --spel-ink outline (aquarium.css). Fish face right round their own centre;
// plants and decor stand on their base (0, 0); the scene places them. Moving parts carry aq-* classes for their CSS life.

const st = (vars: Record<string, string | number>) => vars as CSSProperties;

// ── Fish ──────────────────────────────────────────────────────────────────

function Eye({ x, y, r = 2.6 }: { x: number; y: number; r?: number }) {
    return (
        <g className="aq-eye">
            <circle className="aq-eye-white" cx={x} cy={y} r={r} />
            <circle className="aq-eye-dot" cx={x + r * 0.28} cy={y} r={r * 0.55} />
            <circle className="aq-eye-glint" cx={x + r * 0.05} cy={y - r * 0.35} r={r * 0.22} />
        </g>
    );
}

function Goldfish({ white = false }: { white?: boolean }) {
    const c = white ? 'is-white' : '';
    return (
        <g className={`aq-goldfish ${c}`}>
            {white && <circle className="aq-white-glow" r="19" />}
            <g className="aq-tail" style={st({ '--jx': '-9px' })}>
                <path className="aq-fin aq-gf-fin" d="M-9 0 C-14 -4 -18 -12 -22 -11 C-20 -5 -19 -2 -18 0 C-19 2 -20 5 -22 11 C-18 12 -14 4 -9 0 Z" />
            </g>
            <path className="aq-fin aq-gf-fin" d="M-5 -7 C-3 -13 4 -13 7 -7 Z" />
            <ellipse className="aq-body aq-gf-body" cx="1" cy="0" rx="11.5" ry="8.2" />
            <path className="aq-scale" d="M-3 -2 q2 2 0 4 M1 -4 q2 2 0 4 M1 1 q2 2 0 4 M-3 3 q1.5 1.5 0 3" />
            <path className="aq-fin aq-gf-fin aq-pec" d="M1 3 C-1 8 4 9 5.5 5 Z" />
            <path className="aq-shine" d="M-4 -5 Q1 -7.5 6 -5.5" />
            <Eye x={6.6} y={-2} />
            <path className="aq-mouth" d="M12.2 1 Q11 2.3 11.8 3" />
            {white && (
                <g className="aq-sparkles">
                    {[[-14, -14, 0], [14, -12, 1], [-2, 13, 2], [18, 8, 3]].map(([x, y, i]) => (
                        <path key={i} className="aq-sparkle" style={st({ '--i': i })} transform={`translate(${x} ${y})`} d="M0 -4 L1 -1 L4 0 L1 1 L0 4 L-1 1 L-4 0 L-1 -1 Z" />
                    ))}
                </g>
            )}
        </g>
    );
}

function Neon() {
    return (
        <g className="aq-neon">
            <g className="aq-tail aq-tail-fast" style={st({ '--jx': '-5px' })}><path className="aq-fin aq-neon-fin" d="M-5 0 L-9 -3 L-8.5 0 L-9 3 Z" /></g>
            <ellipse className="aq-body aq-neon-body" cx="0.5" cy="0" rx="6" ry="2.7" />
            <path className="aq-neon-red" d="M-4.8 0.6 Q-1 2.6 2 1.4 L2 0.6 Z" />
            <path className="aq-neon-blue" d="M-4.5 -0.6 L5.4 -0.6" />
            <circle className="aq-eye-dot" cx="4.2" cy="-0.4" r="0.9" />
        </g>
    );
}

function Guppy() {
    return (
        <g className="aq-guppy">
            <g className="aq-tail" style={st({ '--jx': '-3px' })}>
                <path className="aq-fin aq-guppy-tail" d="M-3 0 C-8 -10 -15 -9 -16 -1 C-15 7 -8 9 -3 0 Z" />
                <g className="aq-guppy-dots"><circle cx="-10" cy="-3" r="1.3" /><circle cx="-12" cy="2" r="1.1" /><circle cx="-8" cy="3.5" r="1" /></g>
            </g>
            <path className="aq-fin aq-guppy-tail" d="M-1 -3 C1 -7 4 -6 4 -3 Z" />
            <ellipse className="aq-body aq-guppy-body" cx="2" cy="0" rx="6" ry="3.6" />
            <Eye x={5.2} y={-0.8} r={1.6} />
        </g>
    );
}

function Clownfish() {
    return (
        <g className="aq-clown">
            <g className="aq-tail" style={st({ '--jx': '-8px' })}>
                <path className="aq-fin aq-clown-fin" d="M-8 0 C-11 -5 -15 -6 -15 -3 L-15 3 C-15 6 -11 5 -8 0 Z" />
            </g>
            <path className="aq-fin aq-clown-fin" d="M-5 -5 C-3 -10 3 -10 5 -5.5 Z" />
            <path className="aq-fin aq-clown-fin" d="M-3 5 C-1 9 3 9 4 5 Z" />
            <ellipse className="aq-body aq-clown-body" cx="0" cy="0" rx="9.5" ry="6.2" />
            <path className="aq-band" d="M3.4 -5.8 Q6.4 0 3.4 5.8 L5.9 5 Q8.6 0 5.9 -5 Z" />
            <path className="aq-band" d="M-2.4 -6.1 Q0.2 0 -2.4 6.1 L0.6 6.1 Q3.2 0 0.6 -6.1 Z" />
            <path className="aq-band" d="M-8 -3.4 Q-6.6 0 -8 3.4 L-6.2 4.6 Q-4.4 0 -6.2 -4.6 Z" />
            <Eye x={6.4} y={-1.6} r={2} />
        </g>
    );
}

function Angelfish() {
    return (
        <g className="aq-angel">
            <path className="aq-fin aq-angel-fin" d="M-1 -6.5 C-5 -15 -10 -19 -13 -18 C-10 -12 -7 -8 -5 -4.5 Z" />
            <path className="aq-fin aq-angel-fin" d="M-1 6.5 C-5 15 -10 19 -13 18 C-10 12 -7 8 -5 4.5 Z" />
            <g className="aq-tail" style={st({ '--jx': '-5px' })}>
                <path className="aq-fin aq-angel-fin" d="M-5 0 C-9 -5 -11 -6 -13 -5 L-13 5 C-11 6 -9 5 -5 0 Z" />
            </g>
            <path className="aq-body aq-angel-body" d="M9 0 C6 -6 0 -8.5 -4 -6.5 C-6.5 -3 -6.5 3 -4 6.5 C0 8.5 6 6 9 0 Z" />
            <path className="aq-angel-stripe" d="M3.5 -6.5 L3.5 6.5 M-1.5 -7.6 L-1.5 7.6" />
            <path className="aq-feeler" d="M1 5.5 C0 10 -1 14 -3 17" />
            <Eye x={5} y={-1.3} r={1.9} />
        </g>
    );
}

function Pufferfish() {
    return (
        <g className="aq-puffer">
            <g className="aq-puff-flat">
                <g className="aq-tail" style={st({ '--jx': '-9px' })}><path className="aq-fin aq-puff-fin" d="M-9 0 L-14 -5 L-13 0 L-14 5 Z" /></g>
                <path className="aq-body aq-puff-body" d="M10 0 C10 -6 4 -8 -2 -8 C-8 -8 -10 -4 -10 0 C-10 4 -8 8 -2 8 C4 8 10 6 10 0 Z" />
                <path className="aq-puff-belly" d="M8 2.5 C6 6 0 7.5 -6 5.5 C-2 4 3 3 8 2.5 Z" />
                <g className="aq-puff-spot"><circle cx="-3" cy="-4" r="1.2" /><circle cx="1" cy="-5" r="1" /><circle cx="-6" cy="-1" r="1" /></g>
                <path className="aq-fin aq-puff-fin aq-pec" d="M1 1 C0 5 4 5 5 2 Z" />
                <Eye x={4.6} y={-2.2} r={3} />
                <path className="aq-mouth" d="M10 1 Q9 2 9.6 2.6" />
            </g>
            <g className="aq-puff-ball">
                <path className="aq-puff-spikes" d={Array.from({ length: 14 }, (_, i) => {
                    const a = (i / 14) * Math.PI * 2;
                    const at = (r: number, da = 0) => `${(Math.cos(a + da) * r).toFixed(1)} ${(Math.sin(a + da) * r).toFixed(1)}`;
                    return `M${at(11, -0.12)} L${at(15)} L${at(11, 0.12)}`;
                }).join(' ')} />
                <circle className="aq-body aq-puff-body" r="12" />
                <path className="aq-puff-belly" d="M10 4 C6 11 -6 11 -10 4 C-4 8 4 8 10 4 Z" />
                <Eye x={4} y={-4} r={3.6} />
                <circle className="aq-puff-o" cx="9.5" cy="2.5" r="1.8" />
                <path className="aq-fin aq-puff-fin" d="M-12 0 L-16 -3 L-16 3 Z" />
            </g>
        </g>
    );
}

function BlueTang() {
    return (
        <g className="aq-tang">
            <g className="aq-tail" style={st({ '--jx': '-8px' })}><path className="aq-fin aq-tang-tail" d="M-8 0 L-15 -7 Q-13 0 -15 7 Z" /></g>
            <path className="aq-fin aq-tang-fin" d="M-6 -6 C-2 -10 5 -10 8 -5 Z" />
            <path className="aq-body aq-tang-body" d="M11 0 C9 -7 0 -9 -6 -7 C-10 -5 -10 5 -6 7 C0 9 9 7 11 0 Z" />
            <path className="aq-tang-mark" d="M6 -4.5 C0 -8.5 -8 -5 -6.5 2 C-4 -2 1 -3.4 6 -2.4 Z" />
            <path className="aq-tang-streak" d="M-7 3 Q-2 5.5 4 4" />
            <Eye x={6.8} y={-1.6} r={2.2} />
        </g>
    );
}

function Catfish() {
    return (
        <g className="aq-catfish">
            <g className="aq-tail aq-tail-slow" style={st({ '--jx': '-10px' })}><path className="aq-fin aq-cf-fin" d="M-10 0 L-16 -5 L-14 0 L-16 5 Z" /></g>
            <path className="aq-fin aq-cf-fin" d="M-2 -5.6 L1 -12 L5 -5.4 Z" />
            <path className="aq-body aq-catfish-body" d="M11 1 C10 -4 4 -6.4 -2 -6.4 C-8 -5.6 -11 -2 -11 1 C-8 4.6 4 5.4 11 1 Z" />
            <g className="aq-catfish-dots"><circle cx="-5" cy="-2" r="1" /><circle cx="-1" cy="-3.6" r="0.9" /><circle cx="2" cy="-1" r="1" /><circle cx="-7" cy="1" r="0.8" /></g>
            <path className="aq-whisker" d="M10.4 2 Q13 4 14.2 6.4 M10.6 1.6 Q14 1.8 15.4 3.2" />
            <Eye x={6} y={-2} r={1.8} />
        </g>
    );
}

function Seahorse() {
    return (
        <g className="aq-seahorse">
            <path className="aq-sh-tail" d="M-0.6 4 C-1.4 9.6 2.4 12 3.8 9.4 C4.8 7.6 2.6 6.6 1.6 7.8" />
            <path className="aq-sh-tail is-fill" d="M-0.6 4 C-1.4 9.6 2.4 12 3.8 9.4 C4.8 7.6 2.6 6.6 1.6 7.8" />
            <path className="aq-fin aq-sh-fin" d="M-3.4 -1 C-7 -2 -7 3 -3.2 2.4 Z" />
            <path className="aq-body aq-sh-body" d="M0 -11 C4 -11.5 5 -8.5 3.8 -6.4 C3 -4.8 3.6 -3 3.6 -0.5 C3.6 3 1.6 5.6 -0.6 5.6 C-3 5.6 -3.8 2.4 -3.2 -0.8 C-2.6 -3.6 -3.6 -5.6 -3 -8 C-2.6 -9.8 -1.4 -10.8 0 -11 Z" />
            <path className="aq-body aq-sh-body" d="M3 -9.4 L8.2 -8.4 L8.2 -6.6 L3.4 -6.4 Z" />
            <path className="aq-sh-ridge" d="M-2.4 -2 L1.6 -2.4 M-2.6 0.8 L2.6 0.4 M-2 3.4 L2 3" />
            <path className="aq-sh-crown" d="M-1.4 -11 L-0.6 -13.4 L0.6 -11.2 L1.6 -13 L2 -10.8" />
            <Eye x={1.6} y={-8.6} r={1.5} />
        </g>
    );
}

function Crab() {
    return (
        <g className="aq-crab">
            <path className="aq-crab-leg" d="M-5 1 L-11 4 L-12 7 M-5 2.5 L-10 6.5 L-10 9 M-4 3.5 L-7 8 L-6.5 10 M5 1 L11 4 L12 7 M5 2.5 L10 6.5 L10 9 M4 3.5 L7 8 L6.5 10" />
            <g className="aq-claw aq-claw-l"><path className="aq-crab-arm" d="M-5 -1 L-9 -4" /><path className="aq-body aq-crab-shell" d="M-9 -4 C-14 -4 -15 -10 -11 -11 L-10 -8 L-7.6 -9.6 C-6.6 -7 -7 -4.6 -9 -4 Z" /></g>
            <g className="aq-claw aq-claw-r"><path className="aq-crab-arm" d="M5 -1 L9 -4" /><path className="aq-body aq-crab-shell" d="M9 -4 C14 -4 15 -10 11 -11 L10 -8 L7.6 -9.6 C6.6 -7 7 -4.6 9 -4 Z" /></g>
            <path className="aq-crab-arm" d="M-2.4 -3 L-3 -7.6 M2.4 -3 L3 -7.6" />
            <ellipse className="aq-body aq-crab-shell" cx="0" cy="0.5" rx="7.4" ry="4.6" />
            <circle className="aq-eye-white" cx="-3" cy="-8.4" r="1.8" /><circle className="aq-eye-dot" cx="-3" cy="-8.4" r="0.9" />
            <circle className="aq-eye-white" cx="3" cy="-8.4" r="1.8" /><circle className="aq-eye-dot" cx="3" cy="-8.4" r="0.9" />
            <path className="aq-mouth" d="M-1.6 1.6 Q0 3 1.6 1.6" />
        </g>
    );
}

function Snail() {
    return (
        <g className="aq-snail">
            <g className="aq-snail-foot">
                <path className="aq-body aq-snail-body" d="M-8 2 L6 2 Q10 2 10 -1 Q10 -4.4 7 -4.4 L4 -4.4 C2 -1 -4 -1 -8 2 Z" />
                <path className="aq-snail-stalk" d="M7.4 -4 L8.6 -8.6 M9 -3.6 L11.2 -7.6" />
                <circle className="aq-eye-dot" cx="8.6" cy="-8.8" r="1" /><circle className="aq-eye-dot" cx="11.2" cy="-7.8" r="1" />
            </g>
            <circle className="aq-body aq-snail-shell" cx="-1" cy="-5" r="6.2" />
            <path className="aq-snail-swirl" d="M-1 -5 m1.6 0 a1.6 1.6 0 1 1 -3.2 0 a3.4 3.4 0 1 1 6.8 0 a5 5 0 0 1 -1.2 3.4" />
        </g>
    );
}

/** A swimmer or crawler of the tank, centred on (0, 0) facing right. */
export function SwimmerArt({ kind }: { kind: ItemKind }) {
    switch (kind) {
        case 'goudvis': return <Goldfish />;
        case 'witteGoudvis': return <Goldfish white />;
        case 'neons': return <Neon />;
        case 'guppy': return <Guppy />;
        case 'clownvis': return <Clownfish />;
        case 'maanvis': return <Angelfish />;
        case 'kogelvis': return <Pufferfish />;
        case 'doktersvis': return <BlueTang />;
        case 'meerval': return <Catfish />;
        case 'zeepaardje': return <Seahorse />;
        case 'krab': return <Crab />;
        case 'slak': return <Snail />;
        default: return null;
    }
}

// ── Plants and decor (standing on their base at 0, 0) ─────────────────────

function Leaf({ d, i, cls = '' }: { d: string; i: number; cls?: string }) {
    return <path className={`aq-leaf ${cls}`} style={st({ '--i': i })} d={d} />;
}

/** Vallisneria: long ribbons up to the surface. */
function TallPlant() {
    const h = SAND_Y - WATER_TOP - 6;
    const ribbons: [number, number, number][] = [[-8, -0.7, 0.8], [-3, -1, 1], [2, 0.6, 0.92], [7, 1, 0.74], [-12, -1.4, 0.55]];
    return (
        <g className="aq-plant aq-plant-tall">
            {ribbons.map(([x, lean, k], i) => {
                const top = -h * k;
                const bend = lean * 10;
                return <Leaf key={i} i={i} cls={i % 2 ? 'is-dark' : ''} d={`M${x - 2} 0 C${x - 3 + bend} ${top * 0.35} ${x + 4 + bend} ${top * 0.7} ${x + bend * 1.4} ${top} C${x + 1 + bend} ${top * 0.7} ${x - 6 + bend} ${top * 0.35} ${x + 2} 0 Z`} />;
            })}
        </g>
    );
}

/** Java fern: a clump of long round leaves. */
function BushPlant() {
    const leaves: [number, number][] = [[-38, 34], [-18, 40], [0, 44], [18, 40], [36, 32], [-56, 22], [56, 22]];
    return (
        <g className="aq-plant aq-plant-bush">
            {leaves.map(([a, len], i) => (
                <g key={i} transform={`rotate(${a})`}>
                    <Leaf i={i} cls={i % 2 ? 'is-dark' : ''} d={`M0 0 C-6 ${-len * 0.3} -6 ${-len * 0.8} 0 ${-len} C6 ${-len * 0.8} 6 ${-len * 0.3} 0 0 Z`} />
                    <path className="aq-vein" d={`M0 -2 L0 ${-len + 4}`} />
                </g>
            ))}
            <ellipse className="aq-rock" cx="0" cy="-1" rx="12" ry="5" />
        </g>
    );
}

/** Ludwigia: three red stems with paired leaves. */
function RedPlant() {
    const stems: [number, number][] = [[-7, 58], [0, 70], [7, 50]];
    return (
        <g className="aq-plant aq-plant-red">
            {stems.map(([x, h], i) => (
                <g key={i} className="aq-stem-sway" style={st({ '--i': i })}>
                    <path className="aq-stem" d={`M${x} 0 Q${x + (i - 1) * 4} ${-h / 2} ${x + (i - 1) * 6} ${-h}`} />
                    {Array.from({ length: Math.floor(h / 11) }, (_, k) => {
                        const y = -8 - k * 11;
                        const cx = x + ((i - 1) * 6 * -y) / h;
                        return (
                            <g key={k}>
                                <path className="aq-red-leaf" d={`M${cx} ${y} C${cx - 5} ${y - 6} ${cx - 10} ${y - 2} ${cx - 10} ${y + 1} C${cx - 6} ${y + 1} ${cx - 3} ${y + 1} ${cx} ${y} Z`} />
                                <path className="aq-red-leaf" d={`M${cx} ${y} C${cx + 5} ${y - 6} ${cx + 10} ${y - 2} ${cx + 10} ${y + 1} C${cx + 6} ${y + 1} ${cx + 3} ${y + 1} ${cx} ${y} Z`} />
                            </g>
                        );
                    })}
                </g>
            ))}
        </g>
    );
}

function Shell() {
    return (
        <g className="aq-shell">
            <path className="aq-shell-body" d="M0 -12 C-7 -12 -12 -6 -12 -1 L-4 1 L0 2 L4 1 L12 -1 C12 -6 7 -12 0 -12 Z" />
            <path className="aq-shell-ridge" d="M0 -11 L0 1 M-5 -10 L-2.4 1 M5 -10 L2.4 1 M-9 -6.6 L-4.6 0.8 M9 -6.6 L4.6 0.8" />
            <path className="aq-shell-hinge" d="M-4 1 L-3 4 L3 4 L4 1 Z" />
            <path className="aq-glint" d="M-6 -7 L-5 -5 L-3 -4.6 L-5 -4 L-6 -2 L-7 -4 L-9 -4.6 L-7 -5 Z" />
        </g>
    );
}

function Castle() {
    const crenel = (x0: number, x1: number, y: number) => {
        const w = (x1 - x0) / 5;
        return `M${x0} ${y} L${x0} ${y - 5} L${x0 + w} ${y - 5} L${x0 + w} ${y} L${x0 + 2 * w} ${y} L${x0 + 2 * w} ${y - 5} L${x0 + 3 * w} ${y - 5} L${x0 + 3 * w} ${y} L${x0 + 4 * w} ${y} L${x0 + 4 * w} ${y - 5} L${x1} ${y - 5} L${x1} ${y}`;
    };
    return (
        <g className="aq-castle">
            <path className="aq-stone" d={`M-10 0 L-10 -30 ${crenel(-10, 10, -30).slice(1).replace(/^/, 'L')} L10 0 Z`} />
            <path className="aq-stone is-tower" d={`M-24 0 L-24 -46 ${crenel(-24, -10, -46).slice(1).replace(/^/, 'L')} L-10 0 Z`} />
            <path className="aq-stone is-tower" d={`M10 0 L10 -40 ${crenel(10, 24, -40).slice(1).replace(/^/, 'L')} L24 0 Z`} />
            <path className="aq-door" d="M-5 0 L-5 -11 A5 5 0 0 1 5 -11 L5 0 Z" />
            <path className="aq-window" d="M-19 -34 L-19 -39 A2 2 0 0 1 -15 -39 L-15 -34 Z M15 -28 L15 -33 A2 2 0 0 1 19 -33 L19 -28 Z M-19 -18 L-19 -22 A2 2 0 0 1 -15 -22 L-15 -18 Z" />
            <path className="aq-brick" d="M-24 -10 L-10 -10 M10 -14 L24 -14 M-10 -20 L10 -20 M-24 -28 L-10 -28 M-17 -10 L-17 -4 M16 -14 L16 -20" />
            <path className="aq-moss" d="M-24 0 C-22 -6 -18 -4 -16 0 Z M14 0 C16 -5 20 -6 24 0 Z" />
            <Bubbles x={-17} y={-52} n={4} cls="aq-castle-bubbles" />
        </g>
    );
}

function Chest() {
    return (
        <g className="aq-chest">
            <g className="aq-chest-inside">
                <path className="aq-chest-dark" d="M-11 -12 L11 -12 L11 -9 L-11 -9 Z" />
                <g className="aq-coins"><ellipse cx="-5" cy="-12.5" rx="3" ry="1.6" /><ellipse cx="1" cy="-13" rx="3" ry="1.6" /><ellipse cx="6" cy="-12.4" rx="3" ry="1.6" /></g>
                <path className="aq-chest-glow" d="M-9 -13 L-14 -30 L14 -30 L9 -13 Z" />
            </g>
            <path className="aq-wood" d="M-12 0 L-12 -12 L12 -12 L12 0 Z" />
            <path className="aq-band-gold" d="M-12 -4 L12 -4 M-7 -12 L-7 0 M7 -12 L7 0" />
            <g className="aq-chest-lid">
                <path className="aq-wood" d="M-12 -12 L-12 -16 C-12 -21 12 -21 12 -16 L12 -12 Z" />
                <path className="aq-band-gold" d="M-7 -19.6 L-7 -12 M7 -19.6 L7 -12" />
                <rect className="aq-lock" x="-2.4" y="-14.4" width="4.8" height="5" rx="1" />
            </g>
            <Bubbles x={0} y={-16} n={5} cls="aq-chest-bubbles" />
        </g>
    );
}

function Diver() {
    return (
        <g className="aq-diver">
            <path className="aq-hose" d="M5 -30 C14 -44 6 -60 16 -78" />
            <g className="aq-diver-rock">
                <path className="aq-boot" d="M-8 0 L-8 -4 L-2 -4 L-1 0 Z M2 0 L2 -4 L8 -4 L9 0 Z" />
                <path className="aq-suit" d="M-7 -4 L-6 -18 L6 -18 L7 -4 L1.6 -4 L0 -10 L-1.6 -4 Z" />
                <path className="aq-suit" d="M-6 -17 C-10 -14 -11 -10 -10 -7 L-7.4 -7.4 C-7.6 -10 -6 -12 -4.6 -13 Z M6 -17 C10 -14 11 -10 10 -7 L7.4 -7.4 C7.6 -10 6 -12 4.6 -13 Z" />
                <rect className="aq-weight" x="-6.4" y="-12" width="12.8" height="3" rx="1" />
                <path className="aq-collar" d="M-8 -18 L8 -18 L7 -21 L-7 -21 Z" />
                <circle className="aq-helmet" cx="0" cy="-29" r="9.4" />
                <circle className="aq-porthole" cx="0" cy="-29" r="5" />
                <path className="aq-porthole-shine" d="M-2.6 -31.6 Q-1 -33.4 1 -33" />
                <circle className="aq-bolt" cx="-7.2" cy="-25" r="1" /><circle className="aq-bolt" cx="7.2" cy="-25" r="1" /><circle className="aq-bolt" cx="0" cy="-38" r="1" />
            </g>
            <Bubbles x={1} y={-40} n={4} cls="aq-diver-bubbles" />
        </g>
    );
}

function RockArch() {
    return (
        <g className="aq-arch">
            <path className="aq-rock" d="M-26 0 C-27 -26 -16 -38 0 -38 C16 -38 27 -26 26 0 L15 0 C15 -20 9 -26 0 -26 C-9 -26 -15 -20 -15 0 Z" />
            <path className="aq-rock-line" d="M-22 -20 L-14 -18 M-8 -36 L-6 -26 M10 -35 L7 -26 M18 -14 L25 -16" />
            <path className="aq-moss" d="M-18 -34 C-12 -42 -2 -42 4 -38 C-4 -36 -10 -34 -18 -30 Z M14 -32 C20 -30 24 -24 26 -18 C22 -22 18 -26 12 -28 Z" />
        </g>
    );
}

function Starfish() {
    const pts = Array.from({ length: 10 }, (_, i) => {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const r = i % 2 ? 4 : 10;
        return `${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r * 0.62).toFixed(1)}`;
    });
    return (
        <g className="aq-star" transform="translate(0 -4)">
            <path className="aq-star-body" d={`M${pts.join(' L')} Z`} />
            <g className="aq-star-dots"><circle cx="0" cy="-3" r="0.9" /><circle cx="-3.4" cy="0" r="0.9" /><circle cx="3.4" cy="0" r="0.9" /><circle cx="-2" cy="2.4" r="0.8" /><circle cx="2" cy="2.4" r="0.8" /></g>
            <path className="aq-star-smile" d="M-1.6 0.2 Q0 1.6 1.6 0.2" />
        </g>
    );
}

/** A plant or a decoration of the tank on its base. */
export function StandArt({ kind }: { kind: ItemKind }) {
    switch (kind) {
        case 'plantHoog': return <TallPlant />;
        case 'plantBos': return <BushPlant />;
        case 'plantRood': return <RedPlant />;
        case 'schelp': return <Shell />;
        case 'kasteel': return <Castle />;
        case 'schatkist': return <Chest />;
        case 'duiker': return <Diver />;
        case 'steenboog': return <RockArch />;
        case 'zeester': return <Starfish />;
        default: return null;
    }
}

/** A short column of bubbles rising from (x, y), each on its own delay (aquarium.css). */
export function Bubbles({ x, y, n, cls, rise = 0 }: { x: number; y: number; n: number; cls: string; rise?: number }) {
    return (
        <g className={`aq-bubbles ${cls}`} style={rise ? st({ '--rise': `${-rise}px` }) : undefined}>
            {Array.from({ length: n }, (_, i) => (
                <circle key={i} className="aq-bubble" cx={x + ((i * 7) % 5) - 2} cy={y} r={1.1 + ((i * 3) % 4) * 0.45} style={st({ '--i': i, '--n': n })} />
            ))}
        </g>
    );
}

// ── The room, the cabinet and the tank's frame ────────────────────────────

/** The wall, window, picture, floor and the cabinet; drawn behind the tank. */
export function Room({ clip }: { clip: string }) {
    return (
        <g className="aq-room">
            <defs>
                <pattern id={`${clip}-paper`} width="24" height="30" patternUnits="userSpaceOnUse">
                    <rect className="aq-wall" width="24" height="30" />
                    <rect className="aq-wall-stripe" x="18" width="4" height="30" />
                    <path className="aq-wall-wave" d="M3 8 q3 -3 6 0 t6 0 M3 23 q3 -3 6 0 t6 0" />
                </pattern>
                <linearGradient id={`${clip}-day`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" className="aq-day-0" /><stop offset="1" className="aq-day-1" />
                </linearGradient>
            </defs>
            <rect x={-2000} y={-2000} width={4400} height={2000 + FLOOR_Y} fill={`url(#${clip}-paper)`} />
            {/* The window with a sunny garden, curtains and a pot plant on the sill. */}
            <g className="aq-window-room" transform="translate(-30 0)">
                <rect x="352" y="-60" width="56" height="120" fill={`url(#${clip}-day)`} />
                <circle className="aq-sun" cx="392" cy="-34" r="9" />
                <path className="aq-hedge" d="M352 44 Q366 30 380 40 Q394 30 408 40 L408 60 L352 60 Z" />
                <rect className="aq-frame" x="352" y="-60" width="56" height="120" rx="2" />
                <path className="aq-frame-bar" d="M380 -60 L380 60 M352 0 L408 0" />
                <rect className="aq-sill" x="346" y="60" width="68" height="6" rx="2" />
                <path className="aq-curtain" d="M340 -70 L356 -70 Q350 -10 358 30 Q348 60 352 74 L336 74 Z" />
                <path className="aq-curtain" d="M420 -70 L404 -70 Q410 -10 402 30 Q412 60 408 74 L424 74 Z" />
                <path className="aq-pot" d="M362 60 L364 50 L376 50 L378 60 Z" />
                <path className="aq-pot-leaf" d="M370 50 C364 42 360 40 358 34 C364 36 368 40 370 50 Z M370 50 C374 40 380 38 384 36 C382 42 376 46 370 50 Z M370 50 C370 42 371 36 372 30 C374 38 373 44 370 50 Z" />
            </g>
            {/* A framed fish drawing on the wall, slightly crooked. */}
            <g className="aq-picture" transform="translate(88 50) rotate(-3)">
                <rect className="aq-picture-frame" x="-24" y="-20" width="48" height="38" rx="2" />
                <rect className="aq-picture-paper" x="-19" y="-15" width="38" height="28" />
                <path className="aq-doodle" d="M-8 -1 C-4 -7 6 -7 9 -1 C6 5 -4 5 -8 -1 Z M-8 -1 L-13 -5 L-13 3 Z" />
                <circle className="aq-doodle-eye" cx="5" cy="-2" r="1.2" />
                <path className="aq-doodle-bub" d="M12 -9 a2 2 0 1 0 0.1 0 M15 -13 a1.4 1.4 0 1 0 0.1 0" />
            </g>
            {/* A hanging lamp over the tank. */}
            <g className="aq-hang-lamp">
                <path className="aq-cord" d="M170 -2000 L170 34" />
                <path className="aq-lampshade" d="M152 52 L160 34 L180 34 L188 52 Z" />
                <ellipse className="aq-bulb" cx="170" cy="53" rx="6" ry="3" />
            </g>
            <rect className="aq-floor" x={-2000} y={FLOOR_Y} width={4400} height={2000} />
            {[284, 300, 322].map(y => <path key={y} className="aq-plank" d={`M-2000 ${y} L2400 ${y}`} />)}
            <rect className="aq-skirting" x={-2000} y={FLOOR_Y - 6} width={4400} height="6" />
            <ellipse className="aq-rug" cx="190" cy="292" rx="210" ry="16" />
            <ellipse className="aq-rug-edge" cx="190" cy="292" rx="196" ry="12" />
            {/* The cat's empty bowl on the floor: it is hungry. */}
            <g className="aq-bowl" transform="translate(378 282)">
                <path className="aq-bowl-body" d="M-14 -6 L14 -6 L10 3 L-10 3 Z" />
                <path className="aq-bowl-rim" d="M-15 -6 L15 -6" />
                <path className="aq-bowl-fish" d="M-5 -1 C-3 -3.4 2 -3.4 4 -1 C2 1.4 -3 1.4 -5 -1 Z M-5 -1 L-8 -3 L-8 1 Z" />
            </g>
            <Cabinet />
        </g>
    );
}

function Cabinet() {
    return (
        <g className="aq-cabinet">
            <path className="aq-leg" d={`M18 266 L20 ${FLOOR_Y} L28 ${FLOOR_Y} L30 266 Z M340 266 L342 ${FLOOR_Y} L350 ${FLOOR_Y} L352 266 Z`} />
            <rect className="aq-wood" x="14" y={CABINET_Y + 6} width="342" height={266 - CABINET_Y - 6} rx="2" />
            <rect className="aq-door-panel" x="24" y={CABINET_Y + 13} width="158" height="25" rx="2" />
            <rect className="aq-door-panel" x="188" y={CABINET_Y + 13} width="158" height="25" rx="2" />
            <circle className="aq-knob" cx="172" cy={CABINET_Y + 25.5} r="2.6" />
            <circle className="aq-knob" cx="198" cy={CABINET_Y + 25.5} r="2.6" />
            <rect className="aq-top" x="8" y={CABINET_Y} width="354" height="7" rx="3" />
            {/* The fish food tin beside the tank. */}
            <g className="aq-tin" transform={`translate(26 ${CABINET_Y})`}>
                <rect className="aq-tin-body" x="-8" y="-18" width="16" height="18" rx="2" />
                <rect className="aq-tin-lid" x="-9" y="-21" width="18" height="4" rx="1.5" />
                <path className="aq-tin-fish" d="M-4 -9 C-2 -12 2 -12 4 -9 C2 -6 -2 -6 -4 -9 Z" />
            </g>
        </g>
    );
}

/** The water, sand, light and the base life (filter, bubble stone, plants); drawn behind the items. */
export function TankBack({ clip }: { clip: string }) {
    const { x0, x1, bottom } = GLASS;
    const w = x1 - x0;
    return (
        <g className="aq-tank-back">
            <defs>
                <linearGradient id={`${clip}-water`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" className="aq-water-0" /><stop offset="1" className="aq-water-1" />
                </linearGradient>
                <clipPath id={`${clip}-water-clip`}><rect x={x0} y={WATER_TOP} width={w} height={bottom - WATER_TOP} /></clipPath>
                <clipPath id={`${clip}-tank-clip`}><rect x={x0} y={GLASS.top} width={w} height={bottom - GLASS.top} /></clipPath>
            </defs>
            <rect className="aq-air" x={x0} y={GLASS.top} width={w} height={WATER_TOP - GLASS.top} />
            <rect x={x0} y={WATER_TOP} width={w} height={bottom - WATER_TOP} fill={`url(#${clip}-water)`} />
            <g clipPath={`url(#${clip}-water-clip)`}>
                {/* Light rays from the lamp, swaying slowly. */}
                <g className="aq-rays">
                    {[[120, 18, 0], [168, 26, 1], [214, 16, 2], [252, 12, 3]].map(([x, wd, i]) => (
                        <path key={i} className="aq-ray" style={st({ '--i': i })} d={`M${x - wd / 2} ${WATER_TOP} L${x + wd / 2} ${WATER_TOP} L${x + wd * 1.4 - 20} ${bottom} L${x - wd - 20} ${bottom} Z`} />
                    ))}
                </g>
                {/* Caustics: two nets of light drifting against each other. */}
                {[0, 1].map(k => (
                    <g key={k} className={`aq-caustic is-${k}`}>
                        {Array.from({ length: 22 }, (_, i) => {
                            const cx = x0 - 30 + ((i * 37 + k * 19) % (w + 60));
                            const cy = WATER_TOP + 8 + ((i * 23 + k * 11) % (bottom - WATER_TOP - 10));
                            return <path key={i} className="aq-caustic-line" d={`M${cx - 9} ${cy} q4 -5 9 -1 q5 4 9 -2 M${cx - 4} ${cy + 6} q3 3 8 0`} />;
                        })}
                    </g>
                ))}
                <rect className="aq-depth" x={x0} y={SAND_Y - 30} width={w} height={bottom - SAND_Y + 30} />
            </g>
            <g clipPath={`url(#${clip}-tank-clip)`}>
                {/* The filter box on the back left, its outflow churning the surface. */}
                <g className="aq-filter">
                    <rect className="aq-filter-box" x={x0 + 4} y={GLASS.top - 12} width="22" height="42" rx="3" />
                    <path className="aq-filter-slot" d={`M${x0 + 9} ${GLASS.top + 14} L${x0 + 21} ${GLASS.top + 14} M${x0 + 9} ${GLASS.top + 19} L${x0 + 21} ${GLASS.top + 19}`} />
                    <path className="aq-outflow" d={`M${x0 + 26} ${GLASS.top + 4} q8 0 10 ${WATER_TOP - GLASS.top - 2}`} />
                    <g className="aq-churn">
                        <circle cx={x0 + 36} cy={WATER_TOP + 3} r="2.4" /><circle cx={x0 + 41} cy={WATER_TOP + 5} r="1.6" /><circle cx={x0 + 32} cy={WATER_TOP + 6} r="1.4" />
                    </g>
                </g>
                {/* The air line down to a bubble stone, a steady column to the surface. */}
                <path className="aq-airline" d={`M${x0 + 12} ${GLASS.top - 8} C${x0 + 8} ${GLASS.top + 30} ${x0 + 34} ${SAND_Y - 30} ${x0 + 40} ${SAND_Y - 2}`} />
                <ellipse className="aq-stone-air" cx={x0 + 42} cy={SAND_Y} rx="5" ry="2.4" />
                <Bubbles x={x0 + 42} y={SAND_Y - 4} n={9} cls="aq-column" rise={SAND_Y - WATER_TOP - 8} />
                {/* The base plants: grass in both back corners. */}
                <g transform={`translate(${x0 + 12} ${SAND_Y + 4})`}><GrassTuft n={5} h={48} /></g>
                <g transform={`translate(${x1 - 10} ${SAND_Y + 4})`}><GrassTuft n={6} h={60} /></g>
                <path className="aq-sand" d={`M${x0} ${SAND_Y + 2} Q${x0 + 40} ${SAND_Y - 6} ${x0 + 90} ${SAND_Y} T${x0 + 180} ${SAND_Y - 2} T${x1} ${SAND_Y - 4} L${x1} ${bottom} L${x0} ${bottom} Z`} />
                <g className="aq-pebbles">
                    {[[64, 208, 0], [96, 210, 1], [150, 207, 2], [182, 211, 3], [224, 208, 1], [262, 210, 0], [118, 212, 2], [204, 213, 0]].map(([x, y, c], i) => (
                        <ellipse key={i} className={`aq-pebble is-${c}`} cx={x} cy={y} rx={3 + (i % 3)} ry={2 + (i % 2)} />
                    ))}
                </g>
            </g>
        </g>
    );
}

function GrassTuft({ n, h }: { n: number; h: number }) {
    return (
        <g className="aq-plant aq-grass">
            {Array.from({ length: n }, (_, i) => {
                const x = (i - (n - 1) / 2) * 3.4;
                const top = -h * (0.6 + ((i * 37) % 10) / 25);
                const lean = (i - (n - 1) / 2) * 3;
                return <Leaf key={i} i={i} cls={i % 2 ? 'is-dark' : ''} d={`M${x - 1.6} 0 Q${x + lean * 0.5 - 2} ${top / 2} ${x + lean} ${top} Q${x + lean * 0.5 + 2} ${top / 2} ${x + 1.6} 0 Z`} />;
            })}
        </g>
    );
}

/** The front: the bush the fish hide behind, the glass shine, the frame and the rim. */
export function TankFront({ clip }: { clip: string }) {
    const { x0, x1, top, bottom } = GLASS;
    const w = x1 - x0;
    return (
        <g className="aq-tank-front">
            <g clipPath={`url(#${clip}-tank-clip)`}>
                <path className="aq-surface" d={`M${x0 - 40} ${WATER_TOP} ${Array.from({ length: 16 }, () => `q5 -2.4 10 0 q5 2.4 10 0`).join(' ')}`} />
                <path className="aq-surface is-back" d={`M${x0 - 40} ${WATER_TOP + 1.5} ${Array.from({ length: 16 }, () => `q6 -1.6 12 0 q6 1.6 12 0`).join(' ')}`} />
                <path className="aq-glass-shine" d={`M${x0 + 18} ${top + 6} L${x0 + 40} ${top + 6} L${x0 + 6} ${bottom - 6} L${x0 + 4} ${bottom - 30} Z M${x0 + 48} ${top + 6} L${x0 + 54} ${top + 6} L${x0 + 22} ${bottom - 6} L${x0 + 16} ${bottom - 6} Z`} />
            </g>
            <rect className="aq-glass-edge" x={x0 - 4} y={top} width={w + 8} height={bottom - top} rx="2" />
            <rect className="aq-rim" x={x0 - 5} y={top - 3} width={w + 10} height="5" rx="2" />
            <rect className="aq-base" x={x0 - 6} y={bottom - 2} width={w + 12} height={CABINET_Y - bottom + 2} rx="2" />
        </g>
    );
}

/** The base front bush (a hiding place from the start). */
export function FrontBush() {
    return (
        <g className="aq-plant aq-front-bush">
            {[-30, -14, 0, 14, 30].map((a, i) => (
                <g key={i} transform={`rotate(${a})`}>
                    <Leaf i={i} cls={i % 2 ? 'is-dark' : ''} d={`M0 0 C-5 -6 -5 -16 0 -${20 - Math.abs(a) / 5} C5 -16 5 -6 0 0 Z`} />
                </g>
            ))}
        </g>
    );
}

// ── The cat ───────────────────────────────────────────────────────────────
// A grey tabby with white socks, sitting on the cabinet to the right of the tank, facing left (local origin: its seat).

export type CatAct = 'idle' | 'reach' | 'startle' | 'catch';

/** The sitting cat; its pupils and head are moved by the scene's loop (refs), its acts by CSS (aquarium.css). */
export function CatArt({ act, fish, pupils, head }: { act: CatAct; fish: ItemKind | null; pupils: (el: SVGGElement | null) => void; head: (el: SVGGElement | null) => void }) {
    return (
        <g className="aq-cat-body">
            <g className="aq-cat-tail-wrap">
                <path className="aq-cat-tail-line" d="M14 -4 C28 -2 26 12 25 26 C24 36 27 44 32 46" />
                <path className="aq-cat-tail" d="M14 -4 C28 -2 26 12 25 26 C24 36 27 44 32 46" />
                <path className="aq-cat-tail-tip" d="M25.4 30 C24.6 36 27 44 32 46" />
            </g>
            <path className="aq-cat-white is-far" d="M-15 -20 L-16 -1 L-9 -1 L-8 -18 Z" />
            <path className="aq-cat-fur" d="M-20 0 C-23 -16 -21 -32 -13 -44 C-5 -50 8 -40 14 -26 C20 -14 20 -4 16 0 Z" />
            <ellipse className="aq-cat-fur" cx="6" cy="-10" rx="12" ry="10" />
            <path className="aq-cat-stripe" d="M-2 -40 Q2 -36 1 -31 M5 -33 Q9 -30 8 -25 M10 -22 Q14 -20 14 -15" />
            <path className="aq-cat-white" d="M-20 -2 C-21 -14 -19 -28 -13 -38 C-9 -30 -9 -14 -11 -2 Z" />
            <ellipse className="aq-cat-white" cx="10" cy="-1" rx="7" ry="2.6" />
            {act !== 'reach' && act !== 'catch' && (
                <g className="aq-cat-leg">
                    <path className="aq-cat-white" d="M-19 -24 C-19 -14 -20 -6 -20 0 L-11.5 0 C-11.5 -6 -11 -14 -10 -22 Z" />
                    <path className="aq-cat-toes" d="M-17 -2.6 L-17 0 M-14.4 -2.6 L-14.4 0" />
                </g>
            )}
            {(act === 'reach' || act === 'catch') && (
                <g className="aq-cat-arm">
                    <path className="aq-cat-arm-line" d="M-12 -30 C-12 -70 -22 -100 -43 -84" />
                    <path className="aq-cat-arm-fur" d="M-12 -30 C-12 -70 -22 -100 -43 -84" />
                    <circle className="aq-cat-white aq-cat-paw" cx="-43" cy="-84" r="4.6" />
                    <path className="aq-cat-toes" d="M-46 -81 L-45 -79 M-43 -80 L-43 -78 M-40 -81 L-41 -79" />
                    {act === 'catch' && fish && <g className="aq-cat-paw-fish" transform="translate(-44 -77) rotate(80) scale(1.1)"><SwimmerArt kind={fish} /></g>}
                </g>
            )}
            <g ref={head} className="aq-cat-head-wrap">
                <g className="aq-cat-head">
                    <path className="aq-cat-ear is-back" d="M-12 -71 L-4 -84 L-1 -63 Z" />
                    <path className="aq-cat-ear" d="M-31 -64 L-28 -84 L-16 -71 Z" />
                    <path className="aq-cat-ear-in" d="M-28.6 -67 L-27 -79 L-20 -71 Z" />
                    <ellipse className="aq-cat-fur" cx="-17" cy="-59" rx="17" ry="14.5" />
                    <path className="aq-cat-stripe" d="M-20 -73 L-19 -67 M-14 -73 L-14.6 -67 M-8 -71 L-9.6 -66" />
                    <ellipse className="aq-cat-white" cx="-25" cy="-51" rx="8" ry="5.4" />
                    <g className="aq-cat-eyes">
                        <ellipse className="aq-cat-eye" cx="-27" cy="-61" rx="3.6" ry="4.2" />
                        <ellipse className="aq-cat-eye" cx="-15" cy="-61.6" rx="3.8" ry="4.4" />
                        <g ref={pupils}>
                            <ellipse className="aq-cat-pupil" cx="-27" cy="-61" rx="1.5" ry="3.1" />
                            <ellipse className="aq-cat-pupil" cx="-15" cy="-61.6" rx="1.6" ry="3.2" />
                            <circle className="aq-cat-glint" cx="-26" cy="-62.8" r="0.8" /><circle className="aq-cat-glint" cx="-14" cy="-63.4" r="0.8" />
                        </g>
                        <path className="aq-cat-lid" d="M-31 -63 Q-27 -66 -23 -63 M-19 -63.6 Q-15 -66.6 -11 -63.6" />
                    </g>
                    <path className="aq-cat-nose" d="M-31 -55.4 L-27.6 -55.4 L-29.3 -53.2 Z" />
                    <path className="aq-cat-mouth" d="M-29.3 -53.2 Q-29.6 -50.4 -27 -50.6 M-29.3 -53.2 Q-31 -50.6 -33 -51.6" />
                    <path className="aq-cat-tongue" d="M-30.6 -50.8 Q-31.4 -47.4 -28.6 -48.2 Q-28 -49.4 -28.4 -50.6 Z" />
                    <path className="aq-whisker is-cat" d="M-26 -52 L-42 -55 M-26 -51 L-42 -50 M-24 -50 L-38 -46" />
                    {act === 'catch' && fish && <g className="aq-cat-mouth-fish" transform="translate(-34 -48) rotate(-12) scale(1)"><SwimmerArt kind={fish} /></g>}
                </g>
            </g>
        </g>
    );
}

/** The cat that gave up: asleep in a loaf on the cabinet, tail round its paws (the end screen). */
export function NappingCat() {
    return (
        <g className="aq-cat-nap">
            <path className="aq-cat-tail-line" d="M22 -4 C30 2 20 8 -8 6" />
            <path className="aq-cat-tail" d="M22 -4 C30 2 20 8 -8 6" />
            <g className="aq-nap-breathe">
                <path className="aq-cat-fur" d="M-20 0 C-22 -14 -8 -22 6 -22 C20 -22 26 -12 24 0 Z" />
                <path className="aq-cat-stripe" d="M2 -21 Q4 -16 2 -12 M10 -20 Q12 -15 10 -11 M17 -17 Q19 -12 17 -8" />
            </g>
            <ellipse className="aq-cat-white" cx="-14" cy="-1" rx="7" ry="2.6" />
            <ellipse className="aq-cat-white" cx="-4" cy="-0.6" rx="6" ry="2.4" />
            <g className="aq-nap-head">
                <path className="aq-cat-ear is-back" d="M-14 -20 L-8 -33 L-3 -18 Z" />
                <path className="aq-cat-ear" d="M-32 -15 L-30 -32 L-19 -21 Z" />
                <path className="aq-cat-ear-in" d="M-29.6 -18 L-28.6 -28 L-22 -21 Z" />
                <ellipse className="aq-cat-fur" cx="-20" cy="-11" rx="15" ry="12" />
                <ellipse className="aq-cat-white" cx="-27" cy="-5" rx="7" ry="4.6" />
                <path className="aq-cat-lid is-shut" d="M-31 -12 Q-28 -9.6 -25 -12 M-20 -12.6 Q-17 -10.2 -14 -12.6" />
                <path className="aq-cat-nose" d="M-32 -8 L-29 -8 L-30.5 -6.2 Z" />
                <path className="aq-cat-mouth" d="M-30.5 -6.2 Q-30.4 -4 -28 -4.4" />
            </g>
            <path className="aq-zz" d="M-36 -40 L-29 -40 L-36 -34 L-29 -34 M-46 -52 L-41 -52 L-46 -48 L-41 -48" />
        </g>
    );
}
