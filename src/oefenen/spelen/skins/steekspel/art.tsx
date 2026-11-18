import type { CSSProperties } from 'react';
import type { Side } from '../../duel/types';
import { BARRIER, BOARD, HOURGLASS, LANCE, LANCE_DEG, ROW, VIEW } from './geometry';

// Steekspel's pictures (SVG in scene units, geometry.ts): the tournament ground (castle, tents, the royal stand with
// its crowd, the king's hourglass, the barrier, a score board per knight), the two knights on their horses (horse
// middle at x 0, hooves on y 0, facing right) with the gear they earn (plume, shining lance, horse armour, banner,
// crown), the tilt's splinters, the hay bale, the calls and the petals. Every motion is CSS (steekspel.css).

const v = (o: Record<string, string | number>) => o as CSSProperties;

function seeded(seed: number) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ── The tournament ground ────────────────────────────────────────────────────

function Castle() {
    return (
        <g className="stk-far">
            <path className="stk-hill is-far" d="M-600 150 Q-200 70 200 120 Q520 50 820 110 Q1100 60 1800 130 L1800 240 L-600 240 Z" />
            <g transform="translate(600 62)">
                <rect className="stk-stone" x={-70} y={10} width={140} height={60} />
                {[-70, 50].map(x => <rect key={x} className="stk-stone" x={x} y={-14} width={20} height={84} />)}
                <rect className="stk-stone" x={-16} y={-30} width={32} height={100} />
                {[-70, 50].map(x => <path key={x} className="stk-roof" d={`M${x - 4} -14 L${x + 10} -40 L${x + 24} -14 Z`} />)}
                <path className="stk-roof" d="M-20 -30 L0 -64 L20 -30 Z" />
                {[[-60, -40, 'left'], [0, -64, 'right'], [60, -40, 'left']].map(([x, y, s]) => (
                    <g key={String(x)} transform={`translate(${x} ${y})`}>
                        <path className="stk-pole" d="M0 0 L0 -16" />
                        <path className={`stk-pennon is-${s}`} d="M0 -16 L14 -12 L0 -8 Z" />
                    </g>
                ))}
                <path className="stk-gate" d="M-10 70 L-10 50 Q0 38 10 50 L10 70 Z" />
                {[-48, 36].map(x => <rect key={x} className="stk-slit" x={x} y={20} width={4} height={10} rx={2} />)}
            </g>
            <path className="stk-hill is-near" d="M-600 190 Q-100 130 300 170 Q700 120 1000 165 Q1300 140 1800 170 L1800 260 L-600 260 Z" />
        </g>
    );
}

/** A striped tent with a pennant on top, in a team's colour. */
function Tent({ x, side }: { x: number; side: Side }) {
    return (
        <g transform={`translate(${x} 206)`} className={`stk-tent is-${side}`}>
            <path className="stk-tent-body" d="M-56 0 L-46 -64 L46 -64 L56 0 Z" />
            {[-30, -6, 18].map(dx => <path key={dx} className="stk-tent-stripe" d={`M${dx - 2} 0 L${dx * 0.82 + 2} -64 L${dx * 0.82 + 12} -64 L${dx + 14} 0 Z`} />)}
            <path className="stk-tent-roof" d="M-60 -60 L0 -100 L60 -60 Z" />
            <path className="stk-tent-scallop" d="M-60 -60 q7.5 10 15 0 q7.5 10 15 0 q7.5 10 15 0 q7.5 10 15 0 q7.5 10 15 0 q7.5 10 15 0 q7.5 10 15 0 q7.5 10 15 0" />
            <path className="stk-tent-door" d="M-12 0 L0 -40 L12 0 Z" />
            <path className="stk-pole" d="M0 -100 L0 -122" />
            <path className={`stk-pennon is-${side} is-big`} d="M0 -122 L24 -116 L0 -110 Z" />
        </g>
    );
}

