import type { CSSProperties } from 'react';
import { FIRE, type Decor, type Pet } from './fire';
import { BLOCK, GRIP, GROUND, LADDER_BASE, NOZZLE_LEN, PIVOT, STREET, WIN_H, WIN_W, winBox } from './geometry';

// Brandweer's drawings: flat fills under the --spel-ink outline (brandweer.css colours them). Everything is in the
// stage's units (geometry.ts); each piece draws round its own anchor so the component only places it.

const v = (vars: Record<string, string | number>) => vars as CSSProperties;

// A stroked limb or tail with the ink outline under its colour.
function Limb({ d, className }: { d: string; className: string }) {
    return <g className={className}><path className="bw-limb-ink" d={d} /><path className="bw-limb" d={d} /></g>;
}

// ── The street and the neighbours ───────────────────────────────────────────
// Row houses left and right of the block, drawn past the stage's edges for wide screens.
const HOUSES = [
    { x: -760, w: 230, h: 250, roof: 'gable' }, { x: -520, w: 200, h: 320, roof: 'flat' }, { x: -310, w: 250, h: 230, roof: 'gable' },
    { x: -50, w: 260, h: 300, roof: 'flat' }, { x: 1320, w: 240, h: 260, roof: 'gable' }, { x: 1600, w: 220, h: 330, roof: 'flat' },
    { x: 1830, w: 250, h: 240, roof: 'gable' }, { x: 2090, w: 230, h: 300, roof: 'flat' },
] as const;

export function Backdrop() {
    return (
        <g className="bw-backdrop">
            {HOUSES.map((h, i) => {
                const top = GROUND - h.h;
                return (
                    <g key={i} className={`bw-house is-${i % 3}`}>
                        {h.roof === 'gable'
                            ? <path className="bw-house-roof" d={`M${h.x - 10} ${top} L${h.x + h.w / 2} ${top - 70} L${h.x + h.w + 10} ${top} Z`} />
                            : <rect className="bw-house-roof" x={h.x - 6} y={top - 14} width={h.w + 12} height="18" rx="4" />}
                        <rect className="bw-house-wall" x={h.x} y={top} width={h.w} height={h.h} />
                        {[0, 1].map(r => [0, 1].map(c => (
                            <rect key={`${r}-${c}`} className="bw-house-win" x={h.x + 30 + c * (h.w - 110)} y={top + 34 + r * 96} width="50" height="58" rx="4" />
                        )))}
                    </g>
                );
            })}
            {/* A tree behind the residents, and a street lamp by the block. */}
            <g className="bw-tree" transform="translate(1418 880)">
                <rect className="bw-trunk" x="-12" y="-120" width="24" height="120" rx="8" />
                <g className="bw-crown">
                    <circle cx="-48" cy="-150" r="52" /><circle cx="40" cy="-160" r="58" /><circle cx="-4" cy="-210" r="60" />
                </g>
            </g>
            <g className="bw-lamp" transform="translate(1316 905)">
                <rect className="bw-lamp-post" x="-5" y="-250" width="10" height="250" rx="4" />
                <path className="bw-lamp-post" d="M0 -246 Q0 -270 -30 -270 L-40 -270" />
                <path className="bw-lamp-head" d="M-58 -272 L-22 -272 L-30 -258 L-50 -258 Z" />
            </g>
            {/* The lawn on the right, the sidewalk, the street with its kerb and dashes. */}
            <rect className="bw-lawn" x={BLOCK.x + BLOCK.w - 10} y={GROUND - 6} width="2400" height={STREET - GROUND + 12} />
            <rect className="bw-walk" x="-2400" y={GROUND} width={BLOCK.x + BLOCK.w + 2410} height={STREET - GROUND} />
            <rect className="bw-street" x="-2400" y={STREET} width="6400" height="400" />
            <path className="bw-kerb" d={`M-2400 ${STREET} H4000`} />
            {Array.from({ length: 24 }, (_, i) => <rect key={i} className="bw-dash" x={-2340 + i * 280} y="975" width="120" height="9" rx="4" />)}
        </g>
    );
}

