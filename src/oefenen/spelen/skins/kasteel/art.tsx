import { useState, type CSSProperties } from 'react';
import { BLOCKS, hpTone, isGone, stageOf, type Part, type TowerState } from './castle';
import { PIVOT, RELEASE_DEG, THROW_MS, flightTiming, launchOf, seatOf, stoneR } from './throw';

// The Kasteel scene, shared by 1 and 2 players: two castles on a field, each with a catapult on its wall
// and a life bar above it. Code-drawn SVG, flat fills under a thick outline. Everything moves by CSS
// (a throw: the arm swings, the stone leaves its bucket and flies a true parabola on nested transforms);
// nothing here runs a loop. Stones hit walls: no people, no fire.

export type SideKey = 'left' | 'right';
export type Team = 'blue' | 'orange';

// The scene: 640 × 460, the grass from y 400. Castles are 214 wide; the right one is drawn mirrored.
const VIEW = { w: 640, h: 460, ground: 400 } as const;
const LEFT_X = 12;
const RIGHT_X = 628;
const BAR_Y = 54;
const BAR_W = 180;

/** Castle units → scene units. */
function toScene(side: SideKey, p: { x: number; y: number }) {
    return { x: side === 'left' ? LEFT_X + p.x : RIGHT_X - p.x, y: VIEW.ground + p.y };
}
const castleMid = (side: SideKey) => toScene(side, { x: 107, y: 0 }).x;

export interface CastleView {
    hp: number;
    lives: number;
    team: Team;
    // The name on the life bar ("Jij", "Blauw").
    name: string;
    // Hits taken so far: restarts the shake and the bar's flash.
    hit: number;
    // Stones fired so far: restarts the catapult's swing.
    fired: number;
    // The stone of the latest throw is a big one (it rides the arm big until it leaves).
    big?: boolean;
    // The winner: the flag goes up high and two kids cheer in front.
    won?: boolean;
}

export interface Flight { id: number; from: SideKey; big: boolean; aim: { x: number; y: number }; ms: number }
// Chunks off a wall where a stone hit (castle units of the castle that was hit).
export interface Debris { id: number; side: SideKey; x: number; y: number; chunks: number }

const CHUNK_DIR = [[-34, -1], [-12, 1], [-56, -1], [10, 1]] as const;

function Chunks({ d }: { d: Debris }) {
    return (
        <g className="ks-debris" transform={`translate(${d.x} ${d.y})`}>
            <g className="ks-dust">
                <circle cx="-6" cy="0" r="12" /><circle cx="8" cy="-6" r="10" /><circle cx="2" cy="8" r="9" />
            </g>
            {Array.from({ length: d.chunks }, (_, k) => {
                const [dx, r] = CHUNK_DIR[k % CHUNK_DIR.length];
                return (
                    <g key={k} className="ks-chunk" style={{ '--cx': `${dx - k * 4}px`, '--cy': `${-d.y - 5}px`, '--r': `${r * (200 + k * 70)}deg`, '--k': k } as CSSProperties}>
                        <rect x="-6" y="-5" width={10 + (k % 2) * 4} height="10" rx="2" />
                    </g>
                );
            })}
        </g>
    );
}

// A rubble heap, centred on x 0 at the foot, `w` wide.
function Rubble({ w, className = '' }: { w: number; className?: string }) {
    const n = Math.max(4, Math.round(w / 22));
    return (
        <g className={`ks-rubble ${className}`}>
            <path className="ks-heap" d={`M${-w / 2} 0 Q${-w / 3} ${-w / 5} 0 ${-w / 4.2} Q${w / 3} ${-w / 5} ${w / 2} 0 Z`} />
            {Array.from({ length: n }, (_, i) => {
                const x = -w / 2 + 10 + (i * (w - 20)) / Math.max(1, n - 1);
                const h = (w / 4.2) * (1 - Math.abs(x) / (w / 1.6));
                return <rect key={i} className="ks-stone ks-rock" x={x - 10} y={-h - 4 + (i % 2) * 8} width={18 + (i % 3) * 4} height="13" rx="3" transform={`rotate(${((i * 37) % 30) - 15} ${x} ${-h})`} />;
            })}
        </g>
    );
}

