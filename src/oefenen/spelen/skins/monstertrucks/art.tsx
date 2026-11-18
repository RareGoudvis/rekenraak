import type { CSSProperties } from 'react';
import type { Side } from '../../duel/types';
import { CAR, FINISH_X, LANE, RAMP, START_X, TRUCK_LEN, VIEW } from './geometry';

// Monstertrucks' pictures (SVG in scene units, geometry.ts): the arena with its crowd and flags, the two lanes, the
// trucks (bumper at x 0, wheels on y 0, facing right), the ramp with its row of junk cars, mud, exhaust, flames,
// the calls and the confetti. Every motion is CSS (monstertrucks.css), keyed so a new moment restarts it.

const v = (o: Record<string, string | number>) => o as CSSProperties;

// A small seeded generator: the crowd and the confetti look the same every render.
function seeded(seed: number) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ── The arena ────────────────────────────────────────────────────────────────

function Sky() {
    return (
        <g>
            <defs>
                <linearGradient id="mtk-sky" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" className="mtk-sky-top" />
                    <stop offset="1" className="mtk-sky-low" />
                </linearGradient>
            </defs>
            <rect x={-600} y={-300} width={VIEW.w + 1200} height={420} fill="url(#mtk-sky)" />
            {/* The stadium lights on their masts, their beams sweeping a little. */}
            {[70, 1130].map((x, i) => (
                <g key={x} transform={`translate(${x} 14)`}>
                    <path className="mtk-beam" style={v({ '--d': `${i * 1.7}s` })} d="M-30 18 L-160 160 L160 160 L30 18 Z" />
                    <rect className="mtk-mast" x={-4} y={10} width={8} height={70} />
                    <rect className="mtk-lamps" x={-32} y={-4} width={64} height={24} rx={5} />
                    {[-20, -7, 7, 20].map(dx => <circle key={dx} className="mtk-lamp" cx={dx} cy={8} r={5} />)}
                </g>
            ))}
        </g>
    );
}

const HEAD_TONES = 5;
const SHIRTS = 6;

/** The grandstand: three tiers of fans that bob and wave flags; on a jump or the finish they jump up (cheer). */
function Crowd({ cheer }: { cheer: number }) {
    const rng = seeded(11);
    const rows = [{ y: 74, n: 34, r: 8 }, { y: 100, n: 32, r: 9 }, { y: 128, n: 30, r: 10 }];
    return (
        <g className={`mtk-crowd${cheer ? ` is-cheer-${cheer % 2}` : ''}`}>
            <rect className="mtk-stand" x={-600} y={58} width={VIEW.w + 1200} height={104} />
            {rows.map((row, ri) => <rect key={ri} className="mtk-tier" x={-600} y={row.y + row.r + 4} width={VIEW.w + 1200} height={6} />)}
            {rows.map((row, ri) => Array.from({ length: row.n }, (_, i) => {
                const x = 120 + (i + (ri % 2 ? 0.5 : 0)) * ((VIEW.w - 240) / row.n) + (rng() - 0.5) * 8;
                const tone = Math.floor(rng() * HEAD_TONES);
                const shirt = Math.floor(rng() * SHIRTS);
                const flag = rng() < 0.16;
                const d = (rng() * 1.4).toFixed(2);
                return (
                    <g key={`${ri}-${i}`} className="mtk-fan" style={v({ '--d': `${d}s` })} transform={`translate(${x.toFixed(1)} ${row.y})`}>
                        <path className={`mtk-shirt is-${shirt}`} d={`M${-row.r} ${row.r + 6} Q${-row.r} ${row.r * 0.4} 0 ${row.r * 0.4} Q${row.r} ${row.r * 0.4} ${row.r} ${row.r + 6} Z`} />
                        <circle className={`mtk-head is-${tone}`} r={row.r * 0.72} cy={-1} />
                        {flag && (
                            <g className="mtk-handflag">
                                <path className="mtk-pole" d={`M${row.r * 0.6} 4 L${row.r * 0.9} -${row.r * 2.6}`} />
                                <path className={`mtk-pennant is-${i % 2 ? 'left' : 'right'}`} d={`M${row.r * 0.9} -${row.r * 2.6} l${row.r * 1.6} ${row.r * 0.5} l-${row.r * 1.5} ${row.r * 0.6} Z`} />
                            </g>
                        )}
                    </g>
                );
            }))}
            {/* Bunting along the stand's front. */}
            <path className="mtk-rope" d={`M-60 62 ${Array.from({ length: 14 }, (_, i) => `Q${-60 + i * 95 + 47} 76 ${-60 + (i + 1) * 95} 62`).join(' ')}`} />
            {Array.from({ length: 28 }, (_, i) => (
                <g key={i} transform={`translate(${-36 + i * 47.5} ${i % 2 ? 69 : 66})`}>
                    <path className={`mtk-bunt is-${i % 4}`} d="M-8 0 L8 0 L0 13 Z" />
                </g>
            ))}
        </g>
    );
}