// ── The apartment block ─────────────────────────────────────────────────────
export function BlockArt({ look }: { look: number }) {
    const { x, y, w, h } = BLOCK;
    return (
        <g className={`bw-block is-look-${look % 4}`}>
            {/* The roof: a water tank, an antenna and a pigeon that bobs on the parapet. */}
            <g className="bw-tank" transform={`translate(${x + w - 160} ${y - 20})`}>
                <path className="bw-metal" d="M10 0 L16 -60 M60 0 L54 -60" />
                <rect className="bw-tank-body" x="0" y="-120" width="70" height="64" rx="10" />
                <path className="bw-tank-lid" d="M-4 -118 Q35 -150 74 -118 Z" />
            </g>
            <path className="bw-metal" d={`M${x + 130} ${y - 20} V${y - 110} M${x + 110} ${y - 90} H${x + 150} M${x + 116} ${y - 70} H${x + 144}`} />
            <g transform={`translate(${x + 330} ${y - 22})`}><g className="bw-pigeon"><PigeonArt /></g></g>
            <rect className="bw-wall" x={x} y={y} width={w} height={h} />
            {/* Bricks: a few marks, not a full pattern. */}
            {[[0.08, 0.06], [0.52, 0.04], [0.86, 0.3], [0.3, 0.29], [0.66, 0.55], [0.06, 0.53], [0.4, 0.79], [0.9, 0.78]].map(([bx, by], i) => (
                <path key={i} className="bw-brick" d={`M${x + bx * w} ${y + by * h + 12} h34 M${x + bx * w + 16} ${y + by * h + 24} h34`} />
            ))}
            <rect className="bw-parapet" x={x - 14} y={y - 24} width={w + 28} height="30" rx="6" />
            {[1, 2].map(r => <rect key={r} className="bw-ledge" x={x - 6} y={y + 40 + r * 185 - 26} width={w + 12} height="12" rx="4" />)}
            {/* The ground floor: a door under an awning, two small windows, bushes. */}
            <rect className="bw-ground" x={x} y={GROUND - 128} width={w} height="128" />
            <path className="bw-ledge" d={`M${x - 6} ${GROUND - 132} h${w + 12}`} />
            {[640, 1080].map(wx => (
                <g key={wx}>
                    <rect className="bw-low-win" x={wx} y={GROUND - 108} width="140" height="58" rx="5" />
                    <path className="bw-glint" d={`M${wx + 18} ${GROUND - 98} l26 0 M${wx + 18} ${GROUND - 88} l14 0`} />
                </g>
            ))}
            <rect className="bw-door" x="885" y={GROUND - 104} width="90" height="104" rx="6" />
            <rect className="bw-door-glass" x="902" y={GROUND - 92} width="56" height="36" rx="4" />
            <circle className="bw-knob" cx="962" cy={GROUND - 48} r="5" />
            <path className="bw-awning" d={`M870 ${GROUND - 126} H990 L1000 ${GROUND - 100} H860 Z`} />
            <path className="bw-awning-stripe" d={`M900 ${GROUND - 126} L894 ${GROUND - 100} M930 ${GROUND - 126} L930 ${GROUND - 100} M960 ${GROUND - 126} L966 ${GROUND - 100}`} />
            {[600, 1222].map(bx => (
                <g key={bx} className="bw-bush"><circle cx={bx + 14} cy={GROUND - 22} r="26" /><circle cx={bx + 46} cy={GROUND - 30} r="32" /><circle cx={bx + 76} cy={GROUND - 20} r="24" /></g>
            ))}
        </g>
    );
}

function PigeonArt() {
    return (
        <g className="bw-bird">
            <ellipse className="bw-bird-body" cx="0" cy="-14" rx="18" ry="13" />
            <circle className="bw-bird-body" cx="14" cy="-28" r="9" />
            <path className="bw-beak" d="M22 -29 l8 2 l-8 3 Z" />
            <circle className="bw-ink" cx="16" cy="-30" r="1.8" />
            <path className="bw-bird-wing" d="M-12 -18 Q2 -8 10 -16" />
            <path className="bw-legs" d="M-4 -2 v4 M4 -2 v4" />
        </g>
    );
}

// ── A window ────────────────────────────────────────────────────────────────
export type WinState = 'fire' | 'out' | 'pet' | Decor;

/** One window in its own box (0 0 WIN_W WIN_H): frame, glass, and what is inside. */
export function WindowArt({ i, state, pet, burnt, glow }: { i: number; state: WinState; pet?: Pet; burnt: boolean; glow: boolean }) {
    const { x, y } = winBox(i);
    const fire = state === 'fire';
    const glass = fire ? 'is-fire' : state === 'out' ? 'is-out' : state === 'lamp' ? 'is-lamp' : glow ? 'is-glow' : '';
    return (
        <g className={`bw-win is-${state}`} transform={`translate(${x} ${y})`}>
            {burnt && <path className="bw-soot" d={`M18 6 Q34 -34 62 -22 Q92 -52 122 -24 Q150 -40 172 6 Z`} />}
            <rect className="bw-frame" x="0" y="0" width={WIN_W} height={WIN_H} rx="8" />
            <rect className={`bw-glass ${glass}`} x="12" y="12" width={WIN_W - 24} height={WIN_H - 24} rx="4" />
            {state === 'lamp' && (
                <g className="bw-lampin">
                    <path className="bw-cord" d="M95 12 V40" />
                    <path className="bw-shade" d="M74 64 L82 40 H108 L116 64 Z" />
                    <path className="bw-beam" d="M78 66 L50 126 H140 L112 66 Z" />
                </g>
            )}
            {state === 'curtain' && (
                <g className="bw-curtains">
                    <path className="bw-drape" d="M12 12 H70 Q60 70 36 138 H12 Z" />
                    <path className="bw-drape" d="M178 12 H120 Q130 70 154 138 H178 Z" />
                    <path className="bw-tie" d="M22 84 Q40 80 52 86 M168 84 Q150 80 138 86" />
                </g>
            )}
            {state === 'plant' && (
                <g className="bw-plant" transform="translate(132 138)">
                    <g className="bw-leaves">
                        <path d="M0 -36 Q-34 -54 -32 -86 Q-6 -70 0 -36 Z" /><path d="M0 -36 Q30 -60 24 -96 Q2 -72 0 -36 Z" /><path d="M0 -36 Q-4 -80 6 -108 Q14 -76 0 -36 Z" />
                    </g>
                    <path className="bw-pot" d="M-22 -38 H22 L16 0 H-16 Z" />
                </g>
            )}
            {state === 'pet' && pet && <g transform="translate(95 138)"><PetArt pet={pet} pose="wait" /></g>}
            {!fire && state !== 'curtain' && <path className="bw-reflect" d="M30 30 L62 30 L36 74 Z" />}
            {state === 'out' && (
                <g className="bw-drips">
                    {[40, 95, 150].map((dx, k) => <path key={k} className="bw-drip" style={v({ '--k': k })} d={`M${dx} ${WIN_H + 4} q-5 9 0 12 q5 -3 0 -12 Z`} />)}
                </g>
            )}
            {!fire && <rect className="bw-mullion" x={WIN_W / 2 - 4} y="12" width="8" height={WIN_H - 24} />}
            <rect className="bw-sill" x="-10" y={WIN_H - 6} width={WIN_W + 20} height="14" rx="5" />
        </g>
    );
}

