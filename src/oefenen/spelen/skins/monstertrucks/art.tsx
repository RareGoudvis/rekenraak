import type { CSSProperties, Ref } from 'react';
import type { Side } from '../../duel/types';
import { TILE, TRUCK_LEN, WHEEL_R, WHEELS } from './geometry';
import type { TruckKind } from './rule';

// Monstertrucks' pictures (SVG in scene units, geometry.ts): the arena (sky, lights, the crowd, the wall), the lanes'
// dirt, the trucks (bumper at x 0, tyres on y 0, facing right), the six obstacles, the finish arch and the confetti.
// Every motion is CSS (monstertrucks.css), keyed so a new moment restarts it; the frame loop (course/useCourse.ts)
// only moves the groups it is handed (the trucks along the lane, the obstacles toward them, the dirt, the wheels).

const v = (o: Record<string, string | number>) => o as CSSProperties;

// A small seeded generator: the crowd and the confetti look the same every render.
function seeded(seed: number) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** How many copies of a tile cover the band and one tile more (the scroll wraps by one tile). */
const tilesFor = (w: number, tile: number) => Math.ceil(w / tile) + 2;

// ── The arena ────────────────────────────────────────────────────────────────

export function Sky({ w }: { w: number }) {
    return (
        <g>
            <defs>
                <linearGradient id="mtk-sky" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" className="mtk-sky-top" />
                    <stop offset="1" className="mtk-sky-low" />
                </linearGradient>
            </defs>
            <rect x={-20} y={-200} width={w + 40} height={320} fill="url(#mtk-sky)" />
            {[0, 1, 2, 3, 4, 5, 6].map(i => <circle key={i} className="mtk-twinkle" style={v({ '--d': `${i * 0.7}s` })} cx={(w * (0.12 + i * 0.13)) % w} cy={10 + (i % 3) * 9} r={1.8} />)}
            {/* The stadium lights on their masts, their beams sweeping. */}
            {[w * 0.06, w * 0.94].map((x, i) => (
                <g key={i} transform={`translate(${x.toFixed(0)} 22)`}>
                    <path className="mtk-beam" style={v({ '--d': `${i * 1.7}s` })} d="M-26 16 L-170 190 L170 190 L26 16 Z" />
                    <rect className="mtk-mast" x={-4} y={8} width={8} height={70} />
                    <rect className="mtk-lamps" x={-30} y={-6} width={60} height={22} rx={5} />
                    {[-18, -6, 6, 18].map(dx => <circle key={dx} className="mtk-lamp" style={v({ '--d': `${(dx + 18) * 0.04}s` })} cx={dx} cy={5} r={4.5} />)}
                </g>
            ))}
        </g>
    );
}

const HEAD_TONES = 5;
const SHIRTS = 6;