/** The royal stand in the middle with its crowd; on a big moment the fans jump (cheer). */
function Stand({ cheer }: { cheer: number }) {
    const rng = seeded(21);
    const fans = [{ y: 142, n: 13, r: 9 }, { y: 166, n: 14, r: 10 }];
    return (
        <g className={`stk-stand${cheer ? ` is-cheer-${cheer % 2}` : ''}`}>
            <rect className="stk-stand-wood" x={380} y={120} width={440} height={86} />
            {fans.map((row, ri) => Array.from({ length: row.n }, (_, i) => {
                const x = 400 + (i + (ri ? 0.2 : 0.6)) * (400 / row.n) + (rng() - 0.5) * 6;
                const tone = Math.floor(rng() * 5);
                const shirt = Math.floor(rng() * 6);
                const hat = rng() < 0.2;
                return (
                    <g key={`${ri}-${i}`} transform={`translate(${x.toFixed(1)} ${row.y})`}>
                        <g className="stk-fan" style={v({ '--d': `${(rng() * 1.2).toFixed(2)}s` })}>
                            <path className={`stk-shirt is-${shirt}`} d={`M${-row.r} ${row.r + 8} Q${-row.r} ${row.r * 0.4} 0 ${row.r * 0.4} Q${row.r} ${row.r * 0.4} ${row.r} ${row.r + 8} Z`} />
                            <circle className={`stk-head is-${tone}`} r={row.r * 0.72} cy={-1} />
                            {hat && <path className={`stk-hennin is-${shirt % 2}`} d={`M${-row.r * 0.6} -${row.r * 0.6} L0 -${row.r * 2.6} L${row.r * 0.6} -${row.r * 0.6} Z`} />}
                        </g>
                    </g>
                );
            }))}
            <rect className="stk-stand-rail" x={376} y={184} width={448} height={22} />
            {Array.from({ length: 8 }, (_, i) => (
                <path key={i} className={`stk-drape is-${i % 2}`} d={`M${380 + i * 55} 184 L${435 + i * 55} 184 L${407.5 + i * 55} 204 Z`} />
            ))}
            {/* The awning over the royal box, striped, with a crown of pennants. */}
            <path className="stk-awning" d="M370 120 L600 84 L830 120 Z" />
            {Array.from({ length: 6 }, (_, i) => (
                <path key={i} className="stk-awning-stripe" d={`M${600 - 230 + i * 80} 120 L600 84 L${600 - 230 + i * 80 + 38} 120 Z`} />
            ))}
            <path className="stk-awning-edge" d="M370 120 q11.5 12 23 0 q11.5 12 23 0 q11.5 12 23 0 q11.5 12 23 0 q11.5 12 23 0 q11.5 12 23 0 q11.5 12 23 0 q11.5 12 23 0 q11.5 12 23 0 q11.5 12 23 0 q11.5 12 23 0 q11.5 12 23 0 q11.5 12 23 0 q11.5 12 23 0 q11.5 12 23 0 q11.5 12 23 0 q11.5 12 23 0 q11.5 12 23 0 q11.5 12 23 0 q11.5 12 23 0" />
            {/* The herald's trumpets on both sides of the box, their banners. */}
            {[392, 808].map((x, i) => (
                <g key={x} transform={`translate(${x} 150) scale(${i ? -1 : 1} 1)`}>
                    <path className="stk-trumpet" d="M0 0 L34 -8 L44 -16 L44 2 L34 -4 Z" />
                    <path className={`stk-banner is-${i ? 'right' : 'left'}`} d="M10 -4 L26 -7 L26 10 L18 6 L10 12 Z" />
                </g>
            ))}
        </g>
    );
}

function Ground() {
    return (
        <g>
            <rect className="stk-grass" x={-600} y={200} width={VIEW.w + 1200} height={240} />
            <path className="stk-sand" d="M-600 214 L1800 214 L1800 440 L-600 440 Z" />
            {[[200, 228], [480, 222], [760, 230], [1020, 224], [320, 300], [640, 312], [900, 296], [120, 318], [1100, 310]].map(([x, y], i) => (
                <ellipse key={i} className="stk-hoofprint" cx={x} cy={y} rx={8} ry={3} />
            ))}
        </g>
    );
}