function BlockShape({ i, hp, lives }: { i: number; hp: number; lives: number }) {
    const blk = BLOCKS[i];
    const gone = isGone(i, hp, lives);
    if (blk.kind === 'merlon') return gone ? null : <rect className="ks-stone" x={blk.x} y={blk.y} width={blk.w} height={blk.h + 2} />;
    return <rect className={gone ? 'ks-hole' : 'ks-brick'} x={blk.x} y={blk.y} width={blk.w} height={blk.h} rx="2" />;
}

const blocksOf = (part: Part) => BLOCKS.flatMap((blk, i) => (blk.part === part ? [i] : []));

// A tower that leans and topples about its outer foot (x = pivot), outward.
function Tower({ part, state, pivot, x, w, top, hp, lives, cracked, window: win }: {
    part: Part; state: TowerState; pivot: number; x: number; w: number; top: number; hp: number; lives: number; cracked: boolean; window: { x: number; y: number };
}) {
    return (
        <g transform={`translate(${pivot} 0)`}>
            <g className={`ks-tower is-${state} is-${part}`}>
                <g transform={`translate(${-pivot} 0)`}>
                    {blocksOf(part).filter(i => BLOCKS[i].kind === 'merlon').map(i => <BlockShape key={i} i={i} hp={hp} lives={lives} />)}
                    <rect className="ks-stone" x={x} y={top} width={w} height={-top} />
                    <rect className="ks-slit" x={win.x} y={win.y} width="8" height="20" rx="4" />
                    {cracked && <path className="ks-crack" d={`M${x + w - 10} ${top} l-6 15 l6 9 l-5 14`} />}
                    {/* Bricks after the body, so a knocked-off one shows its hole. */}
                    {blocksOf(part).filter(i => BLOCKS[i].kind === 'brick').map(i => <BlockShape key={`b${i}`} i={i} hp={hp} lives={lives} />)}
                </g>
            </g>
            {state === 'down' && <g transform={`translate(${part === 'outer' ? 18 : -18} 0)`}><Rubble w={64} className="is-tower" /></g>}
        </g>
    );
}

// A stone with its mark, centred on (0, 0): the same in the bucket and in the air.
function Ball({ big }: { big: boolean }) {
    return (
        <>
            <circle className={`ks-stone ks-ball${big ? ' is-big' : ''}`} r={stoneR(big)} />
            <path className="ks-ball-line" d={big ? 'M-8 -4 L4 -9 M-3 6 L9 2' : 'M-5 -2 L4 -5'} />
        </>
    );
}

// A stone in the bucket; `className` times it to the throw (out = leaves at the release, in = the reload).
function Loaded({ big, className }: { big: boolean; className?: string }) {
    const at = seatOf(big);
    return <g transform={`translate(${at.x} ${at.y})`}><g className={className}><Ball big={big} /></g></g>;
}

// At rest the arm lies pulled back, a stone in its bucket. A throw (keyed per stone): a short wind-up,
// the fast swing against the stop bar with a bounce (the stone leaves there), the arm back, a new stone.
function Catapult({ fired, big = false }: { fired: number; big?: boolean }) {
    const style = { '--ks-r': `${RELEASE_DEG}deg`, '--ks-throw': `${THROW_MS}ms` } as CSSProperties;
    return (
        <g className="ks-catapult" transform={`translate(${PIVOT.x} ${PIVOT.y})`}>
            <path className="ks-wood ks-stop" d="M20 38 L10 -22" />
            <path className="ks-wood" d="M-20 38 L0 0 L20 38" />
            <g key={fired} className={`ks-arm${fired ? ' is-fire' : ''}`} style={style}>
                <path className="ks-wood ks-beam" d="M8 -2 L-44 4" />
                {fired > 0 && <Loaded big={big} className="ks-load-out" />}
                <Loaded big={false} className={fired ? 'ks-load-in' : undefined} />
                <path className="ks-cup" d="M-67 -2 Q-66 10 -54 10 Q-42 10 -41 -2 Z" />
            </g>
            <circle className="ks-pad" cx="9.5" cy="-26" r="5" />
            <circle className="ks-axle" cx="0" cy="0" r="5" />
        </g>
    );
}