/** One tile of the grandstand: three tiers of fans who bob, clap and wave flags and banners. */
function StandTile({ x0 }: { x0: number }) {
    const rng = seeded(11);
    const rows = [{ y: 66, n: 18, r: 7 }, { y: 90, n: 17, r: 8 }, { y: 116, n: 16, r: 9 }];
    return (
        <g transform={`translate(${x0} -18)`}>
            <rect className="mtk-stand" x={0} y={52} width={TILE.stand + 1} height={92} />
            {rows.map((row, ri) => <rect key={ri} className="mtk-tier" x={0} y={row.y + row.r + 4} width={TILE.stand + 1} height={5} />)}
            {rows.map((row, ri) => Array.from({ length: row.n }, (_, i) => {
                const x = (i + (ri % 2 ? 0.5 : 0.2)) * (TILE.stand / row.n) + (rng() - 0.5) * 6;
                const tone = Math.floor(rng() * HEAD_TONES);
                const shirt = Math.floor(rng() * SHIRTS);
                const flag = rng() < 0.18;
                const arms = !flag && rng() < 0.3;
                const d = (rng() * 1.4).toFixed(2);
                return (
                    <g key={`${ri}-${i}`} transform={`translate(${x.toFixed(1)} ${row.y})`}>
                        <g className={`mtk-fan${arms ? ' is-arms' : ''}`} style={v({ '--d': `${d}s` })}>
                            {arms && <path className="mtk-arm" d={`M${-row.r * 0.7} ${row.r * 0.6} L${-row.r * 1.2} ${-row.r * 0.9} M${row.r * 0.7} ${row.r * 0.6} L${row.r * 1.2} ${-row.r * 0.9}`} />}
                            <path className={`mtk-shirt is-${shirt}`} d={`M${-row.r} ${row.r + 6} Q${-row.r} ${row.r * 0.4} 0 ${row.r * 0.4} Q${row.r} ${row.r * 0.4} ${row.r} ${row.r + 6} Z`} />
                            <circle className={`mtk-head is-${tone}`} r={row.r * 0.72} cy={-1} />
                            {flag && (
                                <g className="mtk-handflag">
                                    <path className="mtk-pole" d={`M${row.r * 0.6} 4 L${row.r * 0.9} -${row.r * 2.6}`} />
                                    <path className={`mtk-pennant is-${i % 2 ? 'left' : 'right'}`} d={`M${row.r * 0.9} -${row.r * 2.6} l${row.r * 1.6} ${row.r * 0.5} l-${row.r * 1.5} ${row.r * 0.6} Z`} />
                                </g>
                            )}
                        </g>
                    </g>
                );
            }))}
            {/* A big banner held up by two fans in the middle tier, and the bunting along the stand's front. */}
            <g transform={`translate(${TILE.stand * 0.62} 80)`}>
                <g className="mtk-banner">
                    <rect className="mtk-banner-cloth" x={-34} y={-12} width={68} height={22} rx={3} />
                    <path className="mtk-banner-star" d="M-18 -1 l3 -6 l3 6 l-6 -3.6 h6 Z M12 -1 l3 -6 l3 6 l-6 -3.6 h6 Z" />
                    <path className="mtk-banner-zig" d="M-8 -4 l4 6 l4 -6 l4 6" />
                </g>
            </g>
            <path className="mtk-rope" d={`M0 56 ${Array.from({ length: 8 }, (_, i) => `Q${i * 80 + 40} 68 ${(i + 1) * 80} 56`).join(' ')}`} />
            {Array.from({ length: 16 }, (_, i) => (
                <g key={i} transform={`translate(${20 + i * 40} ${i % 2 ? 62 : 60})`}>
                    <path className={`mtk-bunt is-${i % 4}`} d="M-7 0 L7 0 L0 12 Z" />
                </g>
            ))}
        </g>
    );
}

export function Stand({ w, layerRef, cheer }: { w: number; layerRef: Ref<SVGGElement>; cheer: number }) {
    return (
        // A small grandstand along the top: the lanes below get the band's height.
        <g className={`mtk-crowd${cheer ? ` is-cheer-${cheer % 2}` : ''}`} transform={`scale(${STAND_SCALE})`}>
            <g ref={layerRef}>{Array.from({ length: tilesFor(w / STAND_SCALE, TILE.stand) }, (_, i) => <StandTile key={i} x0={i * TILE.stand} />)}</g>
        </g>
    );
}

const STAND_SCALE = 0.5;

/** The arena wall: boards in the team colours with stars and stripes; it scrolls faster than the crowd. */
export function Wall({ w, layerRef }: { w: number; layerRef: Ref<SVGGElement> }) {
    return (
        <g>
            <g ref={layerRef}>
                {Array.from({ length: tilesFor(w, TILE.wall) }, (_, i) => (
                    <g key={i} transform={`translate(${i * TILE.wall} 58)`}>
                        <rect className={`mtk-board is-${i % 3}`} x={0} y={0} width={TILE.wall} height={26} />
                        <path className="mtk-board-mark" d={i % 3 === 0 ? 'M70 13 l6 -8 l6 8 l-6 8 Z M100 13 l6 -8 l6 8 l-6 8 Z M130 13 l6 -8 l6 8 l-6 8 Z' : i % 3 === 1 ? 'M40 7 h120 M40 19 h120' : 'M100 4 l3 6 l7 1 l-5 5 l1 7 l-6 -3 l-6 3 l1 -7 l-5 -5 l7 -1 Z'} />
                        <rect className="mtk-board-post" x={-3} y={-2} width={6} height={30} rx={2} />
                    </g>
                ))}
            </g>
            <rect className="mtk-wall-cap" x={-20} y={54} width={w + 40} height={6} rx={3} />
        </g>
    );
}