/** The tilt barrier between the rows: posts, two rails, painted in the two colours. */
function Barrier() {
    const posts = Array.from({ length: 15 }, (_, i) => BARRIER.x0 + i * ((BARRIER.x1 - BARRIER.x0) / 14));
    return (
        <g className="stk-barrier">
            <rect className="stk-barrier-board" x={BARRIER.x0} y={BARRIER.top + 8} width={BARRIER.x1 - BARRIER.x0} height={BARRIER.foot - BARRIER.top - 12} />
            {posts.slice(0, -1).map((x, i) => <rect key={x} className={`stk-barrier-paint is-${i % 2}`} x={x + 6} y={BARRIER.top + 12} width={(BARRIER.x1 - BARRIER.x0) / 14 - 12} height={BARRIER.foot - BARRIER.top - 20} />)}
            <rect className="stk-rail" x={BARRIER.x0 - 8} y={BARRIER.top} width={BARRIER.x1 - BARRIER.x0 + 16} height={10} rx={4} />
            {posts.map(x => <rect key={x} className="stk-post" x={x - 6} y={BARRIER.top - 6} width={12} height={BARRIER.foot - BARRIER.top + 6} rx={3} />)}
        </g>
    );
}

// ── The knights ──────────────────────────────────────────────────────────────

const LEGS = [{ x: -42, k: 0 }, { x: -28, k: 1 }, { x: 30, k: 2 }, { x: 44, k: 3 }] as const;

function Horse({ side, armour }: { side: Side; armour: boolean }) {
    return (
        <g className="stk-horse">
            <g className="stk-tail"><path className="stk-horse-hair" d="M-56 -76 Q-84 -70 -80 -34 Q-70 -50 -64 -40 Q-66 -60 -52 -66 Z" /></g>
            {LEGS.map(l => (
                <g key={l.k} transform={`translate(${l.x} -46)`}>
                    <g className={`stk-leg is-${l.k}`}>
                        <rect className="stk-horse-skin" x={-5} y={0} width={10} height={42} rx={5} />
                        <rect className="stk-hoof" x={-6} y={38} width={12} height={8} rx={2} />
                    </g>
                </g>
            ))}
            <ellipse className="stk-horse-skin" cx={0} cy={-62} rx={58} ry={24} />
            {/* Neck and head with a cloth hood, ears through it, a friendly eye. */}
            <path className="stk-horse-skin" d="M30 -70 Q44 -108 64 -118 L80 -106 Q64 -92 56 -62 Z" />
            <g className="stk-head-nod">
                <path className="stk-horse-skin" d="M58 -118 Q72 -126 84 -114 L98 -96 Q100 -88 92 -86 L80 -88 Q68 -96 58 -108 Z" />
                <path className="stk-horse-hair" d="M50 -122 Q42 -110 40 -96 Q48 -104 54 -100 Q50 -110 60 -118 Z" />
                <path className="stk-ear" d="M62 -120 L60 -134 L70 -122 Z" />
                <circle className="stk-eye" cx={76} cy={-110} r={3} />
                <circle className="stk-nostril" cx={93} cy={-90} r={1.6} />
                <path className="stk-bridle" d="M64 -116 Q72 -100 90 -90" />
                {armour && (
                    <g className="stk-chanfron">
                        {/* The horse's face plate with a gold rosette and a little blunt spike, like a unicorn's. */}
                        <path className="stk-armour" d="M60 -117 Q70 -126 82 -116 L96 -97 Q94 -92 89 -93 Q78 -104 63 -108 Z" />
                        <circle className="stk-rosette" cx={74} cy={-114} r={4} />
                        <path className="stk-armour" d="M66 -121 L64 -133 L71 -123 Z" />
                    </g>
                )}
            </g>
            {armour && (
                <g className="stk-crinet">
                    {[0, 1, 2].map(i => <path key={i} className="stk-armour" d={`M${38 + i * 8} ${-82 - i * 12} L${48 + i * 8} ${-94 - i * 12} L${58 + i * 6} ${-88 - i * 12} L${50 + i * 6} ${-76 - i * 12} Z`} />)}
                </g>
            )}
            {/* The caparison: a long cloth in the team's colour over the body, scalloped at the hem. */}
            <path className="stk-cloth" d="M-62 -82 Q-62 -90 -50 -90 L40 -90 Q60 -88 62 -70 L66 -40 q-8 8 -16 0 q-8 8 -16 0 q-8 8 -16 0 q-8 8 -16 0 q-8 8 -16 0 q-8 8 -16 0 q-8 8 -16 0 q-8 8 -16 0 L-66 -40 Z" />
            <path className="stk-cloth-trim" d="M-64 -50 L64 -50" />
            {[-40, -12, 16, 44].map(x => <path key={x} className="stk-cloth-mark" transform={`translate(${x} -68)`} d={side === 'left' ? 'M0 -9 L2.6 -2.8 L9 -2.6 L4 1.4 L5.6 8 L0 4.4 L-5.6 8 L-4 1.4 L-9 -2.6 L-2.6 -2.8 Z' : 'M0 -9 L8 0 L0 9 L-8 0 Z'} />)}
            <path className="stk-saddle" d="M-22 -90 Q-20 -104 -10 -100 L10 -100 Q18 -104 20 -92 Z" />
        </g>
    );
}