// Three flame layers that flicker at their own pace; the outer one is the widest with the most tongues.
const FLAME_OUT = 'M-84 0 C-96 -38 -70 -58 -66 -92 C-52 -70 -42 -78 -34 -128 C-18 -96 -6 -104 4 -168 C18 -120 30 -116 40 -142 C48 -104 60 -96 70 -112 C76 -74 96 -42 84 0 Z';
const FLAME_MID = 'M-60 0 C-70 -30 -50 -50 -44 -78 C-34 -60 -24 -70 -16 -104 C-4 -78 8 -82 16 -124 C26 -88 40 -80 48 -92 C54 -60 70 -32 60 0 Z';
const FLAME_IN = 'M-34 0 C-42 -22 -28 -36 -22 -54 C-14 -40 -6 -48 2 -78 C10 -52 20 -46 26 -56 C30 -34 42 -18 34 0 Z';

/** The flames of a burning window, from its sill up (the window's own box); scale grows with the fire level. clockMs = its
 *  window clock: the flames grow over it and start again when the fire jumps (CSS, paused outside play). */
export function Flames({ i, scale, flare, clockMs }: { i: number; scale: number; flare: boolean; clockMs?: number }) {
    const { x, y } = winBox(i);
    return (
        <g transform={`translate(${x + WIN_W / 2} ${y + WIN_H - 8})`}>
            <g className={`bw-flames${flare ? ' is-flare' : ''}`} style={v({ '--bw-flame': scale, '--k': i })}>
                <g className={clockMs ? 'bw-grow bw-clocked' : undefined} style={clockMs ? v({ '--bw-clock': `${clockMs}ms` }) : undefined}>
                    <path className="bw-flame is-out" d={FLAME_OUT} />
                    <path className="bw-flame is-mid" d={FLAME_MID} />
                    <path className="bw-flame is-in" d={FLAME_IN} />
                </g>
            </g>
        </g>
    );
}

/** A burning window's clock: the frame glows hotter and a ring in its corner fills as the fire gets ready to jump. */
export function WindowClock({ i, clockMs }: { i: number; clockMs: number }) {
    const { x, y } = winBox(i);
    return (
        <g className="bw-wclock" transform={`translate(${x} ${y})`} style={v({ '--bw-clock': `${clockMs}ms` })}>
            <rect className="bw-frame-glow bw-clocked" x="-6" y="-6" width={WIN_W + 12} height={WIN_H + 12} rx="12" />
            <g transform={`translate(${WIN_W - 8} 8) scale(1.3)`}>
                <circle className="bw-ring-back" r="21" />
                <circle className="bw-ring bw-clocked" r="14" pathLength={100} transform="rotate(-90)" />
                <path className="bw-ring-flame" d="M0 9 C-7 7 -7 -1 -3 -4 C-3 0 0 1 1 -2 C1 -6 3 -8 4 -10 C8 -5 9 1 6 5 C5 8 3 9 0 9 Z" />
            </g>
        </g>
    );
}

/** A fireball leaping from one window to the next (stage units; CSS flies it once). */
export function Fireball({ from, to }: { from: { x: number; y: number }; to: { x: number; y: number } }) {
    return (
        <g className="bw-leap" style={v({ '--fx': `${from.x}px`, '--fy': `${from.y}px`, '--tx': `${to.x}px`, '--ty': `${to.y}px` })}>
            <g className="bw-leap-spin">
                <path className="bw-flame is-out" d="M0 26 C-24 22 -26 -2 -12 -14 C-10 -4 -4 -2 -2 -10 C-2 -22 6 -30 10 -36 C22 -20 28 0 20 14 C14 24 8 26 0 26 Z" />
                <path className="bw-flame is-in" d="M0 18 C-12 16 -12 4 -4 -2 C-2 4 2 2 4 -4 C10 2 12 10 8 14 C6 17 3 18 0 18 Z" />
            </g>
        </g>
    );
}

// One smoke puff: a small cartoon cloud round 0 0.
const PUFF = 'M-24 10 C-36 10 -36 -8 -22 -8 C-22 -24 -2 -28 4 -14 C10 -26 30 -22 26 -6 C40 -4 38 12 24 12 Z';