/** One lane's dirt (a strip of tiles that scrolls with that lane): ruts, clods, stones and tyre tracks. */
export function Dirt({ w, y, h, groundRef, seed }: { w: number; y: number; h: number; groundRef: Ref<SVGGElement>; seed: number }) {
    const rng = seeded(seed);
    const bits = Array.from({ length: 9 }, () => ({ x: rng() * TILE.dirt, y: rng() * (h - 12) + 6, r: 3 + rng() * 9, stone: rng() < 0.35 }));
    return (
        <g ref={groundRef}>
            {Array.from({ length: tilesFor(w, TILE.dirt) }, (_, i) => (
                <g key={i} transform={`translate(${i * TILE.dirt} ${y})`}>
                    {bits.map((b, k) => b.stone
                        ? <ellipse key={k} className="mtk-stone" cx={b.x} cy={b.y} rx={b.r * 0.5} ry={b.r * 0.32} />
                        : <ellipse key={k} className="mtk-clod" cx={b.x} cy={b.y} rx={b.r * 2} ry={b.r * 0.35} />)}
                    <path className="mtk-track" d={`M0 ${h * 0.55} h${TILE.dirt * 0.4} m${TILE.dirt * 0.12} 0 h${TILE.dirt * 0.48}`} />
                </g>
            ))}
        </g>
    );
}

/** The crash barrier between the lanes (concrete blocks with the team colours): each truck keeps to its own lane. */
export function Barrier({ w, y, layerRef }: { w: number; y: number; layerRef: Ref<SVGGElement> }) {
    return (
        <g ref={layerRef}>
            {Array.from({ length: tilesFor(w, TILE.tyres) }, (_, i) => (
                <g key={i} transform={`translate(${i * TILE.tyres} ${y})`}>
                    <path className="mtk-barrier" d={`M1 22 L6 4 Q8 0 12 0 L${TILE.tyres - 12} 0 Q${TILE.tyres - 8} 0 ${TILE.tyres - 6} 4 L${TILE.tyres - 1} 22 Z`} />
                    <path className={`mtk-barrier-stripe is-${i % 2}`} d={`M8 6 L${TILE.tyres - 8} 6 L${TILE.tyres - 7} 11 L7 11 Z`} />
                    {i % 4 === 1 && <g className="mtk-cone" transform="translate(32 -1)"><path d="M-6 2 L0 -16 L6 2 Z" /><path className="mtk-cone-band" d="M-3.5 -6 h7" /></g>}
                </g>
            ))}
        </g>
    );
}

// ── The truck ────────────────────────────────────────────────────────────────

function Wheel({ x, spinRef }: { x: number; spinRef: Ref<SVGGElement> }) {
    return (
        <g transform={`translate(${x} ${-WHEEL_R})`}>
            <g className="mtk-wheel-bounce">
                <g ref={spinRef}>
                    <circle className="mtk-tyre" r={WHEEL_R} />
                    {Array.from({ length: 14 }, (_, k) => <rect key={k} className="mtk-lug" transform={`rotate(${k * (360 / 14)})`} x={-4.5} y={-WHEEL_R - 3} width={9} height={9} rx={2} />)}
                    <circle className="mtk-tyre-wall" r={WHEEL_R - 8} />
                    <circle className="mtk-rim" r={14} />
                    {[0, 60, 120, 180, 240, 300].map(a => <circle key={a} className="mtk-nut" transform={`rotate(${a}) translate(0 -9)`} r={2.2} />)}
                    <circle className="mtk-hub" r={5} />
                </g>
            </g>
        </g>
    );
}

export interface TruckView {
    side: Side;
    // The move now playing (`clear-jump`, `crash-flip`, …) and the counter that restarts it.
    move: string | null;
    n: number;
    // Turbo flames (a counter), standing still (Makkelijk's wait), back on the way after a crash (a counter).
    turbo: number;
    waiting: boolean;
    go: number;
    won: boolean;
    lost: boolean;
    call: { text: string; n: number; tone: 'clear' | 'crash' | 'turbo' | 'win' } | null;
}

export interface TruckRefs {
    wheel(id: string, r: number): Ref<SVGGElement>;
    motion(id: string, full?: number): Ref<SVGGElement>;
}