export interface KnightView {
    side: Side;
    x: number;
    // Gear earned this joust (rule.ts gearOf): 1 plume, 2 shining lance, 3 horse armour, 4 banner, 5 crown.
    gear: number;
    // Right answers this joust (the score board).
    rights: number;
    // The last seconds of the minute: lance couched, the horse pawing the ground.
    ready: boolean;
    // The minute is up: galloping at the other knight.
    charging: boolean;
    // Counters that restart a moment: a right answer (the horse stamps), a sneeze (a mistake), a piece of gear won.
    stamp: number;
    oops: number;
    gained: number;
    // The tilt at the round's end: this knight won it, fell off, or both lances broke (a draw).
    tilt: 'won' | 'fell' | 'draw' | null;
    moveMs: number;
}

/** The rider: armour, shield, the lance on its pivot, the helmet with its plume (it flies off in a fall). */
function Rider({ k }: { k: KnightView }) {
    const deg = k.ready || k.charging || k.tilt ? LANCE_DEG[k.side].down : LANCE_DEG[k.side].up;
    return (
        <g className="stk-rider">
            <path className="stk-metal" d="M-8 -82 L8 -80 L14 -60 L22 -58 L22 -52 L8 -52 Z" />
            <path className="stk-metal" d="M-18 -84 Q-20 -126 -2 -128 Q14 -126 12 -84 Z" />
            <path className="stk-belt" d="M-18 -92 L12 -92" />
            <circle className="stk-skin" cx={-3} cy={-140} r={12} />
            <path className="stk-hair" d="M-15 -142 Q-14 -156 -2 -154 Q10 -154 9 -142 Q2 -148 -15 -142 Z" />
            <g className="stk-face">
                <circle className="stk-dot" cx={2} cy={-141} r={1.6} />
                <circle className="stk-dot" cx={7} cy={-141} r={1.6} />
                <path className="stk-smile" d="M1 -135 Q5 -132 8 -136" />
            </g>
            <g transform={`translate(${LANCE.x} ${LANCE.y})`}>
                <g className="stk-lance-arm" style={v({ rotate: `${deg}deg` })}>
                    <Lance k={k} />
                </g>
            </g>
            <path className="stk-metal" d="M-4 -118 Q4 -104 4 -100 L0 -98 Q-6 -104 -10 -116 Z" />
            <g className={`stk-shield${k.gear >= 5 ? ' is-gold' : ''}`}>
                <path className="stk-shield-body" d="M2 -122 L28 -122 L28 -104 Q28 -88 15 -82 Q2 -88 2 -104 Z" />
                <path className="stk-shield-band" d="M2 -110 L28 -110 L28 -102 L2 -102 Z" />
            </g>
            <g className="stk-helmet">
                <path className="stk-metal" d="M-17 -130 L-17 -150 Q-16 -160 -3 -160 Q10 -160 11 -150 L12 -130 Q-3 -126 -17 -130 Z" />
                <path className="stk-visor" d="M-2 -146 L11 -146" />
                <path className="stk-visor" d="M2 -140 L11 -140" />
                {k.gear >= 1 ? (
                    // The plume he earned: three big feathers, the team colour and gold.
                    <g className="stk-plume-big">
                        <path className="stk-plume" d="M-9 -158 Q-30 -170 -50 -154 Q-34 -154 -30 -144 Q-20 -154 -12 -154 Z" />
                        <path className="stk-plume is-gold" d="M-8 -160 Q-24 -186 -52 -178 Q-36 -172 -36 -160 Q-22 -166 -12 -157 Z" />
                        <path className="stk-plume" d="M-6 -160 Q-10 -196 -44 -200 Q-30 -186 -34 -170 Q-18 -176 -10 -158 Z" />
                    </g>
                ) : <path className="stk-plume" d="M-6 -160 Q-12 -178 -30 -176 Q-22 -170 -24 -162 Q-14 -166 -10 -158 Z" />}
                {k.gear >= 5 && (
                    <g className="stk-crown">
                        <path className="stk-crown-gold" d="M-18 -152 L-18 -166 L-11 -159 L-4 -170 L3 -159 L10 -166 L11 -152 Q-3 -148 -18 -152 Z" />
                        <circle className="stk-gem" cx={-4} cy={-155} r={2.6} />
                    </g>
                )}
            </g>
        </g>
    );
}