/** The wall round the arena, the dirt, the lane marks, the tyre stack between the lanes, the start and the finish. */
function Ground() {
    return (
        <g>
            <rect className="mtk-wall" x={-600} y={156} width={VIEW.w + 1200} height={22} />
            {Array.from({ length: 30 }, (_, i) => <rect key={i} className={`mtk-wall-band is-${i % 2}`} x={-600 + i * 80} y={160} width={40} height={14} />)}
            <rect className="mtk-dirt" x={-600} y={178} width={VIEW.w + 1200} height={260} />
            {/* Ruts and clods in the dirt. */}
            {[[260, 200], [520, 214], [840, 198], [1010, 212], [380, 280], [700, 296], [960, 284], [150, 300]].map(([x, y], i) => (
                <ellipse key={i} className="mtk-clod" cx={x} cy={y} rx={18 + (i % 3) * 8} ry={4} />
            ))}
            <path className="mtk-rut" d="M-100 236 L1300 236" />
            <path className="mtk-rut" d="M-100 318 L1300 318" />
            <StartLine />
            <FinishLine />
        </g>
    );
}

function StartLine() {
    return (
        <g>
            <path className="mtk-start" d={`M${START_X + 4} 186 L${START_X - 6} 244`} />
            <path className="mtk-start" d={`M${START_X + 4} 268 L${START_X - 8} 330`} />
        </g>
    );
}

/** The chequered line across both lanes and the big chequered flag on its pole. */
function FinishLine() {
    const x = FINISH_X + 6;
    const cells = (y0: number, y1: number) => {
        const n = 8;
        const h = (y1 - y0) / n;
        return Array.from({ length: n * 2 }, (_, k) => {
            const row = Math.floor(k / 2), col = k % 2;
            const y = y0 + row * h;
            const lean = (y - y0) * -0.18;
            return <rect key={k} className={`mtk-check is-${(row + col) % 2}`} x={x + col * 9 + lean} y={y} width={9} height={h + 0.4} />;
        });
    };
    return (
        <g>
            {cells(184, 244)}
            {cells(266, 334)}
            <g transform={`translate(${x + 30} 160)`}>
                <path className="mtk-flagpole" d="M0 0 L0 -96" />
                <g transform="translate(-60 0)"><g className="mtk-checkflag">
                    {Array.from({ length: 20 }, (_, k) => <rect key={k} className={`mtk-check is-${((k % 5) + Math.floor(k / 5)) % 2}`} x={(k % 5) * 12} y={-96 + Math.floor(k / 5) * 11} width={12} height={11} />)}
                    <rect className="mtk-flag-edge" x={0} y={-96} width={60} height={44} />
                </g></g>
            </g>
        </g>
    );
}

// ── The trucks ───────────────────────────────────────────────────────────────

const WHEELS = [-104, -28] as const;
const WHEEL_R = 27;

function Wheel({ x, spin }: { x: number; spin: number }) {
    return (
        <g transform={`translate(${x} ${-WHEEL_R})`}>
            <g key={spin} className={`mtk-spin${spin ? ' is-rolling' : ''}`}>
                <circle className="mtk-tyre" r={WHEEL_R} />
                {Array.from({ length: 12 }, (_, k) => <rect key={k} className="mtk-tread" transform={`rotate(${k * 30})`} x={-4} y={-WHEEL_R - 1} width={8} height={7} rx={1.5} />)}
                <circle className="mtk-rim" r={12} />
                {[0, 72, 144, 216, 288].map(a => <circle key={a} className="mtk-nut" transform={`rotate(${a}) translate(0 -7)`} r={2} />)}
                <circle className="mtk-hub" r={4} />
            </g>
        </g>
    );
}