// The pupil's or a team's castle in castle units (its foot at 0, the other castle to the right).
export function CastleArt({ v }: { v: CastleView }) {
    const st = stageOf(v.hp, v.lives, v.won);
    const { hp, lives } = v;
    return (
        <g className={`ks-castle is-${v.team}${st.fallen ? ' is-fallen' : ''}`}>
            {/* Two names for one shake: a new hit restarts it without remounting the castle (towers, cracks). */}
            <g className={v.hit && !st.fallen ? `ks-shake-${v.hit % 2}` : undefined}>
                <g className="ks-standing">
                    {/* The flag on the wall, behind the battlements. */}
                    <path className="ks-pole" d="M98 -124 L98 -214" />
                    <g transform="translate(98 -194)">
                        <g className={`ks-flag is-${st.flag}`}>
                            <path className="ks-cloth" d="M0 0 q14 -6 28 0 t28 0 v22 q-14 6 -28 0 t-28 0 Z" />
                        </g>
                    </g>
                    <Catapult fired={v.fired} big={v.big} />
                    <rect className="ks-stone" x="50" y="-124" width="126" height="124" />
                    {blocksOf('wall').map(i => <BlockShape key={i} i={i} hp={hp} lives={lives} />)}
                    <path className="ks-gate" d="M94 0 V-34 A18 18 0 0 1 130 -34 V0 Z" />
                    <path className="ks-gate-bars" d="M106 -50 V0 M118 -50 V0 M94 -22 H130" />
                    {st.cracks >= 1 && <path className="ks-crack" d="M62 -124 l7 12 l-5 9 l8 11 l-4 8" />}
                    {st.cracks >= 2 && <path className="ks-crack" d="M158 -124 l-6 14 l7 9 l-5 13 l4 10" />}
                    {st.cracks >= 3 && <path className="ks-crack" d="M88 0 l4 -14 l-6 -10 l5 -12 l-3 -10" />}
                    <Tower part="outer" state={st.outer} pivot={0} x={0} w={56} top={-196} hp={hp} lives={lives} cracked={st.cracks >= 2} window={{ x: 24, y: -182 }} />
                    <Tower part="inner" state={st.inner} pivot={214} x={168} w={46} top={-164} hp={hp} lives={lives} cracked={st.cracks >= 1} window={{ x: 187, y: -118 }} />
                </g>
                {st.fallen && (
                    <>
                        <g transform="translate(107 0)"><Rubble w={230} className="is-heap" /></g>
                        <g className="ks-puff" transform="translate(107 -40)">
                            <circle cx="-50" cy="12" r="28" /><circle cx="0" cy="-10" r="38" /><circle cx="52" cy="10" r="28" /><circle cx="-22" cy="26" r="24" /><circle cx="26" cy="28" r="24" />
                        </g>
                    </>
                )}
            </g>
        </g>
    );
}

function Heart({ x, y, r = 11 }: { x: number; y: number; r?: number }) {
    const s = r / 11;
    return <path className="ks-heart" transform={`translate(${x} ${y}) scale(${s})`} d="M0 9 C-12 0 -11 -9 -5 -9 C-2 -9 0 -6 0 -5 C0 -6 2 -9 5 -9 C11 -9 12 0 0 9 Z" />;
}