function Lance({ k }: { k: KnightView }) {
    const broken = k.tilt === 'won' || k.tilt === 'draw';
    const len = LANCE.len;
    const f0 = len * 0.6;
    return (
        <g className={`stk-lance${k.gear >= 2 ? ' is-shiny' : ''}${broken ? ' is-broken' : ''}`}>
            <path className="stk-lance-shaft" d={`M${-LANCE.butt} -2.5 L${len * 0.55} -3.5 L${len * 0.55} 3.5 L${-LANCE.butt} 2.5 Z`} />
            <g className="stk-lance-tip">
                <path className="stk-lance-shaft" d={`M${len * 0.55} -3.5 L${len} -1 L${len} 1 L${len * 0.55} 3.5 Z`} />
                {[0.62, 0.74, 0.86].map(f => <path key={f} className="stk-lance-band" d={`M${len * f} -3 L${len * f + 7} -2.5 L${len * f + 7} 2.5 L${len * f} 3 Z`} />)}
                {k.gear >= 4
                    // The banner he earned: a long swallow-tailed pennon in the team colour.
                    ? (
                        <g className="stk-vaandel">
                            <path className="stk-lance-flag is-big" d={`M${f0} -3 L${f0 + 52} -6 L${f0 + 40} -15 L${f0 + 58} -26 L${f0 + 4} -26 Z`} />
                            <path className="stk-vaandel-mark" d={`M${f0 + 18} -21 l3 -4 l3 4 l-3 4 Z`} />
                        </g>
                    )
                    : <path className="stk-lance-flag" d={`M${len * 0.68} -3 L${len * 0.68 + 26} -12 L${len * 0.68 + 18} -3 Z`} />}
            </g>
            {[0.12, 0.28, 0.44].map(f => <path key={f} className="stk-lance-band" d={`M${len * f} -3.2 L${len * f + 8} -3.2 L${len * f + 8} 3.2 L${len * f} 3.2 Z`} />)}
            <path className="stk-vamplate" d="M6 -12 Q14 0 6 12 L12 12 Q18 0 12 -12 Z" />
            {k.gear >= 2 && !broken && <g transform={`translate(${len} 0)`}><g className="stk-gleam is-loop"><path d="M0 -12 L3 -3 L12 0 L3 3 L0 12 L-3 3 L-12 0 L-3 -3 Z" /></g></g>}
            {broken && (
                <g className="stk-splinters" transform={`translate(${len * 0.55} 0)`}>
                    {Array.from({ length: 7 }, (_, i) => <path key={i} className="stk-splinter" style={v({ '--a': `${-70 + i * 22}deg`, '--k': i })} d="M0 -2 L16 -1 L16 1 L0 2 Z" />)}
                </g>
            )}
        </g>
    );
}