/** The body, cab and driver in the team's paint (without the wheels). */
export function TruckBody({ mood = 'idle' }: { mood?: 'idle' | 'oops' | 'happy' }) {
    return (
        <g>
            {/* Fender arches over the wheels and the body: bed, cab and hood; a white stripe and the number badge. */}
            <path className="mtk-paint" d="M-160 -70 L-160 -100 Q-160 -104 -156 -104 L-94 -104 L-86 -134 Q-84 -140 -78 -140 L-50 -140 Q-45 -140 -42 -135 L-30 -108 L-8 -103 Q1 -101 1 -92 L1 -76 Q1 -70 -5 -70 Z" />
            <path className="mtk-paint-shade" d="M-158 -76 L-2 -76 L-2 -72 Q-2 -71 -5 -71 L-158 -71 Z" />
            <path className="mtk-fender" d={WHEELS.map(x => `M${x - 38} -70 A38 34 0 0 1 ${x + 38} -70`).join(' ')} />
            <path className="mtk-stripe" d="M-158 -90 L-34 -90 L-26 -96 L-2 -96 L-2 -90 L-26 -90 L-34 -84 L-158 -84 Z" />
            <path className="mtk-window" d="M-80 -133 L-52 -133 L-40 -109 L-84 -109 Z" />
            <path className="mtk-glare" d="M-74 -129 L-66 -129 L-74 -113" />
            {/* The driver: a helmet with a visor, a big grin (an "o" after a crash, a cheer when winning). */}
            <g transform="translate(-64 -117)">
                <circle className="mtk-helmet" r={10} />
                <path className="mtk-visor" d="M0 -5 L9 -5 Q11 1 7 4 L0 4 Z" />
                {mood === 'oops' ? <circle className="mtk-mouth-o" cx={7} cy={8} r={2.6} /> : <path className="mtk-grin" d={mood === 'happy' ? 'M2 6 Q7 12 11 5 Z' : 'M3 7 Q7 10 10 6'} />}
                <path className="mtk-helmet-stripe" d="M-8 -6 Q-2 -11 5 -9" />
            </g>
            <g transform="translate(-126 -94)">
                <circle className="mtk-badge" r={10} />
                <path className="mtk-star" d="M0 -6.5 L1.9 -2.1 L6.4 -2 L2.9 1 L4 5.6 L0 3 L-4 5.6 L-2.9 1 L-6.4 -2 L-1.9 -2.1 Z" />
            </g>
            <circle className="mtk-headlight" cx={-5} cy={-95} r={5} />
            <path className="mtk-grille" d="M-1 -88 v10 M-4 -88 v10" />
            <rect className="mtk-bumper" x={-6} y={-82} width={11} height={13} rx={3} />
            <rect className="mtk-bumper" x={-166} y={-84} width={11} height={13} rx={3} />
            {/* A roll bar of lights on the roof. */}
            <rect className="mtk-rollbar" x={-80} y={-146} width={32} height={6} rx={2} />
            {[-73, -64, -55].map(x => <circle key={x} className="mtk-rooflight" style={v({ '--d': `${(x + 73) * 0.03}s` })} cx={x} cy={-148} r={3.4} />)}
        </g>
    );
}

/** The suspension: springs and shocks from the chassis down to the hubs (behind the tyres). */
function Suspension() {
    return (
        <g>
            <rect className="mtk-chassis" x={-150} y={-74} width={142} height={11} rx={4} />
            {WHEELS.map(x => (
                <g key={x}>
                    <path className="mtk-shock" d={`M${x - 12} -66 L${x - 4} -${WHEEL_R}`} />
                    <path className="mtk-spring" d={`M${x + 4} -68 l14 -2 l-14 7 l14 -2 l-14 7 l14 -2 l-14 7 l14 -2 l-14 7`} />
                </g>
            ))}
        </g>
    );
}

