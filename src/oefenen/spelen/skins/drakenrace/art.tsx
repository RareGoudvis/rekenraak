import { useId, type CSSProperties, type ReactNode } from 'react';
import type { Side } from '../../duel/types';

// Drakenrace's drawings (flat fills under the --spel-ink outline; colours in drakenrace.css). A dragon is drawn
// facing right round its body's centre (0, 0); the storm cloud round its belly's middle; the gong round its disc.

export type DragonMood = 'idle' | 'beat' | 'stall' | 'zap' | 'won';

// The wing in its up pose, hinged at (0, 0): the flap squashes it through flat to its down pose.
const WING = 'M0 0 C -6 -34 -30 -66 -62 -82 C -60 -70 -64 -62 -72 -56 C -64 -52 -64 -44 -70 -36 C -60 -34 -58 -26 -62 -18 C -40 -16 -18 -8 0 0 Z';
const WING_BONES = 'M0 0 L -62 -82 M -4 -6 L -72 -56 M -6 -8 L -70 -36 M -8 -6 L -62 -18';

/** One dragon (about 190 × 150 units), facing right; fire = a puff of fire from its mouth (a counter), sooty after a zap,
 *  a bird sitting on its head or an apple bouncing off it after a crash. */
export function Dragon({ mood, dazed, fire = 0, sooty = false, extra = null }: { mood: DragonMood; dazed: boolean; fire?: number; sooty?: boolean; extra?: 'bird' | 'apple' | null }) {
    const happy = mood === 'won';
    const oops = mood === 'stall';
    return (
        <g className="dk-dragon-art">
            {/* The far wing, behind the body. */}
            <g transform="translate(-4 -20)"><g className="dk-wing is-far"><path className="dk-wing-skin is-far" d={WING} /><path className="dk-wing-bone" d={WING_BONES} /></g></g>
            {/* The tail sways from its root. */}
            <g transform="translate(-38 6)"><g className="dk-tail">
                <path className="dk-tail-body" d="M6 -10 C -22 -14 -42 6 -66 -2 C -76 -6 -82 -14 -86 -22 C -78 -4 -62 14 -36 14 C -18 14 -6 8 6 8 Z" />
                <path className="dk-tail-tip" d="M-86 -22 L -104 -20 L -92 -34 L -96 -12 Z" />
            </g></g>
            <ellipse className="dk-leg" cx="-14" cy="24" rx="10" ry="13" />
            <ellipse className="dk-leg" cx="20" cy="24" rx="10" ry="12" />
            <ellipse className="dk-body" cx="0" cy="0" rx="48" ry="31" />
            <path className="dk-belly" d="M-30 14 C -14 30 22 32 40 12 C 30 22 -12 24 -30 14 Z" />
            <path className="dk-belly-band" d="M-28 10 C -10 26 24 26 42 6 L 40 -2 C 24 16 -8 18 -26 4 Z" />
            {/* Spikes along the back. */}
            {[[-34, -20], [-18, -28], [0, -31], [18, -28]].map(([x, y]) => (
                <path key={x} className="dk-spike" d={`M${x - 7} ${y + 4} L ${x} ${y - 11} L ${x + 7} ${y + 4} Z`} />
            ))}
            {/* The neck and the head. */}
            <path className="dk-body" d="M30 -14 C 40 -28 44 -34 50 -38 L 62 -10 C 52 -4 42 0 34 4 Z" />
            <g className="dk-head" transform="translate(56 -30)">
                <path className="dk-horn" d="M-14 -16 C -20 -28 -26 -34 -34 -38 C -26 -26 -22 -18 -20 -10 Z" />
                <path className="dk-horn" d="M-2 -20 C -2 -32 -6 -40 -12 -46 C -4 -36 -6 -26 -8 -16 Z" />
                <circle className="dk-skin" cx="0" cy="0" r="22" />
                <ellipse className="dk-skin" cx="22" cy="8" rx="20" ry="14" />
                <circle className="dk-nostril" cx="34" cy="2" r="2.6" />
                <circle className="dk-nostril" cx="27" cy="0" r="2.2" />
                <ellipse className="dk-blush" cx="8" cy="10" rx="6" ry="3.6" />
                {dazed ? (
                    // Dizzy: spiral eyes.
                    <path className="dk-eye-spiral" d="M2 -6 m -1 0 a 1 1 0 1 1 2 0 a 3 3 0 1 1 -5 0 a 5 5 0 1 1 9 0 a 7 7 0 1 1 -13 0" />
                ) : happy ? (
                    <path className="dk-eye-shut" d="M-6 -6 Q 1 -14 8 -6" />
                ) : (
                    <>
                        <ellipse className="dk-eye" cx="2" cy="-6" rx="8" ry="9" />
                        <circle className="dk-pupil" cx={oops ? 2 : 4.5} cy={oops ? -8 : -5} r="4.6" />
                        <circle className="dk-glint" cx={oops ? 3.5 : 6} cy={oops ? -10 : -7.5} r="1.6" />
                        <path className="dk-brow" d={oops ? 'M-6 -20 Q 2 -24 9 -19' : 'M-6 -18 Q 2 -21 10 -17'} />
                    </>
                )}
                {oops || dazed
                    ? <ellipse className="dk-mouth-o" cx="24" cy="15" rx="4.5" ry="4" />
                    : <path className="dk-smile" d={happy ? 'M12 12 Q 24 24 38 12 Q 24 18 12 12 Z' : 'M14 13 Q 25 20 37 12'} />}
                {!oops && !dazed && <path className="dk-tooth" d="M30 13.5 L 31.5 18 L 33.5 13 Z" />}
            </g>
            {sooty && <path className="dk-soot" d="M-30 -6 q8 -6 14 0 q8 -6 14 0 M14 6 q6 -4 12 0 M60 -40 q6 -4 12 0" />}
            {/* The near wing, over the body. */}
            <g transform="translate(2 -16)"><g className="dk-wing is-near"><path className="dk-wing-skin" d={WING} /><path className="dk-wing-bone" d={WING_BONES} /></g></g>
            {fire > 0 && (
                <g key={`f${fire}`} transform="translate(98 -18)">
                    <g className="dk-fire">
                        <path className="dk-fire-out" d="M0 0 C 20 -22 50 -26 74 -10 C 60 -8 66 4 80 8 C 58 14 30 20 0 0 Z" />
                        <path className="dk-fire-in" d="M4 0 C 18 -12 38 -14 54 -6 C 44 -2 48 6 56 8 C 40 12 20 12 4 0 Z" />
                    </g>
                </g>
            )}
            {extra === 'bird' && (
                <g transform="translate(54 -72)">
                    <g className="dk-hat-bird">
                        <ellipse className="dk-bird-body" cx={0} cy={0} rx={11} ry={7} />
                        <circle className="dk-bird-body" cx={9} cy={-5} r={6} />
                        <path className="dk-bird-beak" d="M14 -6 L21 -4 L14 -2 Z" />
                        <circle className="dk-bird-eye" cx={10} cy={-6} r={1.5} />
                        <path className="dk-bird-wing" d="M-2 -2 Q-6 -14 -14 -10 Q-8 -4 2 2 Z" />
                        <path className="dk-bird-tail" d="M-10 -1 L-19 -5 L-17 4 Z" />
                    </g>
                </g>
            )}
            {extra === 'apple' && <g transform="translate(56 -66)"><g className="dk-apple-bonk"><circle className="dk-apple" r={7} /><path className="dk-apple-leaf" d="M0 -7 q4 -6 8 -4" /></g></g>}
            {dazed && (
                // Little stars circling the head.
                <g className="dk-daze" transform="translate(52 -66)">
                    <g className="dk-daze-spin">
                        {[0, 120, 240].map(a => <path key={a} className="dk-daze-star" transform={`rotate(${a}) translate(22 0) rotate(${-a})`} d="M0 -7 L 2 -2 L 7 -2 L 3 1.5 L 4.5 7 L 0 3.5 L -4.5 7 L -3 1.5 L -7 -2 L -2 -2 Z" />)}
                    </g>
                </g>
            )}
        </g>
    );
}