/** Smoke puffing up from a point and drifting right with the wind; dark = thicker, greyer smoke, steam = white wisps. */
export function Smoke({ x, y, n, size = 1, rise = 200, dark = false, steam = false }: { x: number; y: number; n: number; size?: number; rise?: number; dark?: boolean; steam?: boolean }) {
    return (
        <g className={`bw-smoke${dark ? ' is-dark' : ''}${steam ? ' is-steam' : ''}`} transform={`translate(${x} ${y}) scale(${size})`}>
            {Array.from({ length: n }, (_, k) => (
                <path key={k} className="bw-puff" d={PUFF} style={v({ '--k': k, '--n': n, '--s': 0.75 + (k % 3) * 0.2, '--rise': `${-rise}px`, '--drift': `${24 + ((k * 37) % 50)}px`, '--x0': `${((k * 23) % 30) - 15}px` })} />
            ))}
        </g>
    );
}

/** Sparks rising from a point. */
export function Sparks({ x, y, n }: { x: number; y: number; n: number }) {
    return (
        <g className="bw-sparks" transform={`translate(${x} ${y})`}>
            {Array.from({ length: n }, (_, k) => (
                <circle key={k} className="bw-spark" cx={((k * 41) % 120) - 60} cy="0" r={3 + (k % 2) * 2} style={v({ '--k': k, '--drift': `${((k * 29) % 80) - 40}px` })} />
            ))}
        </g>
    );
}

// ── The ladder truck ────────────────────────────────────────────────────────
const WHEELS = [120, 300, 470];

// ── The heat meter (owner 2026-11-18: the coming collapse must read at a glance) ─────────────────────────────────
// A big street thermometer on a post left of the truck: the red climbs with the fire level, the striped top zone is
// where the block can come down (a little house with a crack at the very top). SYNC: fire.ts DANGER.
const METER = { x: 100, top: 196, bottom: 560, board: [40, 100, 120, 552] as const } as const;

export function HeatMeter({ share, zoneFrom, safe }: { share: number; zoneFrom: number; safe: boolean }) {
    const { x, top, bottom } = METER;
    const [bx, by, bw, bh] = METER.board;
    const span = bottom - top;
    const zoneY = bottom - span * (zoneFrom / FIRE.max);
    return (
        <g className={`bw-meter${safe ? ' is-safe' : ''}`}>
            <rect className="bw-meter-post" x={x - 9} y={by + bh - 10} width="18" height={GROUND - by - bh + 14} rx="4" />
            <rect className="bw-meter-board" x={bx} y={by} width={bw} height={bh} rx="26" />
            <rect className="bw-meter-alarm" x={bx} y={by} width={bw} height={bh} rx="26" />
            <rect className="bw-meter-tube" x={x - 20} y={top - 14} width="40" height={span + 40} rx="20" />
            {/* The danger zone: hazard stripes inside the tube's top part (Makkelijk: never reached, so it stays plain). */}
            {!safe && (
                <g className="bw-meter-zone">
                    <clipPath id="bw-meter-zone-clip"><rect x={x - 16} y={top - 10} width="32" height={zoneY - top + 10} rx="16" /></clipPath>
                    <g clipPath="url(#bw-meter-zone-clip)">
                        <rect className="bw-meter-zone-bg" x={x - 16} y={top - 10} width="32" height={zoneY - top + 10} />
                        {Array.from({ length: 8 }, (_, k) => <path key={k} className="bw-meter-stripe" d={`M${x - 30} ${top - 10 + k * 22 + 30} L${x + 30} ${top - 10 + k * 22 - 10}`} />)}
                    </g>
                </g>
            )}
            {/* The red: a column whose height follows --bw-meter (0–1), with a wobbly top that bubbles. */}
            <g className="bw-meter-fill" style={v({ '--bw-meter': share })}>
                <rect className="bw-meter-red" x={x - 11} y={top} width="22" height={span + 10} rx="11" />
            </g>
            <circle className="bw-meter-bulb" cx={x} cy={bottom + 34} r="32" />
            <circle className="bw-meter-bulb-glint" cx={x - 10} cy={bottom + 24} r="7" />
            <path className="bw-meter-flame" d={`M${x} ${bottom + 54} c-14 0 -18 -14 -10 -24 c0 8 6 9 7 4 c0 -8 4 -12 5 -18 c8 8 12 18 10 26 c-2 8 -6 12 -12 12 Z`} />
            {/* Ten ticks, the danger mark longer. */}
            {Array.from({ length: FIRE.max + 1 }, (_, k) => {
                const ty = bottom - span * (k / FIRE.max);
                return <path key={k} className={`bw-meter-tick${k === zoneFrom && !safe ? ' is-mark' : ''}`} d={`M${x + 22} ${ty} h${k % 5 === 0 || (k === zoneFrom && !safe) ? 16 : 9}`} />;
            })}
            {/* The little house at the top: what falls when the red gets there. */}
            <g className="bw-meter-house" transform={`translate(${x} ${top - 46}) scale(1.45)`}>
                <g className="bw-meter-house-sway">
                    <path className="bw-meter-house-body" d="M-22 14 V-6 L0 -24 L22 -6 V14 Z" />
                    <rect className="bw-meter-house-win" x="-14" y="-4" width="10" height="9" rx="1.5" />
                    <rect className="bw-meter-house-win" x="4" y="-4" width="10" height="9" rx="1.5" />
                    {!safe && <path className="bw-meter-house-crack" d="M-2 -20 L3 -12 L-3 -5 L4 4 L0 13" />}
                </g>
            </g>
        </g>
    );
}