function Exhaust({ gas, boost }: { gas: number; boost: number }) {
    return (
        <g transform="translate(-86 -124)">
            {gas > 0 && (
                <g key={`p${gas}`} className="mtk-puffs">
                    {[0, 1, 2].map(k => <circle key={k} className="mtk-puff" style={v({ '--k': k })} cx={k * 4} r={6 + k * 2} />)}
                </g>
            )}
            {boost > 0 && (
                <g key={`f${boost}`} className="mtk-flames">
                    {[0, 10].map(dx => (
                        <g key={dx} transform={`translate(${dx} 0)`}>
                            <path className="mtk-flame is-out" d="M0 2 Q-10 -14 -2 -34 Q2 -22 6 -30 Q12 -12 0 2 Z" />
                            <path className="mtk-flame is-in" d="M0 0 Q-5 -10 -1 -20 Q2 -13 4 -18 Q7 -8 0 0 Z" />
                        </g>
                    ))}
                </g>
            )}
        </g>
    );
}

function Mud({ n }: { n: number }) {
    if (!n) return null;
    const blobs = [[-70, -60, 7], [-90, -34, 5], [-56, -84, 6], [-100, -70, 4], [-40, -50, 5], [-82, -96, 4]] as const;
    return (
        <g key={n} transform={`translate(${WHEELS[0] - 10} -12)`} className="mtk-mud">
            {blobs.map(([dx, dy, r], k) => <circle key={k} className="mtk-mud-blob" style={v({ '--dx': `${dx}px`, '--dy': `${dy}px`, '--k': k })} r={r} />)}
        </g>
    );
}

export interface TruckView {
    side: Side;
    x: number;
    // Counters that restart a moment: gas (a step), jump (the ramp), oops (a wheelie).
    gas: number;
    jump: number;
    oops: number;
    // The round's end: the winner's donut, the loser's sigh.
    won: boolean;
    lost: boolean;
    moveMs: number;
}

/** One truck in its lane: the position glides, the inner groups hop (jump), tip up (wheelie) or spin (donut). */
export function Truck({ t }: { t: TruckView }) {
    const lane = LANE[t.side];
    const pose = t.won ? ' is-donut' : t.lost ? ' is-tired' : '';
    return (
        <g className={`mtk-truck is-${t.side}${pose}`} data-side={t.side} style={v({ transform: `translate(${t.x}px, ${lane.y}px) scale(${lane.scale})`, transitionDuration: `${t.moveMs}ms` })}>
            <ellipse className="mtk-shadow" cx={-TRUCK_LEN / 2} cy={2} rx={TRUCK_LEN / 2 + 8} ry={7} />
            <g key={`j${t.jump}`} className={t.jump ? 'mtk-hop' : undefined}>
                <g key={`o${t.oops}`} className={t.oops ? 'mtk-wheelie' : undefined}>
                    <g className="mtk-turn">
                        <g className="mtk-idle">
                            <Mud n={t.gas + t.jump * 100} />
                            <TruckBody />
                            <Exhaust gas={t.gas} boost={t.jump} />
                            {WHEELS.map(x => <Wheel key={x} x={x} spin={t.gas + t.jump * 100 + (t.won ? 1000 : 0)} />)}
                        </g>
                    </g>
                </g>
            </g>
            {t.won && <DonutDust />}
        </g>
    );
}