/** The hay bale a fallen knight lands in. */
function Bale() {
    return (
        <g className="stk-bale">
            <rect className="stk-hay" x={-38} y={-34} width={76} height={34} rx={6} />
            {[-22, 0, 22].map(x => <path key={x} className="stk-straw" d={`M${x - 6} -30 L${x + 4} -6 M${x + 4} -32 L${x - 2} -10`} />)}
            <path className="stk-twine" d="M-14 -34 L-14 0 M14 -34 L14 0" />
            {[-30, -12, 8, 26].map(x => <path key={x} className="stk-tuft" d={`M${x} -34 l-3 -7 m3 7 l3 -8 m-3 8 l7 -5`} />)}
        </g>
    );
}

function Stars() {
    return (
        <g className="stk-stars" transform="translate(-150 -112)">
            <g className="stk-orbit">
                {[0, 120, 240].map(a => <path key={a} className="stk-star" transform={`rotate(${a}) translate(28 0) rotate(${-a})`} d="M0 -9 L2.6 -2.6 L9 0 L2.6 2.6 L0 9 L-2.6 2.6 L-9 0 L-2.6 -2.6 Z" />)}
            </g>
        </g>
    );
}

/** One knight on its row: it waits at its end and gears up; at the tilt it gallops in, then wins or falls. */
export function Knight({ k }: { k: KnightView }) {
    const row = ROW[k.side];
    const flip = k.side === 'right' ? -1 : 1;
    const cls = `stk-knight is-${k.side}${k.tilt ? ` is-${k.tilt}` : ''}${k.charging ? ' is-charging' : ''}${k.ready && !k.charging ? ' is-ready' : ''}`;
    return (
        <g className={cls} data-side={k.side} data-gear={k.gear} style={v({ transform: `translate(${k.x}px, ${row.y}px) scale(${flip * row.scale}, ${row.scale})`, transitionDuration: `${k.moveMs}ms` })}>
            <ellipse className="stk-shadow" cx={0} cy={2} rx={66} ry={7} />
            {k.tilt === 'fell' && <g transform="translate(-130 0)"><g className="stk-bale-in"><Bale /></g></g>}
            {k.charging && !k.tilt && <g className="stk-trail">{[0, 1, 2, 3].map(i => <circle key={i} className="stk-dust is-trail" style={v({ '--k': i })} cx={-62} cy={-8} r={10 + i * 2} />)}</g>}
            <g key={`s${k.stamp}`} className={k.charging ? 'stk-run' : k.stamp ? 'stk-stamp' : undefined}>
                <g key={`o${k.oops}`} className={k.oops ? 'stk-sneeze' : undefined}>
                    <g className="stk-rear">
                        <Horse side={k.side} armour={k.gear >= 3} />
                        {k.oops > 0 && <g key={k.oops} className="stk-achoo" transform="translate(100 -92)">{[0, 1, 2].map(i => <circle key={i} className="stk-puff" style={v({ '--k': i })} r={5 + i * 2} />)}</g>}
                        <g className="stk-fall"><Rider k={k} /></g>
                    </g>
                </g>
            </g>
            {k.stamp > 0 && !k.charging && <g key={`d${k.stamp}`} className="stk-stampdust" transform="translate(40 0)">{[-12, 4, 18].map((x, i) => <circle key={x} className="stk-dust" style={v({ '--k': i })} cx={x} r={8} />)}</g>}
            {k.gained > 0 && (
                <g key={`g${k.gained}`} className="stk-sparkle" transform="translate(0 -130)">
                    {Array.from({ length: 8 }, (_, i) => <path key={i} className="stk-spark" style={v({ '--a': `${i * 45}deg`, '--k': i })} d="M0 -7 L2 -2 L7 0 L2 2 L0 7 L-2 2 L-7 0 L-2 -2 Z" />)}
                </g>
            )}
            {k.tilt === 'fell' && <Stars />}
            {k.tilt === 'fell' && <g className="stk-dustcloud" transform="translate(-130 -16)">{[-30, -10, 10, 30].map((x, i) => <circle key={x} className="stk-dust" style={v({ '--k': i })} cx={x} r={16} />)}</g>}
        </g>
    );
}