// The life bar: "17 / 20" on a bar that goes green → yellow → red, with a shake and a flash per hit.
function LifeBar({ side, v }: { side: SideKey; v: CastleView }) {
    const f = Math.max(0, v.hp) / v.lives;
    return (
        <g transform={`translate(${castleMid(side)} ${BAR_Y})`} className={`ks-bar is-${v.team} is-${hpTone(v.hp, v.lives)}`} data-hp={v.hp}>
            <g className={v.hit ? `ks-bar-hit-${v.hit % 2}` : undefined}>
                <rect className="ks-name" x={-BAR_W / 2 + 26} y="-30" width={Math.max(56, v.name.length * 12 + 24)} height="26" rx="13" />
                <text className="ks-name-text" x={-BAR_W / 2 + 38} y="-11">{v.name}</text>
                <rect className="ks-bar-bg" x={-BAR_W / 2} y="0" width={BAR_W} height="30" rx="15" />
                {f > 0 && <rect className="ks-bar-fill" x={-BAR_W / 2} y="0" width={22 + (BAR_W - 22) * f} height="30" rx="15" />}
                <rect className="ks-bar-line" x={-BAR_W / 2} y="0" width={BAR_W} height="30" rx="15" />
                <text className="ks-bar-text" x="12" y="22" textAnchor="middle">{`${Math.max(0, v.hp)} / ${v.lives}`}</text>
                <circle className="ks-badge" cx={-BAR_W / 2} cy="15" r="19" />
                <Heart x={-BAR_W / 2} y={16} />
            </g>
        </g>
    );
}

// A friendly kid in a helmet, feet at (0, 0); cheer = arms up and jumping.
export function Kid({ team, cheer, flip = false }: { team: Team; cheer: boolean; flip?: boolean }) {
    return (
        <g transform={flip ? 'scale(-1 1)' : undefined}>
            <g className={`ks-kid is-${team}${cheer ? ' is-cheer' : ''}`}>
                <path className="ks-limb" d="M-6 -22 L-8 -2 M6 -22 L8 -2" />
                {cheer ? <path className="ks-limb" d="M-10 -38 L-22 -60 M10 -38 L22 -60" /> : <path className="ks-limb" d="M-10 -38 L-16 -18 M10 -38 L16 -18" />}
                <path className="ks-tunic" d="M-13 -42 Q0 -48 13 -42 L16 -18 Q0 -14 -16 -18 Z" />
                <circle className="ks-face" cx="0" cy="-56" r="12" />
                <path className="ks-helmet" d="M-13 -58 A13 13 0 0 1 13 -58 Z" />
                <path className="ks-plume" d="M0 -70 q4 -12 14 -12 q-4 8 -8 14 Z" />
                <circle className="ks-eye" cx="-4" cy="-54" r="1.8" /><circle className="ks-eye" cx="5" cy="-54" r="1.8" />
                <path className="ks-smile" d="M-4 -49 Q1 -45 6 -49" />
            </g>
        </g>
    );
}

// The foe's clock in 1 player: a ring by its bar that fills up to the next shot (CSS only, paused under help).
export interface Reload { key: number; ms: number; offset: number }
function ReloadRing({ r }: { r: Reload }) {
    // Frozen at mount: a later render must not restart the fill.
    const [style] = useState(() => ({ '--dur': `${r.ms}ms`, animationDelay: `${-Math.max(0, r.offset)}ms` }) as CSSProperties);
    // Under the computer's bar, at its right end.
    return (
        <g className="ks-reload" transform={`translate(${castleMid('right') + BAR_W / 2 - 16} ${BAR_Y + 52})`}>
            <circle className="ks-reload-bg" r="13" />
            <circle className="ks-reload-fill" r="13" pathLength="100" style={style} transform="rotate(-90)" />
            <circle className="ks-stone ks-ball" r="5" />
        </g>
    );
}