/** The truck's heat gauge: a flame and ten segments filling green, yellow, orange, red. */
export function HeatGauge({ level, x = 60, y = 828 }: { level: number; x?: number; y?: number }) {
    return (
        <g className="bw-gauge" transform={`translate(${x} ${y})`}>
            <rect className="bw-gauge-panel" x="0" y="0" width="330" height="64" rx="14" />
            <path className="bw-gauge-flame" d="M22 52 C6 46 8 28 18 20 C18 30 24 32 26 26 C26 18 32 12 34 6 C42 16 48 28 44 40 C42 48 34 54 22 52 Z" />
            {Array.from({ length: FIRE.max }, (_, k) => {
                const zone = k < 3 ? 'is-green' : k < 6 ? 'is-yellow' : k < 8 ? 'is-orange' : 'is-red';
                return <rect key={k} className={`bw-seg ${zone}${k < level ? ' is-on' : ''}`} x={60 + k * 26.5} y="14" width="22" height="36" rx="6" style={v({ '--k': k })} />;
            })}
        </g>
    );
}

export function TruckArt({ level }: { level: number }) {
    return (
        <g className="bw-truck">
            <rect className="bw-chassis" x="40" y="900" width="500" height="34" rx="10" />
            <rect className="bw-body" x="40" y="812" width="372" height="104" rx="14" />
            <path className="bw-band" d="M48 902 H404" />
            {/* The cab: a window with the driver, the light bar on top. */}
            <path className="bw-cab" d="M404 916 V800 Q404 784 420 784 H492 Q510 784 520 800 L544 852 V916 Z" />
            <path className="bw-cab-glass" d="M424 798 H490 Q500 798 506 808 L526 850 H424 Z" />
            <g transform="translate(466 850)"><g className="bw-driver"><circle className="bw-skin" cx="0" cy="-22" r="15" /><path className="bw-helmet" d="M-17 -26 Q0 -52 17 -26 Z M-21 -26 H21" /><circle className="bw-ink" cx="5" cy="-22" r="2" /><path className="bw-mouth" d="M2 -14 Q8 -11 12 -15" /></g></g>
            <path className="bw-door-line" d="M424 862 V912 M470 878 h18" />
            <rect className="bw-bumper" x="536" y="888" width="16" height="38" rx="5" />
            <circle className="bw-headlight" cx="540" cy="872" r="8" />
            <rect className="bw-lightbar" x="428" y="772" width="84" height="14" rx="6" />
            <g className="bw-beacon is-a"><circle className="bw-halo" cx="446" cy="770" r="30" /><path className="bw-dome" d="M434 774 Q434 756 446 756 Q458 756 458 774 Z" /></g>
            <g className="bw-beacon is-b"><circle className="bw-halo" cx="494" cy="770" r="30" /><path className="bw-dome" d="M482 774 Q482 756 494 756 Q506 756 506 774 Z" /></g>
            {/* The hose reel at the back. */}
            <circle className="bw-reel" cx="70" cy="852" r="26" />
            <circle className="bw-reel-hub" cx="70" cy="852" r="9" />
            <HeatGauge level={level} x={104} y={826} />
            {WHEELS.map(wx => (
                <g key={wx} className="bw-wheel" transform={`translate(${wx} 940)`}>
                    <circle className="bw-tyre" r="36" /><circle className="bw-hub" r="15" />
                </g>
            ))}
            {/* The turntable the ladder turns on. */}
            <rect className="bw-turntable" x={PIVOT.x - 50} y={PIVOT.y - 6} width="100" height="26" rx="8" />
            <circle className="bw-pivot" cx={PIVOT.x} cy={PIVOT.y} r="16" />
        </g>
    );
}

/** The ladder in its own frame (pivot at 0 0, along +x): rails and rungs over a length. */
function LadderSection({ len, half, fly = false }: { len: number; half: number; fly?: boolean }) {
    return (
        <g className={`bw-section${fly ? ' is-fly' : ''}`}>
            <rect className="bw-rail" x="0" y={-half - 4} width={len} height="8" rx="4" />
            <rect className="bw-rail" x="0" y={half - 4} width={len} height="8" rx="4" />
            {Array.from({ length: Math.floor(len / 26) }, (_, k) => <path key={k} className="bw-rung" d={`M${14 + k * 26} ${-half} V${half}`} />)}
        </g>
    );
}

export type CrewPose = 'aim' | 'cheer' | 'shrug' | 'oops';

/** The ladder raised to `angle` (degrees, negative = up), its fly section out by `ext`, the basket at its tip kept level. */
export function LadderArt({ angle, ext, nozzle, pose }: { angle: number; ext: number; nozzle: number; pose: CrewPose }) {
    return (
        <g transform={`translate(${PIVOT.x} ${PIVOT.y})`}>
            <g className="bw-ladder" style={{ transform: `rotate(${angle}deg)` }}>
                <g className="bw-fly" style={{ transform: `translateX(${ext}px)` }}>
                    <LadderSection len={LADDER_BASE} half={13} fly />
                    <g transform={`translate(${LADDER_BASE} 0)`}>
                        <g className="bw-level" style={{ transform: `rotate(${-angle}deg)` }}>
                            <Basket nozzle={nozzle} pose={pose} />
                        </g>
                    </g>
                </g>
                <LadderSection len={LADDER_BASE} half={18} />
            </g>
        </g>
    );
}