/** A knight's score board on its pole: the shield with this joust's right answers; it swings on each new one. */
export function Board({ side, count }: { side: Side; count: number }) {
    const { x, y } = BOARD[side];
    // The pole stands on the stand's side, clear of the tents.
    const pole = side === 'left' ? 40 : -40;
    return (
        <g transform={`translate(${x} ${y})`} className={`stk-board is-${side}`}>
            <path className="stk-board-pole" d={`M${pole} -10 L${pole} ${214 - y}`} />
            <path className="stk-board-beam" d={`M${pole * 1.2} -6 L${-pole * 0.7} -6`} />
            <g key={count} className={count ? 'stk-board-swing' : undefined}>
                <path className="stk-board-rope" d="M-15 -6 L-12 8 M15 -6 L12 8" />
                <path className="stk-board-shield" d="M-28 8 L28 8 L28 34 Q28 58 0 68 Q-28 58 -28 34 Z" />
                <path className="stk-board-plate" d="M-20 14 L20 14 L20 34 Q20 50 0 58 Q-20 50 -20 34 Z" />
                <text className="stk-board-num" x={0} y={46} textAnchor="middle">{count}</text>
            </g>
        </g>
    );
}

/** The king's hourglass on the awning: it turns over when a joust begins and runs out with the minute. */
export function Hourglass({ n, run, low }: { n: number; run: boolean; low: boolean }) {
    return (
        <g transform={`translate(${HOURGLASS.x} ${HOURGLASS.y})`}>
            <g key={n} className="stk-glass-turn"><g className={`stk-glass${run ? ' is-run' : ''}${low ? ' is-low' : ''}`}>
                <path className="stk-glass-body" d="M-15 -62 Q-15 -42 -3 -35 Q-15 -28 -15 -8 L15 -8 Q15 -28 3 -35 Q15 -42 15 -62 Z" />
                <path className="stk-glass-sand is-top" d="M-12.4 -54 Q-12 -42 0 -36.4 Q12 -42 12.4 -54 Z" />
                <path className="stk-glass-sand is-bottom" d="M-13.6 -9 Q-13 -20 0 -25 Q13 -20 13.6 -9 Z" />
                <path className="stk-glass-stream" d="M0 -36 L0 -10" />
                <path className="stk-glass-shine" d="M-10 -58 Q-10 -48 -5 -43" />
                <rect className="stk-glass-frame" x={-21} y={-70} width={42} height={8} rx={3} />
                <rect className="stk-glass-frame" x={-21} y={-8} width={42} height={8} rx={3} />
                <path className="stk-glass-post" d="M-18 -62 L-18 -8 M18 -62 L18 -8" />
            </g></g>
        </g>
    );
}

// ── The tilt, calls, petals, the card ───────────────────────────────────────