/** One truck: the moves play on the inner groups, the frame loop moves the whole group along its lane. */
export function Truck({ t, refs }: { t: TruckView; refs: TruckRefs }) {
    const pose = t.won ? ' is-donut' : t.lost ? ' is-tired' : '';
    const crash = t.move?.startsWith('crash');
    return (
        <g className={`mtk-truck is-${t.side}${pose}${t.waiting && !t.won && !t.lost ? ' is-waiting' : ''}`} data-side={t.side} data-move={t.move ?? ''}>
            <ellipse key={`s${t.n}`} className={`mtk-shadow${t.move ? ` is-${t.move}` : ''}`} cx={-TRUCK_LEN / 2} cy={2} rx={TRUCK_LEN / 2 + 10} ry={7} />
            <g key={`m${t.n}`} className={`mtk-move${t.move ? ` is-${t.move}` : ''}`}>
                <g key={`g${t.go}`} className={t.go ? 'mtk-goagain' : undefined}>
                    <g className="mtk-turn">
                        {/* Dirt flung back by the back tyre while it drives (its opacity follows the speed). */}
                        <g ref={refs.motion('spray', 240)} className="mtk-spray" transform={`translate(${WHEELS[0] - 26} -8)`}>
                            {[0, 1, 2, 3, 4, 5].map(k => <circle key={k} className="mtk-clump" style={v({ '--k': k, '--dx': `${-30 - k * 9}px`, '--dy': `${-22 - (k % 3) * 12}px` })} r={3 + (k % 3)} />)}
                            <ellipse className="mtk-dustpuff" cx={-20} cy={-6} rx={22} ry={10} />
                        </g>
                        <g className="mtk-bounce"><g transform="translate(0 -12)">
                            {/* The stacks behind the cab; puffs while driving, flames on a boost. */}
                            <rect className="mtk-chrome" x={-104} y={-158} width={9} height={58} rx={2} />
                            <rect className="mtk-chrome" x={-92} y={-152} width={9} height={52} rx={2} />
                            <g ref={refs.motion('puffs', 160)} transform="translate(-98 -160)">
                                {[0, 1, 2].map(k => <circle key={k} className="mtk-puff" style={v({ '--k': k })} r={5 + k * 1.5} />)}
                            </g>
                            {t.move?.startsWith('clear') && <Flames key={`c${t.n}`} big={false} />}
                            {t.turbo > 0 && <Flames key={`t${t.turbo}`} big />}
                            <Suspension />
                        </g></g>
                        {WHEELS.map((x, i) => <Wheel key={x} x={x} spinRef={refs.wheel(`w${i}`, WHEEL_R * 0.9)} />)}
                        <g className="mtk-bounce"><g transform="translate(0 -12)">
                            {/* Mud flaps behind each wheel, swinging with the ride. */}
                            {WHEELS.map(x => (
                                <g key={x} transform={`translate(${x - 40} -70)`}><path className="mtk-flap" d="M-3 0 L5 0 L5 34 Q1 37 -3 34 Z" /></g>
                            ))}
                            <TruckBody mood={crash ? 'oops' : t.won ? 'happy' : 'idle'} />
                            {crash && <Stars key={`d${t.n}`} />}
                            {t.move === 'crash-stuck' && <path key={`mud${t.n}`} className="mtk-windscreen-mud" d="M-78 -130 q8 -4 14 3 q8 -3 10 6 q6 6 0 12 q-8 6 -16 0 q-10 4 -10 -6 q-6 -8 2 -15 Z" />}
                        </g></g>
                    </g>
                </g>
            </g>
            {t.won && <DonutDust />}
        </g>
    );
}

function Flames({ big }: { big: boolean }) {
    return (
        <g className={`mtk-flames${big ? ' is-big' : ''}`} transform="translate(-98 -160)">
            {[-6, 6].map(dx => (
                <g key={dx} transform={`translate(${dx} 0)`}>
                    <path className="mtk-flame is-out" d="M0 2 Q-10 -14 -2 -34 Q2 -22 6 -30 Q12 -12 0 2 Z" />
                    <path className="mtk-flame is-in" d="M0 0 Q-5 -10 -1 -20 Q2 -13 4 -18 Q7 -8 0 0 Z" />
                </g>
            ))}
        </g>
    );
}

function Stars() {
    return (
        <g transform="translate(-64 -164)">
            <g className="mtk-stars">
                {[0, 120, 240].map(a => <path key={a} className="mtk-star-s" transform={`rotate(${a}) translate(20 0)`} d="M0 -6 L1.6 -1.6 L6 0 L1.6 1.6 L0 6 L-1.6 1.6 L-6 0 L-1.6 -1.6 Z" />)}
            </g>
        </g>
    );
}