function Basket({ nozzle, pose }: { nozzle: number; pose: CrewPose }) {
    return (
        <g className={`bw-basket is-${pose}`}>
            {/* The firefighter behind the railing, holding the nozzle. */}
            <g className="bw-crew-up">
                <rect className="bw-coat" x="-22" y="-52" width="40" height="44" rx="12" />
                <path className="bw-stripe" d="M-20 -30 H16" />
                <circle className="bw-skin" cx="-2" cy="-66" r="15" />
                <path className="bw-helmet" d="M-19 -70 Q-2 -98 15 -70 Z M-23 -70 H19" />
                <circle className="bw-ink" cx="3" cy="-66" r="2" />
                <path className="bw-mouth" d={pose === 'shrug' || pose === 'oops' ? 'M-2 -57 Q3 -60 8 -57' : 'M-2 -59 Q3 -54 9 -59'} />
                {pose === 'oops' && <path className="bw-brow" d="M-6 -75 l6 -3 M4 -77 l7 2" />}
            </g>
            {pose === 'shrug'
                ? <Limb className="bw-arm" d="M-18 -40 L-36 -54 L-40 -66 M14 -40 L32 -54 L36 -66" />
                : pose === 'cheer'
                    ? <Limb className="bw-arm" d="M-18 -40 L-30 -76 M14 -40 L26 -76" />
                    : (
                        <g transform={`translate(${GRIP.x} ${GRIP.y})`}>
                            <g className="bw-nozzle" style={{ transform: `rotate(${nozzle}deg)` }}>
                                <rect className="bw-nozzle-body" x="-6" y="-7" width={NOZZLE_LEN} height="14" rx="6" />
                                <rect className="bw-nozzle-tip" x={NOZZLE_LEN - 12} y="-9" width="14" height="18" rx="4" />
                            </g>
                            <Limb className="bw-arm" d="M-30 -10 L0 0 M-24 4 L8 2" />
                        </g>
                    )}
            {/* The hose down the ladder. */}
            <path className="bw-hose" d="M-24 -6 Q-60 10 -120 14" />
            <rect className="bw-cage" x="-34" y="-20" width="68" height="34" rx="6" />
            <path className="bw-cage-bars" d="M-34 -4 H34 M-17 -20 V14 M0 -20 V14 M17 -20 V14" />
        </g>
    );
}

// ── People and pets ─────────────────────────────────────────────────────────
export type FighterPose = 'hold' | 'cheer' | 'shrug';

/** A firefighter standing (feet at 0 0), yellow helmet, navy coat with reflective stripes; side -1 = faces left. */
export function FighterArt({ pose, side = 1 }: { pose: FighterPose; side?: 1 | -1 }) {
    const arms = pose === 'cheer' ? 'M-18 -84 L-34 -122 M18 -84 L34 -122'
        : pose === 'shrug' ? 'M-18 -84 L-38 -70 L-44 -90 M18 -84 L38 -70 L44 -90'
        : 'M-16 -82 L10 -60 L34 -58 M16 -82 L30 -66 L40 -62';
    return (
        <g className={`bw-fighter is-${pose}`} transform={side < 0 ? 'scale(-1 1)' : undefined}>
            <rect className="bw-boot" x="-17" y="-14" width="14" height="14" rx="4" />
            <rect className="bw-boot" x="3" y="-14" width="14" height="14" rx="4" />
            <rect className="bw-trousers" x="-15" y="-52" width="30" height="42" rx="7" />
            <path className="bw-stripe" d="M-13 -24 H13" />
            <rect className="bw-coat" x="-21" y="-96" width="42" height="52" rx="13" />
            <path className="bw-stripe" d="M-19 -64 H19 M-19 -78 H19" />
            <Limb className="bw-arm" d={arms} />
            <circle className="bw-skin" cx="0" cy="-112" r="16" />
            <path className="bw-helmet" d="M-18 -116 Q0 -146 18 -116 Z M-23 -116 H23" />
            {pose === 'shrug'
                ? <><path className="bw-brow" d="M-9 -122 l6 -3 M3 -125 l6 3" /><path className="bw-mouth" d="M-5 -102 Q0 -105 5 -102" /></>
                : <path className="bw-mouth" d="M-6 -104 Q0 -98 6 -104" />}
            <circle className="bw-ink" cx="-6" cy="-113" r="2" />
            <circle className="bw-ink" cx="6" cy="-113" r="2" />
            {pose === 'shrug' && <path className="bw-soot-dab" d="M7 -108 q5 -2 8 2 q-3 4 -8 1 Z" />}
        </g>
    );
}

export type CrowdMood = 'watch' | 'cheer' | 'oh' | 'wave';