/** A small lightning pip (the streak's charge above a dragon). */
export function Pip({ on }: { on: boolean }) {
    return <path className={`dk-pip${on ? ' is-on' : ''}`} d="M2 -9 L -5 1 L 0 1 L -2 9 L 5 -2 L 0 -2 Z" />;
}

/** The finish: a gong in a wooden frame on a floating island; it swings and rings (ring = a new strike). */
export function Gong({ ring, h }: { ring: number; h: number }) {
    return (
        <g className="dk-gong-at">
            {/* The island floats; its underside hangs below the band. */}
            <g className="dk-island-bob">
                <path className="dk-rock" d={`M-92 ${h - 46} C -80 ${h + 10} -40 ${h + 60} -6 ${h + 90} C 20 ${h + 50} 70 ${h + 20} 96 ${h - 46} Z`} />
                <path className="dk-rock-line" d={`M-50 ${h - 20} L -30 ${h + 14} M 30 ${h - 24} L 16 ${h + 30} M 64 ${h - 30} L 56 ${h - 4}`} />
                <ellipse className="dk-grass" cx="2" cy={h - 46} rx="100" ry="16" />
                <g className="dk-frame">
                    <rect className="dk-post" x="-72" y="34" width="14" height={h - 82} rx="4" />
                    <rect className="dk-post" x="60" y="34" width="14" height={h - 82} rx="4" />
                    <path className="dk-roof" d="M-96 40 C -60 30 60 30 98 40 C 92 26 80 18 70 14 C 30 22 -30 22 -68 14 C -80 18 -92 26 -96 40 Z" />
                    <rect className="dk-beam" x="-70" y="44" width="142" height="12" rx="4" />
                </g>
                <g className="dk-gong-swing" key={ring} data-ring={ring}>
                    <path className="dk-rope" d="M-22 56 L -16 82 M 24 56 L 18 82" />
                    <g className={`dk-gong${ring ? ' is-ring' : ''}`} transform={`translate(1 ${82 + 46})`}>
                        <circle className="dk-gong-disc" r="46" />
                        <circle className="dk-gong-ring" r="34" />
                        <circle className="dk-gong-ring" r="22" />
                        <circle className="dk-gong-boss" r="12" />
                        <path className="dk-gong-shine" d="M-30 -24 Q -20 -36 -4 -40" />
                    </g>
                    {ring > 0 && [0, 1, 2].map(i => <circle key={i} className="dk-gong-wave" cx="1" cy={82 + 46} r="50" style={{ '--i': i } as CSSProperties} />)}
                </g>
            </g>
        </g>
    );
}