function TruckBody() {
    return (
        <g>
            {/* The stacks behind the cab. */}
            <rect className="mtk-chrome" x={-92} y={-126} width={8} height={44} rx={2} />
            <rect className="mtk-chrome" x={-81} y={-122} width={8} height={40} rx={2} />
            {/* Chassis, springs and the axles under the body. */}
            <rect className="mtk-chassis" x={-124} y={-62} width={116} height={12} rx={4} />
            {WHEELS.map(x => (
                <g key={x}>
                    <path className="mtk-spring" d={`M${x - 8} -60 l16 -4 l-16 -4 l16 -4 l-16 -4`} />
                    <path className="mtk-axle" d={`M${x} -${WHEEL_R} L${x} -54`} />
                </g>
            ))}
            {/* The body: bed, cab and hood in the team's paint, a white stripe and a star. */}
            <path className="mtk-paint" d="M-134 -64 L-134 -88 Q-134 -92 -130 -92 L-86 -92 L-80 -118 Q-79 -122 -75 -122 L-48 -122 Q-44 -122 -42 -118 L-30 -94 L-8 -90 Q-1 -89 -1 -82 L-1 -68 Q-1 -64 -5 -64 Z" />
            <path className="mtk-stripe" d="M-132 -76 L-4 -76 L-4 -70 L-132 -70 Z" />
            <path className="mtk-window" d="M-76 -116 L-50 -116 L-38 -95 L-78 -95 Z" />
            {/* The driver: a helmet with a visor, a big grin. */}
            <g transform="translate(-62 -103)">
                <circle className="mtk-helmet" r={9} />
                <path className="mtk-visor" d="M-1 -4 L8 -4 Q10 2 6 4 L-1 4 Z" />
            </g>
            <path className="mtk-star" transform="translate(-108 -82)" d="M0 -8 L2.4 -2.6 L8 -2.4 L3.6 1.2 L5 7 L0 3.8 L-5 7 L-3.6 1.2 L-8 -2.4 L-2.4 -2.6 Z" />
            <circle className="mtk-headlight" cx={-6} cy={-82} r={4.5} />
            <rect className="mtk-bumper" x={-5} y={-72} width={9} height={10} rx={2} />
            <rect className="mtk-bumper" x={-139} y={-74} width={9} height={10} rx={2} />
            {/* A roll bar of lights on the roof. */}
            <rect className="mtk-rollbar" x={-74} y={-128} width={28} height={5} rx={2} />
            {[-68, -60, -52].map(x => <circle key={x} className="mtk-rooflight" cx={x} cy={-130} r={3} />)}
        </g>
    );
}

/** The winner's truck on the round and match cards. */
export function TruckBodyCard({ side }: { side: Side }) {
    return (
        <svg className={`mtk-card-art`} viewBox="-150 -140 160 146" aria-hidden>
            <g className={`mtk-truck is-${side} is-card`}>
                <TruckBody />
                {WHEELS.map(x => <Wheel key={x} x={x} spin={0} />)}
            </g>
        </svg>
    );
}

function DonutDust() {
    return (
        <g className="mtk-donut-dust" transform={`translate(${-TRUCK_LEN / 2} 0)`}>
            <g className="mtk-donut-ring">
                {Array.from({ length: 8 }, (_, k) => <circle key={k} className="mtk-dust" style={v({ '--k': k, '--a': `${k * 45}deg` })} r={14} />)}
            </g>
        </g>
    );
}

// ── Ramps, junk cars, calls, confetti ───────────────────────────────────────

// waiting = it shows before the jump (2 in a row); leaving = a mistake rolls it away.
export interface RowView { id: string; side: Side; x: number; cars: number[]; flat: boolean; waiting: boolean; leaving: boolean }

/** The ramp and its row of junk cars in front of a truck; flat = the truck has landed on them. */
export function Row({ r }: { r: RowView }) {
    const lane = LANE[r.side];
    return (
        <g className={`mtk-row${r.waiting ? ' is-waiting' : ''}${r.flat ? ' is-flat' : ''}${r.leaving ? ' is-leaving' : ''}`} data-side={r.side} transform={`translate(${r.x} ${lane.y}) scale(${lane.scale} ${lane.scale})`}>
            <g transform="translate(4 0)">
                <g className="mtk-ramp">
                    <path className="mtk-ramp-board" d={`M0 0 L${RAMP.len} ${-RAMP.h} L${RAMP.len + 4} ${-RAMP.h} L${RAMP.len + 4} 0 Z`} />
                    {[0.3, 0.55, 0.8].map(f => <path key={f} className="mtk-ramp-plank" d={`M${RAMP.len * f} ${-RAMP.h * f} L${RAMP.len * f} 0`} />)}
                </g>
            </g>
            {r.cars.map((cx, k) => (
                <g key={k} transform={`translate(${cx} 0)`}>
                    <g className={`mtk-car is-${k % 4}`} style={v({ '--k': k })}>
                        <path className="mtk-car-body" d={`M0 -8 L0 -16 Q0 -19 4 -19 L10 -19 L15 -${CAR.h} L${CAR.len - 13} -${CAR.h} L${CAR.len - 6} -19 L${CAR.len - 2} -19 Q${CAR.len} -19 ${CAR.len} -15 L${CAR.len} -8 Z`} />
                        <path className="mtk-car-glass" d={`M17 -${CAR.h - 2} L${CAR.len - 15} -${CAR.h - 2} L${CAR.len - 9} -21 L13 -21 Z`} />
                        <path className="mtk-car-pillar" d={`M${CAR.len / 2} -${CAR.h - 2} L${CAR.len / 2} -21`} />
                        <circle className="mtk-car-wheel" cx={10} cy={-7} r={7} />
                        <circle className="mtk-car-wheel" cx={CAR.len - 10} cy={-7} r={7} />
                        <path className="mtk-car-crack" d={`M${CAR.len / 2 - 6} -${CAR.h - 2} l5 3 l-4 3 l6 3`} />
                    </g>
                </g>
            ))}
            {r.flat && <Crunch n={r.cars.length} />}
        </g>
    );
}