// Three residents who came out in their night things: a girl in pyjamas with her teddy, a grandma with curlers, a
// man in a bathrobe with his toothbrush still in his hand. Nobody was ever inside a burning window.
export function ResidentArt({ i, mood }: { i: number; mood: CrowdMood }) {
    const tall = i === 0 ? 0.8 : 1;
    const arms = mood === 'cheer' ? 'M-18 -78 L-32 -116 M18 -78 L32 -116'
        : mood === 'oh' ? 'M-18 -78 L-24 -96 L-12 -106 M18 -78 L24 -96 L12 -106'
        : mood === 'wave' ? 'M-18 -78 L-26 -48 M18 -78 L36 -110'
        : 'M-18 -78 L-26 -46 M18 -78 L26 -46';
    return (
        <g className={`bw-resident is-${i} is-${mood}`}>
            <g transform={`scale(${tall})`}>
                <rect className="bw-leg" x="-13" y="-34" width="10" height="34" rx="4" />
                <rect className="bw-leg" x="3" y="-34" width="10" height="34" rx="4" />
                <path className="bw-robe" d="M-20 -88 Q-24 -40 -24 -26 H24 Q24 -40 20 -88 Q0 -98 -20 -88 Z" />
                {i === 0 && <path className="bw-pj-dots" d="M-10 -70 h.1 M8 -58 h.1 M-6 -44 h.1 M10 -38 h.1" />}
                {i === 2 && <path className="bw-belt" d="M-22 -56 Q0 -50 22 -56 M4 -54 l-6 16" />}
                <Limb className="bw-arm-p" d={arms} />
                {i === 2 && mood === 'watch' && <path className="bw-brush" d="M26 -46 l4 -22" />}
                {i === 0 && mood !== 'cheer' && <g transform="translate(-26 -46)"><circle className="bw-teddy" r="10" /><circle className="bw-teddy" cx="-7" cy="-9" r="4" /><circle className="bw-teddy" cx="7" cy="-9" r="4" /></g>}
                <circle className="bw-skin" cx="0" cy="-106" r="17" />
                {i === 0 && <path className="bw-hair" d="M-17 -110 Q-14 -128 0 -126 Q14 -128 17 -110 Q10 -118 0 -116 Q-10 -118 -17 -110 Z M-18 -108 q-8 10 -2 18 M18 -108 q8 10 2 18" />}
                {i === 1 && <g className="bw-curlers">{[-12, 0, 12].map(cx => <circle key={cx} cx={cx} cy="-122" r="6" />)}</g>}
                {i === 1 && <path className="bw-specs" d="M-12 -106 h8 M4 -106 h8 M-4 -106 h8" />}
                {i === 2 && <path className="bw-hair" d="M-16 -112 Q-10 -126 4 -124 Q16 -122 17 -110 Q6 -118 -16 -112 Z" />}
                <circle className="bw-ink" cx="-6" cy="-106" r="2" />
                <circle className="bw-ink" cx="6" cy="-106" r="2" />
                {mood === 'oh'
                    ? <ellipse className="bw-open" cx="0" cy="-96" rx="3.5" ry="4.5" />
                    : mood === 'cheer'
                        ? <path className="bw-open" d="M-7 -98 Q0 -88 7 -98 Z" />
                        : <path className="bw-mouth" d="M-6 -98 Q0 -93 6 -98" />}
            </g>
        </g>
    );
}

export type PetPose = 'wait' | 'jump' | 'sit';

/** A pet sitting (feet at 0 0, about 80 high): a ginger cat, a brown puppy, a grey bunny. */
export function PetArt({ pet, pose }: { pet: Pet; pose: PetPose }) {
    return (
        <g className={`bw-pet is-${pet} is-${pose}`}>
            {pet === 'kat' && (
                <>
                    <Limb className="bw-tail" d="M18 -8 Q48 -12 42 -46 Q40 -58 32 -60" />
                    <ellipse className="bw-fur" cx="0" cy="-22" rx="22" ry="24" />
                    <path className="bw-fur" d="M-20 -54 L-18 -80 L-4 -66 Q0 -68 4 -66 L18 -80 L20 -54 Q22 -36 0 -34 Q-22 -36 -20 -54 Z" />
                    <path className="bw-ink-line" d="M-26 -50 h12 M14 -50 h12 M-26 -45 l12 -2 M14 -47 l12 2" />
                    <ellipse className="bw-ink" cx="-8" cy="-55" rx="2.4" ry="3.4" />
                    <ellipse className="bw-ink" cx="8" cy="-55" rx="2.4" ry="3.4" />
                    <path className="bw-nose" d="M-3 -49 h6 l-3 3 Z" />
                    {pose === 'jump' ? <ellipse className="bw-open" cx="0" cy="-42" rx="3" ry="3.5" /> : <path className="bw-mouth" d="M-5 -44 Q0 -40 5 -44" />}
                    <path className="bw-stripe-pet" d="M-14 -20 h10 M4 -14 h10" />
                </>
            )}
            {pet === 'hond' && (
                <>
                    <Limb className="bw-tail" d="M20 -12 Q40 -22 38 -42" />
                    <ellipse className="bw-fur" cx="0" cy="-22" rx="22" ry="24" />
                    <ellipse className="bw-fur" cx="0" cy="-56" rx="21" ry="19" />
                    <path className="bw-ear" d="M-18 -66 Q-34 -60 -28 -36 Q-18 -44 -14 -58 Z M18 -66 Q34 -60 28 -36 Q18 -44 14 -58 Z" />
                    <ellipse className="bw-muzzle" cx="0" cy="-48" rx="11" ry="8" />
                    <ellipse className="bw-ink" cx="0" cy="-53" rx="4" ry="3" />
                    <circle className="bw-ink" cx="-8" cy="-61" r="2.6" />
                    <circle className="bw-ink" cx="8" cy="-61" r="2.6" />
                    <path className="bw-tongue" d="M-3 -44 Q0 -32 5 -36 Q6 -42 3 -44 Z" />
                </>
            )}
            {pet === 'konijn' && (
                <>
                    <circle className="bw-tailball" cx="20" cy="-10" r="8" />
                    <ellipse className="bw-fur" cx="0" cy="-22" rx="21" ry="23" />
                    <g className="bw-ears">
                        <ellipse className="bw-fur" cx="-8" cy="-86" rx="6" ry="20" transform="rotate(-10 -8 -86)" />
                        <ellipse className="bw-fur" cx="8" cy="-86" rx="6" ry="20" transform="rotate(10 8 -86)" />
                    </g>
                    <circle className="bw-fur" cx="0" cy="-54" r="18" />
                    <circle className="bw-ink" cx="-7" cy="-57" r="2.4" />
                    <circle className="bw-ink" cx="7" cy="-57" r="2.4" />
                    <path className="bw-nose" d="M-3 -50 h6 l-3 3 Z" />
                    <path className="bw-teeth" d="M-3 -46 h6 v5 h-6 Z" />
                </>
            )}
            <ellipse className="bw-paws" cx="-9" cy="-2" rx="8" ry="5" />
            <ellipse className="bw-paws" cx="9" cy="-2" rx="8" ry="5" />
        </g>
    );
}