/** Fireworks over the sky for the winner: rays that burst out and fall away. */
export function Fireworks({ at }: { at: readonly (readonly [number, number])[] }) {
    return (
        <g className="dk-fireworks">
            {at.map(([x, y], k) => (
                <g key={k} transform={`translate(${x} ${y})`}>
                    <g className="dk-firework" style={{ '--k': k } as CSSProperties}>
                        {Array.from({ length: 12 }, (_, i) => <path key={i} className={`dk-ray is-${(i + k) % 3}`} transform={`rotate(${i * 30})`} d="M14 0 L 54 0" />)}
                        <circle className="dk-ray-core" r="10" />
                    </g>
                </g>
            ))}
        </g>
    );
}

// ── The scrolling backdrop: identical tiles, so the drift loops without a seam ──────────────────────────────

/** A strip of `tiles` identical tiles of w × h; the CSS drifts it by one tile and slides it with the leader. */
function Strip({ className, w, h, tiles = 4, children }: { className: string; w: number; h: number; tiles?: number; children: ReactNode }) {
    const id = `dk-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
    return (
        <svg className={`dk-strip ${className}`} viewBox={`0 0 ${w * tiles} ${h}`} style={{ aspectRatio: `${w * tiles} / ${h}` }} preserveAspectRatio="xMinYMax meet" aria-hidden>
            <defs><g id={id}>{children}</g></defs>
            {Array.from({ length: tiles }, (_, i) => <use key={i} href={`#${id}`} x={i * w} />)}
        </svg>
    );
}

/** The sunset backdrop: the sky, the sun, far mountains, floating islands and a sea of clouds, layer by layer. */
export function Backdrop() {
    return (
        <div className="dk-back" aria-hidden>
            <div className="dk-sky" />
            <div className="dk-sun"><span className="dk-sun-rays" /><span className="dk-sun-disc" /></div>
            <Strip className="is-far" w={3600} h={300}>
                <path className="dk-mount" d="M0 300 L 0 210 L 160 120 L 300 200 L 460 90 L 640 190 L 780 140 L 980 220 L 1160 110 L 1340 200 L 1500 150 L 1700 230 L 1900 100 L 2080 190 L 2260 130 L 2460 210 L 2640 120 L 2840 200 L 3000 150 L 3200 220 L 3400 140 L 3600 210 L 3600 300 Z" />
                <path className="dk-mount-snow" d="M460 90 L 430 118 L 452 112 L 470 124 L 490 104 Z M1160 110 L 1132 136 L 1156 130 L 1172 140 L 1188 122 Z M1900 100 L 1870 128 L 1894 122 L 1910 134 L 1928 114 Z M2640 120 L 2612 146 L 2636 140 L 2652 150 L 2668 132 Z" />
            </Strip>
            {/* Far-off castles on the hills: the land the race flies over (the floating islands are obstacles now). */}
            <Strip className="is-mid" w={2400} h={300}>
                {[[300, 236, 0.8], [1150, 250, 0.6], [1900, 228, 0.9]].map(([x, y, s]) => (
                    <g key={x} transform={`translate(${x} ${y}) scale(${s})`} className="dk-far-castle">
                        <path d="M-60 60 L-60 -10 L-44 -10 L-44 -24 L-30 -24 L-30 -10 L-10 -10 L-10 -50 L-20 -50 L0 -84 L20 -50 L10 -50 L10 -10 L30 -10 L30 -24 L44 -24 L44 -10 L60 -10 L60 60 Z" />
                    </g>
                ))}
            </Strip>
            <Strip className="is-near" w={2000} h={100}>
                {[[0, 70, 90], [150, 60, 70], [300, 74, 100], [480, 58, 80], [640, 72, 110], [820, 62, 70], [980, 76, 100], [1160, 60, 90], [1330, 70, 80], [1500, 60, 110], [1690, 72, 90], [1860, 62, 80], [2000, 70, 90]].map(([x, y, r]) => (
                    <circle key={x} className="dk-cloudbank" cx={x} cy={y + 20} r={r * 0.55} />
                ))}
                <rect className="dk-cloudbank" x="0" y="80" width="2000" height="20" />
            </Strip>
        </div>
    );
}

/** The card's picture: the winner's dragon, happy, with a little gong. */
export function CardDragon({ side }: { side: Side }) {
    return (
        <svg className={`dk-card-art is-${side}`} viewBox="-120 -110 240 160" aria-hidden>
            <g className="dk-bob"><Dragon mood="won" dazed={false} /></g>
        </svg>
    );
}