/** The crash where the lances meet: a star burst and wood bits. */
export function Clash({ x, y, draw }: { x: number; y: number; draw: boolean }) {
    return (
        <g transform={`translate(${x} ${y})`} className={`stk-clash${draw ? ' is-draw' : ''}`}>
            <path className="stk-clash-star" d="M0 -40 L10 -12 L38 -16 L16 4 L30 30 L4 16 L-12 38 L-12 10 L-40 4 L-14 -10 Z" />
            {Array.from({ length: 10 }, (_, i) => <path key={i} className={`stk-chip is-${i % 2}`} style={v({ '--a': `${i * 36}deg`, '--k': i })} d="M-2 -6 L2 -6 L3 6 L-3 6 Z" />)}
        </g>
    );
}

export interface CallView { id: number; text: string; x: number; y: number; tone: 'lance' | 'oops' | 'bonk' | 'win' | 'plus' }

export function Call({ c }: { c: CallView }) {
    const w = Math.max(c.tone === 'plus' ? 58 : 100, c.text.length * 15 + 34);
    const x = Math.max(w / 2 + 10, Math.min(VIEW.w - w / 2 - 10, c.x));
    return (
        <g transform={`translate(${x} ${c.y})`}>
            <g className={`stk-call is-${c.tone}`}>
                <rect className="stk-call-bg" x={-w / 2} y={-21} width={w} height={40} rx={20} />
                <text className="stk-call-text" x={0} y={8} textAnchor="middle">{c.text}</text>
            </g>
        </g>
    );
}

/** Flower petals and ribbons thrown from the stand over the winner. */
export function Petals({ x }: { x: number }) {
    const rng = seeded(Math.round(x));
    return (
        <g className="stk-petals">
            {Array.from({ length: 40 }, (_, i) => (
                <g key={i} transform={`translate(${(x - 260 + rng() * 520).toFixed(0)} -16)`}>
                    <path className={`stk-petal is-${i % 4}`} d="M0 -5 Q5 -5 5 0 Q5 5 0 5 Q-5 5 -5 0 Q-5 -5 0 -5 Z"
                        style={v({ '--d': `${(rng() * 1.6).toFixed(2)}s`, '--t': `${(2 + rng() * 1.2).toFixed(2)}s`, '--sway': `${Math.round((rng() - 0.5) * 90)}px`, '--r': `${Math.round(rng() * 540 - 270)}deg` })} />
                </g>
            ))}
        </g>
    );
}

/** The winner's shield on the round and match cards. */
export function ShieldCard({ side }: { side: Side }) {
    return (
        <svg className="stk-card-art" viewBox="-4 -128 40 52" aria-hidden>
            <g className={`stk-knight is-${side} is-card`}>
                <path className="stk-shield-body" d="M2 -122 L28 -122 L28 -104 Q28 -88 15 -82 Q2 -88 2 -104 Z" />
                <path className="stk-shield-band" d="M2 -110 L28 -110 L28 -102 L2 -102 Z" />
            </g>
        </svg>
    );
}

export interface SceneProps {
    knights: Record<Side, KnightView>;
    // The hourglass: the round (it turns over), the minute running, the last seconds.
    glass: { n: number; run: boolean; low: boolean };
    clash: { x: number; y: number; draw: boolean; n: number } | null;
    calls: CallView[];
    cheer: number;
    winnerX: number | null;
}

export function Scene({ knights, glass, clash, calls, cheer, winnerX }: SceneProps) {
    return (
        <svg className="stk-svg" viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} preserveAspectRatio="xMidYMax meet" aria-hidden>
            <Castle />
            <Tent x={110} side="left" />
            <Tent x={250} side="left" />
            <Tent x={950} side="right" />
            <Tent x={1090} side="right" />
            <Stand cheer={cheer} />
            <Hourglass n={glass.n} run={glass.run} low={glass.low} />
            <Ground />
            <Board side="left" count={knights.left.rights} />
            <Board side="right" count={knights.right.rights} />
            <Knight k={knights.left} />
            <Barrier />
            <Knight k={knights.right} />
            {clash && <Clash key={clash.n} x={clash.x} y={clash.y} draw={clash.draw} />}
            {winnerX !== null && <Petals x={winnerX} />}
            {calls.map(c => <Call key={c.id} c={c} />)}
        </svg>
    );
}