/** The rescue sheet the two firefighters hold: a red ring round a white middle with a target. */
export function SheetArt({ rx, ry }: { rx: number; ry: number }) {
    return (
        <g className="bw-sheet">
            <ellipse className="bw-sheet-ring" rx={rx} ry={ry} />
            <ellipse className="bw-sheet-mid" rx={rx * 0.66} ry={ry * 0.6} />
            <ellipse className="bw-sheet-dot" rx={rx * 0.22} ry={ry * 0.22} />
        </g>
    );
}

// ── The collapse ────────────────────────────────────────────────────────────
/** The block after it collapsed: a heap of rubble in its footprint (stage units), broken beams, a window frame askew. */
export function RubbleArt({ x = BLOCK.x, w = BLOCK.w }: { x?: number; w?: number }) {
    const top = GROUND - 170;
    return (
        <g className="bw-rubble">
            <path className="bw-heap" d={`M${x - 30} ${GROUND + 4} Q${x + w * 0.12} ${top + 70} ${x + w * 0.3} ${top + 30} Q${x + w * 0.45} ${top - 10} ${x + w * 0.58} ${top + 20} Q${x + w * 0.76} ${top + 40} ${x + w * 0.88} ${top + 90} Q${x + w} ${GROUND - 40} ${x + w + 30} ${GROUND + 4} Z`} />
            {[[0.18, 104, 12], [0.34, 70, -18], [0.5, 40, 8], [0.66, 66, 24], [0.8, 110, -10], [0.27, 120, 30], [0.6, 100, -6], [0.44, 92, 18]].map(([bx, by, r], k) => (
                <rect key={k} className="bw-brick-piece" x={x + bx * w - 22} y={top + by} width="44" height="20" rx="4" transform={`rotate(${r} ${x + bx * w} ${top + by + 10})`} />
            ))}
            <rect className="bw-beam" x={x + w * 0.2} y={top + 46} width="230" height="18" rx="5" transform={`rotate(-14 ${x + w * 0.2} ${top + 46})`} />
            <rect className="bw-beam" x={x + w * 0.5} y={top + 20} width="200" height="18" rx="5" transform={`rotate(18 ${x + w * 0.5} ${top + 20})`} />
            <g transform={`translate(${x + w * 0.66} ${top + 30}) rotate(-22)`}>
                <rect className="bw-frame" x="0" y="0" width="120" height="96" rx="8" />
                <rect className="bw-glass is-out" x="10" y="10" width="100" height="76" rx="4" />
            </g>
            <path className="bw-pipe" d={`M${x + w * 0.4} ${top + 10} q20 -40 60 -44`} />
        </g>
    );
}

/** A firefighter's helmet on its own (it bounces on the rubble), around its brim's middle. */
export function HelmetArt() {
    return (
        <g className="bw-lone-helmet">
            <path className="bw-helmet" d="M-30 0 Q-28 -40 0 -42 Q28 -40 30 0 Z" />
            <path className="bw-helmet" d="M-40 0 H40 Q40 8 30 8 H-30 Q-40 8 -40 0 Z" />
            <path className="bw-helmet-ridge" d="M0 -42 V-2" />
        </g>
    );
}

/** The big dust cloud when the block comes down (stage units, round its foot). */
export function DustArt({ x, y }: { x: number; y: number }) {
    return (
        <g className="bw-dust" transform={`translate(${x} ${y})`}>
            {[[-300, -40, 90], [-160, -90, 120], [0, -120, 140], [170, -90, 120], [310, -40, 95], [-80, -10, 100], [90, -10, 100]].map(([dx, dy, r], k) => (
                <circle key={k} className="bw-dust-puff" cx={dx} cy={dy} r={r} style={v({ '--k': k })} />
            ))}
        </g>
    );
}