// A stone from the arm tip at the release to its aim on the other castle (scene units, so every screen
// size and the duel's viewBox agree): x and y run linearly, a third transform adds the arc 4h·t(1−t).
function Stone({ f }: { f: Flight }) {
    const from = toScene(f.from, launchOf(f.big));
    const to = toScene(f.from === 'left' ? 'right' : 'left', f.aim);
    const dx = to.x - from.x;
    const { wait, fly } = flightTiming(f.ms);
    const arc = Math.min(170, Math.max(90, Math.abs(dx) * 0.3 + 40)) + (f.big ? 12 : 0);
    const style = {
        '--dx': `${dx}px`, '--dy': `${to.y - from.y}px`, '--arc': `${-arc}px`,
        '--turn': `${(f.from === 'left' ? 1 : -1) * (f.big ? 180 : 260)}deg`, '--wait': `${wait}ms`, '--dur': `${fly}ms`,
    } as CSSProperties;
    return (
        <g transform={`translate(${from.x} ${from.y})`}>
            <g className="ks-fly" style={style}>
                <g className="ks-fly-x"><g className="ks-fly-y"><g className="ks-fly-arc"><g className="ks-spin">
                    <Ball big={f.big} />
                </g></g></g></g>
            </g>
        </g>
    );
}

export interface SceneProps {
    left: CastleView;
    right: CastleView;
    flights: Flight[];
    debris: Debris[];
    reload?: Reload | null;
    // A "Grote steen!" call from this side, keyed per big stone.
    bigCall?: { side: SideKey; key: number } | null;
    // The end screen's picture: a tighter viewBox, no life bars.
    view?: string;
    bars?: boolean;
}

export function Scene({ left, right, flights, debris, reload, bigCall, view, bars = true }: SceneProps) {
    const winner = left.won ? 'left' : right.won ? 'right' : null;
    const kidsAt = (side: SideKey) => [toScene(side, { x: 252, y: 0 }), toScene(side, { x: 290, y: 0 })];
    return (
        <svg className="ks-scene" viewBox={view ?? `0 0 ${VIEW.w} ${VIEW.h}`} preserveAspectRatio="xMidYMax meet" aria-hidden>
            <path className="ks-cloud" d="M250 112 q8 -26 34 -18 q14 -20 38 -6 q26 -4 24 22 Z" />
            <path className="ks-cloud" d="M60 -40 q6 -18 26 -12 q12 -14 28 -2 q18 0 16 16 Z" />
            <path className="ks-cloud" d="M420 -10 q6 -18 26 -12 q12 -14 28 -2 q18 0 16 16 Z" />
            <path className="ks-hill" d="M-2000 404 L-300 404 Q100 330 320 392 Q520 336 1000 404 L2600 404 L2600 470 L-2000 470 Z" />
            <rect className="ks-grass" x="-2000" y={VIEW.ground} width="4600" height="200" />
            <g transform={`translate(${LEFT_X} ${VIEW.ground})`}>
                <CastleArt v={left} />
                {debris.filter(d => d.side === 'left').map(d => <Chunks key={d.id} d={d} />)}
            </g>
            <g transform={`translate(${RIGHT_X} ${VIEW.ground}) scale(-1 1)`}>
                <CastleArt v={right} />
                {debris.filter(d => d.side === 'right').map(d => <Chunks key={d.id} d={d} />)}
            </g>
            {winner && kidsAt(winner).map((p, i) => (
                <g key={i} transform={`translate(${p.x} ${p.y + 2})`} style={{ '--k': i } as CSSProperties}>
                    <Kid team={winner === 'left' ? left.team : right.team} cheer flip={winner === 'right'} />
                </g>
            ))}
            {flights.map(f => <Stone key={f.id} f={f} />)}
            {bars && <LifeBar side="left" v={left} />}
            {bars && <LifeBar side="right" v={right} />}
            {reload && <ReloadRing key={`reload-${reload.key}`} r={reload} />}
            {bigCall && (
                <g key={`big-${bigCall.key}`} transform={`translate(${toScene(bigCall.side, launchOf(false)).x} ${toScene(bigCall.side, launchOf(false)).y - 40})`}>
                    <g className="ks-call"><rect className="ks-call-bg" x="-70" y="-22" width="140" height="34" rx="17" /><text className="ks-call-text" x="0" y="2" textAnchor="middle">Grote steen!</text></g>
                </g>
            )}
        </svg>
    );
}