/** The winner's truck on the round and match cards. */
export function TruckBodyCard({ side }: { side: Side }) {
    return (
        <svg className="mtk-card-art" viewBox="-180 -184 200 190" aria-hidden>
            <g className={`mtk-truck is-${side} is-card`}>
                <g className="mtk-bounce"><g transform="translate(0 -12)"><Suspension /></g></g>
                {WHEELS.map(x => <Wheel key={x} x={x} spinRef={null} />)}
                <g className="mtk-bounce"><g transform="translate(0 -12)"><TruckBody mood="happy" /></g></g>
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

/** A comic word beside the truck, in its own lane (scene units, the truck's bumper at x 0): "Sprong!", "Vast!". */
export function Call({ text, tone }: { text: string; tone: string }) {
    const w = Math.max(70, text.length * 15 + 26);
    return (
        <g transform={`translate(${16 + w / 2} -58)`}>
            <g className={`mtk-call is-${tone}`}>
                <rect className="mtk-call-bg" x={-w / 2} y={-18} width={w} height={34} rx={17} />
                <text className="mtk-call-text" x={0} y={7} textAnchor="middle">{text}</text>
            </g>
        </g>
    );
}

// ── The obstacles (near edge at x 0, the ground at y 0; gap = where the truck's bumper stops before it) ─────────

type Layer = 'back' | 'front';
export interface ObstacleArt { kind: TruckKind; state: 'ahead' | 'clear' | 'crash'; gap: number; layer: Layer }

/** A flat obstacle lies under the truck at contact: its middle is there (the truck's middle, behind the bumper). */
const under = (gap: number) => -gap - TRUCK_LEN / 2;

function JunkCar({ x, k }: { x: number; k: number }) {
    return (
        <g transform={`translate(${x} 0)`}>
            <g className={`mtk-car is-${k % 4}`} style={v({ '--k': k })}>
                <path className="mtk-car-body" d="M0 -8 L0 -17 Q0 -20 4 -20 L11 -20 L17 -33 L37 -33 L44 -20 L50 -20 Q54 -20 54 -16 L54 -8 Z" />
                <path className="mtk-car-glass" d="M19 -31 L36 -31 L41 -22 L15 -22 Z" />
                <path className="mtk-car-pillar" d="M27 -31 L27 -22" />
                <path className="mtk-car-dent" d="M6 -16 q4 3 8 0 M40 -14 q3 -3 7 0" />
                <circle className="mtk-car-wheel" cx={12} cy={-7} r={7.5} />
                <circle className="mtk-car-wheel" cx={42} cy={-7} r={7.5} />
                <circle className="mtk-car-hub" cx={12} cy={-7} r={2.5} />
                <circle className="mtk-car-hub" cx={42} cy={-7} r={2.5} />
            </g>
        </g>
    );
}

function Cars({ state }: { state: ObstacleArt['state'] }) {
    return (
        <g className={`mtk-ob-cars is-${state}`}>
            <g className="mtk-ramp">
                <path className="mtk-ramp-board" d="M0 0 L44 -36 L50 -36 L50 0 Z" />
                {[0.3, 0.55, 0.8].map(f => <path key={f} className="mtk-ramp-plank" d={`M${44 * f} ${-36 * f} L${44 * f} 0`} />)}
                <path className="mtk-ramp-arrow" d="M34 -14 l-10 -8 l0 5 l-10 0 l0 6 l10 0 l0 5 Z" />
            </g>
            <g transform="scale(1.3)"><JunkCar x={42} k={0} /><JunkCar x={98} k={1} /></g>
            {state !== 'ahead' && (
                <g className="mtk-crunch" transform="translate(130 -22)">
                    {Array.from({ length: 10 }, (_, k) => <path key={k} className={`mtk-bit is-${k % 3}`} style={v({ '--a': `${-170 + k * 17}deg`, '--k': k })} d="M-3 -3 L3 -2 L2 3 L-3 2 Z" />)}
                </g>
            )}
        </g>
    );
}

function Mud({ state, gap }: { state: ObstacleArt['state']; gap: number }) {
    return (
        <g className={`mtk-ob-mud is-${state}`} transform={`translate(${under(gap)} 0)`}>
            <ellipse className="mtk-mud-rim" cx={0} cy={2} rx={112} ry={13} />
            <ellipse className="mtk-mud-pit" cx={0} cy={2} rx={100} ry={9} />
            <path className="mtk-mud-shine" d="M-60 0 q20 -4 40 0 M20 3 q16 -3 30 0" />
            {[-50, 10, 60].map((x, k) => <circle key={x} className="mtk-bubble" style={v({ '--k': k })} cx={x} cy={1} r={4} />)}
            <g className="mtk-mud-sign" transform="translate(126 0)">
                <path className="mtk-post" d="M0 0 V-60" />
                <path className="mtk-sign-board" d="M0 -118 L30 -66 L-30 -66 Z" />
                <path className="mtk-sign-mark" d="M-14 -76 q7 -16 14 -6 q7 -16 14 0" />
            </g>
        </g>
    );
}

function MudSplash({ state, gap }: { state: ObstacleArt['state']; gap: number }) {
    return (
        <g className={`mtk-mud-splash is-${state}`} transform={`translate(${under(gap)} 0)`}>
            {Array.from({ length: 12 }, (_, k) => <circle key={k} className="mtk-mud-blob" style={v({ '--k': k, '--dx': `${(k - 6) * 13}px`, '--dy': `${-40 - (k % 4) * 18}px` })} cx={(k % 2 ? 40 : -40)} cy={-4} r={4 + (k % 3) * 2} />)}
        </g>
    );
}

function Tyres({ state }: { state: ObstacleArt['state'] }) {
    const stack = [[0, 0], [1, 0], [2, 0], [0.5, 1], [1.5, 1], [1, 2]] as const;
    return (
        <g className={`mtk-ob-tyres is-${state}`}>
            {stack.map(([cx, row], k) => (
                <g key={k} transform={`translate(${14 + cx * 30} ${-14 - row * 26})`}>
                    <g className="mtk-wall-tyre" style={v({ '--k': k, '--fx': `${(cx - 1) * 60 + 30}px`, '--fr': `${(k % 2 ? 1 : -1) * 260}deg` })}>
                        <circle className="mtk-tyre" r={15} />
                        <circle className="mtk-tyre-wall" r={7} />
                        <path className="mtk-tyre-tread" d="M-15 0 h4 M11 0 h4 M0 -15 v4 M0 11 v4" />
                    </g>
                </g>
            ))}
            <path className="mtk-tape" d="M0 -40 L94 -40" />
        </g>
    );
}

function Crusher({ state, gap, layer }: { state: ObstacleArt['state']; gap: number; layer: Layer }) {
    const px = under(gap);
    if (layer === 'front') {
        // The press hangs over the lane, in front of a truck under it.
        return (
            <g className={`mtk-ob-crusher is-${state}`}>
                <g transform={`translate(${px} -262)`}>
                    <g className="mtk-press">
                        <rect className="mtk-piston" x={-7} y={-30} width={14} height={72} />
                        <rect className="mtk-press-head" x={-62} y={40} width={124} height={34} rx={5} />
                        <path className="mtk-press-stripes" d="M-56 46 l10 22 M-36 46 l10 22 M-16 46 l10 22 M4 46 l10 22 M24 46 l10 22 M44 46 l10 22" />
                        <path className="mtk-press-teeth" d="M-60 74 l8 8 l8 -8 l8 8 l8 -8 l8 8 l8 -8 l8 8 l8 -8 l8 8 l8 -8 l8 8 l8 -8 l8 8 l8 -8" />
                    </g>
                </g>
                {state !== 'ahead' && <g className="mtk-clang" transform={`translate(${px} ${state === 'clear' ? -6 : -110})`}>{[0, 1, 2, 3, 4].map(k => <path key={k} className="mtk-clang-line" style={v({ '--a': `${-90 + (k - 2) * 34}deg` })} d="M0 -16 L0 -30" />)}</g>}
            </g>
        );
    }
    // A tower on the near side of the track and its arm reaching back over the lane.
    return (
        <g className={`mtk-ob-crusher is-${state}`}>
            <rect className="mtk-tower" x={40} y={-262} width={28} height={262} rx={3} />
            <path className="mtk-lattice" d={Array.from({ length: 8 }, (_, i) => `M40 ${-254 + i * 30} L68 ${-224 + i * 30} M68 ${-254 + i * 30} L40 ${-224 + i * 30}`).join(' ')} />
            <rect className="mtk-arm-beam" x={px - 40} y={-272} width={120 - px} height={14} rx={4} />
            <circle className="mtk-warn" cx={54} cy={-266} r={6} />
        </g>
    );
}

// The loop's radius (to the tyres) and its track's thickness.
const LOOP_R = 92;
const LOOP_T = 14;

function Loop({ state, gap }: { state: ObstacleArt['state']; gap: number }) {
    const cx = under(gap);
    return (
        <g className={`mtk-ob-loop is-${state}`}>
            <g transform={`translate(${cx} ${-LOOP_R})`}>
                <circle className="mtk-loop-back" r={LOOP_R + LOOP_T / 2} />
                <circle className="mtk-loop-track" r={LOOP_R + LOOP_T / 2} />
                <circle className="mtk-loop-dash" r={LOOP_R + LOOP_T / 2} />
                {[-1, 1].map(s => <path key={s} className="mtk-loop-leg" d={`M${s * (LOOP_R + 10)} 0 L${s * (LOOP_R + 30)} ${LOOP_R}`} />)}
                <g transform={`translate(0 ${-LOOP_R - LOOP_T})`}><path className="mtk-loop-flag" d="M0 0 V-22 L16 -16 L0 -10" /></g>
                {state === 'clear' && <g className="mtk-loop-sparks">{[0, 1, 2, 3, 4, 5].map(k => <circle key={k} className="mtk-spark" style={v({ '--k': k })} cx={0} cy={LOOP_R} r={3} />)}</g>}
            </g>
        </g>
    );
}

function Oil({ state, gap }: { state: ObstacleArt['state']; gap: number }) {
    return (
        <g className={`mtk-ob-oil is-${state}`} transform={`translate(${under(gap)} 0)`}>
            <path className="mtk-oil" d="M-96 2 C -90 -8 -50 -10 -30 -6 C -10 -12 30 -12 50 -6 C 80 -8 100 -2 92 4 C 70 10 30 8 0 9 C -40 10 -90 10 -96 2 Z" />
            <path className="mtk-oil-sheen" d="M-60 -1 q18 -4 34 0 M10 -2 q14 -3 26 1" />
            <g className="mtk-mud-sign" transform="translate(150 0)">
                <path className="mtk-post" d="M0 0 V-60" />
                <path className="mtk-sign-board" d="M0 -118 L30 -66 L-30 -66 Z" />
                <path className="mtk-sign-mark" d="M-12 -74 q6 -6 12 0 q6 6 12 0 M-8 -86 q4 -4 8 0 q4 4 8 0" />
            </g>
            <g className="mtk-barrel" transform="translate(112 0)">
                <rect className="mtk-barrel-body" x={-12} y={-34} width={24} height={34} rx={4} />
                <path className="mtk-barrel-ring" d="M-12 -24 h24 M-12 -10 h24" />
                <path className="mtk-oil-drip" d="M-2 -6 q-12 2 -20 8 q6 2 14 -2 Z" />
            </g>
            {state !== 'ahead' && <g className={`mtk-skid is-${state}`}><path d="M-90 4 C -40 -2 -10 10 40 2" /><path d="M-80 9 C -30 3 0 14 50 7" /></g>}
        </g>
    );
}

export function Obstacle({ kind, state, gap, layer }: ObstacleArt) {
    // Most obstacles lie behind the truck; the crusher's press and the mud's splash come over it.
    if (layer === 'front') return kind === 'crusher' ? <Crusher state={state} gap={gap} layer="front" /> : kind === 'mud' && state !== 'ahead' ? <MudSplash state={state} gap={gap} /> : null;
    switch (kind) {
        case 'cars': return <Cars state={state} />;
        case 'mud': return <Mud state={state} gap={gap} />;
        case 'tyres': return <Tyres state={state} />;
        case 'crusher': return <Crusher state={state} gap={gap} layer="back" />;
        case 'loop': return <Loop state={state} gap={gap} />;
        case 'oil': return <Oil state={state} gap={gap} />;
    }
}

/** The finish: a chequered arch over the lane; the winner bursts through its banner (torn). */
export function FinishArch({ torn }: { torn: boolean }) {
    const cells = (x0: number, y0: number, w: number, h: number, n: number, m: number) => Array.from({ length: n * m }, (_, k) => {
        const c = k % n, r = Math.floor(k / n);
        return <rect key={k} className={`mtk-check is-${(r + c) % 2}`} x={x0 + c * (w / n)} y={y0 + r * (h / m)} width={w / n + 0.3} height={h / m + 0.3} />;
    });
    return (
        <g className={`mtk-finish${torn ? ' is-torn' : ''}`}>
            <rect className="mtk-finish-post" x={-8} y={-200} width={16} height={200} rx={4} />
            <rect className="mtk-finish-post" x={150} y={-200} width={16} height={200} rx={4} />
            <g className="mtk-finish-top">{cells(-14, -224, 186, 28, 12, 2)}<rect className="mtk-flag-edge" x={-14} y={-224} width={186} height={28} rx={3} /></g>
            <g className="mtk-finish-tape is-l"><path className="mtk-tape-cloth" d="M8 -70 L79 -66 L79 -56 L8 -60 Z" /></g>
            <g className="mtk-finish-tape is-r"><path className="mtk-tape-cloth" d="M79 -66 L150 -70 L150 -60 L79 -56 Z" /></g>
            {[0, 152].map(x => <g key={x} transform={`translate(${x} -224)`}><path className="mtk-flagpole" d="M0 0 V-24" /><path className={`mtk-pennant is-${x ? 'right' : 'left'}`} d="M0 -24 l22 6 l-22 6 Z" /></g>)}
        </g>
    );
}

/** Confetti raining over the arena at the finish. */
export function Confetti({ w, seed }: { w: number; seed: number }) {
    const rng = seeded(seed);
    return (
        <g className="mtk-confetti">
            {Array.from({ length: 90 }, (_, k) => {
                const x = 20 + rng() * (w - 40);
                return (
                    <rect key={k} className={`mtk-confetto is-${k % 5}`} x={x} y={-20} width={9 + rng() * 6} height={5 + rng() * 5}
                        style={v({ '--d': `${(rng() * 1.6).toFixed(2)}s`, '--t': `${(1.8 + rng() * 1.4).toFixed(2)}s`, '--sway': `${Math.round((rng() - 0.5) * 80)}px`, '--r': `${Math.round(rng() * 720 - 360)}deg` })} />
                );
            })}
        </g>
    );
}