function Crunch({ n }: { n: number }) {
    const w = n * (CAR.len + CAR.gap);
    return (
        <g className="mtk-crunch" transform={`translate(${RAMP.len + 6 + w / 2} -10)`}>
            {Array.from({ length: 10 }, (_, k) => <path key={k} className={`mtk-bit is-${k % 3}`} style={v({ '--a': `${-160 + k * 16}deg`, '--k': k })} d="M-3 -3 L3 -2 L2 3 L-3 2 Z" />)}
            {[-w / 3, 0, w / 3].map((dx, k) => <circle key={k} className="mtk-dust is-crunch" style={v({ '--k': k })} cx={dx} r={12} />)}
        </g>
    );
}

export interface CallView { id: number; text: string; side: Side; x: number; tone: 'jump' | 'oops' | 'win' }

/** A comic word that pops up over a truck ("Sprong!", "Wheelie!", "Finish!"). */
export function Call({ c }: { c: CallView }) {
    const w = Math.max(100, c.text.length * 16 + 34);
    const y = LANE[c.side].y - (c.side === 'left' ? 150 : 140);
    const x = Math.max(w / 2 + 10, Math.min(VIEW.w - w / 2 - 10, c.x));
    return (
        <g transform={`translate(${x} ${y})`}>
            <g className={`mtk-call is-${c.tone}`}>
                <rect className="mtk-call-bg" x={-w / 2} y={-21} width={w} height={40} rx={20} />
                <text className="mtk-call-text" x={0} y={8} textAnchor="middle">{c.text}</text>
            </g>
        </g>
    );
}

/** Confetti raining over the arena at the finish. */
export function Confetti({ side }: { side: Side }) {
    const rng = seeded(side === 'left' ? 5 : 9);
    return (
        <g className="mtk-confetti">
            {Array.from({ length: 90 }, (_, k) => {
                const x = 40 + rng() * (VIEW.w - 80);
                return (
                    <rect key={k} className={`mtk-confetto is-${k % 5}`} x={x} y={-20} width={9 + rng() * 6} height={5 + rng() * 5}
                        style={v({ '--d': `${(rng() * 1.6).toFixed(2)}s`, '--t': `${(1.8 + rng() * 1.4).toFixed(2)}s`, '--sway': `${Math.round((rng() - 0.5) * 80)}px`, '--r': `${Math.round(rng() * 720 - 360)}deg` })} />
                );
            })}
        </g>
    );
}

export interface SceneProps {
    trucks: Record<Side, TruckView>;
    rows: RowView[];
    calls: CallView[];
    cheer: number;
    winner: Side | null;
}

export function Scene({ trucks, rows, calls, cheer, winner }: SceneProps) {
    const rowsOf = (side: Side) => rows.filter(r => r.side === side).map(r => <Row key={r.id} r={r} />);
    return (
        <svg className="mtk-svg" viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} preserveAspectRatio="xMidYMax meet" aria-hidden>
            <Sky />
            <Crowd cheer={cheer} />
            <Ground />
            {rowsOf('left')}
            <Truck t={trucks.left} />
            {/* The tyre row in front of the back lane, so the back truck drives behind it. */}
            {Array.from({ length: 22 }, (_, i) => (
                <g key={i} transform={`translate(${-20 + i * 60} 262)`}>
                    <ellipse className="mtk-tyre-stack" rx={22} ry={8} />
                    <ellipse className="mtk-tyre-hole" rx={10} ry={3.5} />
                </g>
            ))}
            {rowsOf('right')}
            <Truck t={trucks.right} />
            {winner && <Confetti side={winner} />}
            {calls.map(c => <Call key={c.id} c={c} />)}
        </svg>
    );
}
