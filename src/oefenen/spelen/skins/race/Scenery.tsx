import { memo, useId, type CSSProperties, type ReactNode } from 'react';
import type { Land } from './route';

// The six landscapes, drawn in code. Each is a stack of parallax strips (data-par = how fast it follows the road;
// the loop in Race.tsx moves them) over its own sky, with its own weather. Tiles repeat seamlessly: every shape
// that crosses a tile edge has the same height at x = 0 and at the tile's width. Self-contained on purpose (the
// shared scene kit was not merged yet when this was drawn).

// Tile sizes in scene units (--rc-u px each; race.css). SYNC: race.css .rc-far / .rc-mid / .rc-near / .rc-clouds.
const FAR_W = 1000;
const MID_W = 900;
const NEAR_W = 480;
const CLOUD_W = 1400;
// Enough tiles to cover a 2560 px wide screen plus one tile of shift at the smallest unit (0.75 px).
const COUNT = { far: 5, mid: 6, near: 9, clouds: 4 } as const;

// Shapes drawn twice: a thick ink copy below, the fill on top, so overlapping circles share one outline.
function Ol({ c, children }: { c: string; children: ReactNode }) {
    return <><g className="rc-ol">{children}</g><g className={c}>{children}</g></>;
}

// Round-capped tubes (a cactus, a palm trunk, a bridge arch): an ink stroke 6 wider under the coloured one.
function Tubes({ c, parts }: { c: string; parts: readonly (readonly [string, number])[] }) {
    return (
        <>
            {parts.map(([d, w], i) => <path key={`o${i}`} className="rc-tube-ol" d={d} strokeWidth={w + 6} />)}
            {parts.map(([d, w], i) => <path key={`f${i}`} className={`rc-tube ${c}`} d={d} strokeWidth={w} />)}
        </>
    );
}

function Strip({ kind, par, children }: { kind: keyof typeof COUNT; par: number; children: ReactNode }) {
    return (
        <div className={`rc-layer rc-${kind}`} aria-hidden>
            <div className="rc-strip" data-par={par}>
                {Array.from({ length: COUNT[kind] }, (_, k) => <div key={k} className="rc-tile">{children}</div>)}
            </div>
        </div>
    );
}

// ── Sky kit: a proper puffy cloud, a sun with rays, a crescent moon, twinkling stars ────────────────────────
// Flat bottom, five bumps; the lower band a shade darker.
const CLOUD_D = 'M24 84 A18 18 0 0 1 30 52 A28 28 0 0 1 78 30 A32 32 0 0 1 138 34 A22 22 0 0 1 172 58 A14 14 0 0 1 176 84 Z';
export function Cloud({ x, y, s, dark = false }: { x: number; y: number; s: number; dark?: boolean }) {
    return (
        <g transform={`translate(${x} ${y}) scale(${s})`} className={`rc-cloud${dark ? ' is-dark' : ''}`}>
            <path className="rc-cloud-fill" d={CLOUD_D} />
            <path className="rc-cloud-shade" d="M30 84 Q26 72 40 70 Q100 80 160 70 Q176 72 172 84 Z" />
            <path className="rc-cloud-line" d={CLOUD_D} />
        </g>
    );
}

export function Sun({ className = '' }: { className?: string }) {
    return (
        <svg className={`rc-sun ${className}`} viewBox="-60 -60 120 120" aria-hidden>
            <g className="rc-sun-rays">
                {Array.from({ length: 12 }, (_, i) => (
                    <g key={i} transform={`rotate(${i * 30})`}>
                        <path className="rc-ray-ol" d="M0 -38 L0 -52" />
                        <path className="rc-ray" d="M0 -38 L0 -52" />
                    </g>
                ))}
            </g>
            <circle className="rc-sun-disc" r="30" />
            <path className="rc-sun-shine" d="M-16 -12 A20 20 0 0 1 -4 -22" />
        </svg>
    );
}

function Moon() {
    const id = `rc-moon-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
    return (
        <svg className="rc-moon" viewBox="0 0 100 100" aria-hidden>
            <mask id={`${id}m`}>
                <rect width="100" height="100" fill="white" />
                <circle cx="68" cy="38" r="34" fill="black" />
            </mask>
            <clipPath id={`${id}c`}><circle cx="50" cy="50" r="40" /></clipPath>
            {/* The crescent: the disc minus a circle; its inner edge drawn as that circle, clipped to the disc. */}
            <circle className="rc-moon-disc" cx="50" cy="50" r="40" mask={`url(#${id}m)`} />
            <circle className="rc-moon-inner" cx="68" cy="38" r="34" clipPath={`url(#${id}c)`} />
            <circle className="rc-moon-crater" cx="30" cy="62" r="5" />
            <circle className="rc-moon-crater" cx="42" cy="80" r="3.5" />
        </svg>
    );
}

const STAR_D = 'M0 -8 Q1 -1 8 0 Q1 1 0 8 Q-1 1 -8 0 Q-1 -1 0 -8 Z';
// Star spots in % of the sky: never under the HUD's first row, never one per tile (they stay put).
const STARS = [[8, 30, 1], [16, 14, .7], [24, 40, .8], [33, 22, 1.1], [41, 9, .6], [47, 34, .8], [55, 18, 1], [62, 42, .7], [69, 12, .9], [76, 30, .7], [84, 20, 1], [92, 38, .8], [12, 52, .6], [52, 50, .6], [88, 54, .7]] as const;
function Stars() {
    return (
        <div className="rc-stars" aria-hidden>
            {STARS.map(([x, y, s], i) => (
                <svg key={i} className="rc-star" viewBox="-10 -10 20 20" style={{ left: `${x}%`, top: `${y}%`, width: `calc(var(--rc-u) * ${Math.round(18 * s)})`, animationDelay: `${(i % 5) * 0.4}s` }}>
                    <path d={STAR_D} />
                </svg>
            ))}
        </div>
    );
}

type CloudSpot = readonly [x: number, y: number, s: number];
function Clouds({ spots, dark = false }: { spots: readonly CloudSpot[]; dark?: boolean }) {
    return (
        <Strip kind="clouds" par={0.04}>
            <svg viewBox={`0 0 ${CLOUD_W} 220`}>
                {spots.map(([x, y, s], i) => <Cloud key={i} x={x} y={y} s={s} dark={dark} />)}
            </svg>
        </Strip>
    );
}

// Far tiles stretch to the layer's height (preserveAspectRatio none): hills and skylines, outlines that never scale.
function Far({ children }: { children: ReactNode }) {
    return <Strip kind="far" par={0.18}><svg viewBox={`0 0 ${FAR_W} 260`} preserveAspectRatio="none">{children}</svg></Strip>;
}
function Mid({ children }: { children: ReactNode }) {
    return <Strip kind="mid" par={0.5}><svg viewBox={`0 0 ${MID_W} 140`}>{children}</svg></Strip>;
}
function Near({ children }: { children: ReactNode }) {
    return <Strip kind="near" par={1}><svg viewBox={`0 0 ${NEAR_W} 160`}>{children}</svg></Strip>;
}

// A ridge: the filled shape and its top line apart, so the tile's side edges get no stroke.
function Ridge({ c, top }: { c: string; top: string }) {
    return <><path className={c} d={`M0 260 L${top.slice(1)} L${FAR_W} 260 Z`} /><path className="rc-ridge-line" d={top} /></>;
}

// ── Platteland: rolling hills, a barn, round trees, hay bales, a fence ──────────────────────────────────────
function RoundTree({ x, s = 1, c = 'rc-leaf' }: { x: number; s?: number; c?: string }) {
    return (
        <g transform={`translate(${x} 140) scale(${s})`}>
            <Ol c="rc-trunk"><rect x="-6" y="-54" width="12" height="54" rx="3" /></Ol>
            <Ol c={c}><circle cx="0" cy="-78" r="32" /><circle cx="-26" cy="-58" r="22" /><circle cx="26" cy="-58" r="22" /></Ol>
            <path className="rc-leaf-shine" d="M-14 -94 A20 20 0 0 1 4 -104" />
        </g>
    );
}

function Platteland() {
    return (
        <>
            <Clouds spots={[[60, 40, .9], [520, 90, .6], [880, 20, 1.1], [1220, 70, .7]]} />
            <Far>
                <Ridge c="rc-hill-back" top="M0 150 Q120 90 250 140 Q380 190 520 120 Q660 60 800 130 Q900 170 1000 150" />
                <Ridge c="rc-hill-front" top="M0 210 Q150 160 320 200 Q480 240 640 190 Q800 150 1000 210" />
                <path className="rc-field-line" d="M380 224 Q470 214 560 222 M700 176 Q780 168 860 186" />
            </Far>
            <Mid>
                <RoundTree x={90} />
                <g>
                    <Ol c="rc-barn"><rect x="300" y="74" width="120" height="66" /></Ol>
                    <Ol c="rc-barn-roof"><path d="M290 78 L360 32 L430 78 Z" /></Ol>
                    <rect className="rc-barn-door" x="340" y="98" width="40" height="42" />
                    <path className="rc-barn-x" d="M340 98 L380 140 M380 98 L340 140" />
                    <rect className="rc-barn-door" x="350" y="52" width="20" height="16" />
                </g>
                <g>
                    <Ol c="rc-hay"><circle cx="476" cy="122" r="18" /><circle cx="514" cy="126" r="14" /></Ol>
                    <path className="rc-hay-line" d="M476 122 m-10 0 a10 10 0 1 1 10 10 M514 126 m-7 0 a7 7 0 1 1 7 7" />
                </g>
                <RoundTree x={650} s={.9} c="rc-leaf-2" />
                <Ol c="rc-leaf"><circle cx="772" cy="128" r="14" /><circle cx="792" cy="120" r="18" /><circle cx="814" cy="129" r="12" /></Ol>
                {[30, 160, 240, 560, 600, 720, 860].map((x, i) => <circle key={x} className={i % 2 ? 'rc-flower' : 'rc-flower is-2'} cx={x} cy={134 - (i % 3) * 2} r="4" />)}
            </Mid>
            <Near>
                <rect className="rc-fence" x="0" y="118" width={NEAR_W} height="8" />
                <rect className="rc-fence" x="0" y="136" width={NEAR_W} height="8" />
                {[40, 160, 280, 400].map(x => <rect key={x} className="rc-fence" x={x} y="104" width="12" height="56" rx="3" />)}
            </Near>
        </>
    );
}

// ── Woestijn: mesas, saguaro cactussen, rocks, a tumbleweed ─────────────────────────────────────────────────
function Saguaro({ x, s = 1 }: { x: number; s?: number }) {
    return (
        <g transform={`translate(${x} 140) scale(${s})`}>
            <Tubes c="rc-cactus" parts={[['M0 -8 L0 -100', 26], ['M0 -44 L-22 -44 Q-30 -44 -30 -52 L-30 -74', 16], ['M0 -60 L22 -60 Q30 -60 30 -68 L30 -90', 16]]} />
            <path className="rc-cactus-rib" d="M-6 -96 L-6 -12 M6 -96 L6 -12" />
        </g>
    );
}

function Woestijn() {
    return (
        <>
            <Clouds spots={[[300, 60, .5], [1000, 30, .45]]} />
            <Far>
                <Ridge c="rc-mesa" top="M0 200 L60 200 L80 140 L210 140 L232 200 L420 200 L440 160 L520 160 L545 210 L700 210 L720 120 L860 120 L885 200 L1000 200" />
                <path className="rc-mesa-line" d="M84 162 L218 162 M444 180 L528 180 M726 146 L866 146 M730 172 L874 172" />
                <Ridge c="rc-dune" top="M0 230 Q250 200 500 235 Q750 265 1000 230" />
            </Far>
            <Mid>
                <Saguaro x={120} />
                <g>
                    <Ol c="rc-cactus"><ellipse cx="300" cy="122" rx="18" ry="20" /></Ol>
                    <path className="rc-cactus-rib" d="M294 106 L294 138 M306 106 L306 138" />
                    <Ol c="rc-bloom"><circle cx="300" cy="100" r="7" /></Ol>
                </g>
                <Ol c="rc-rock"><path d="M390 140 Q392 112 418 110 Q446 108 452 140 Z" /><path d="M456 140 Q460 124 472 124 Q484 124 486 140 Z" /></Ol>
                <Saguaro x={630} s={.78} />
                <g>
                    <Ol c="rc-weed"><circle cx="790" cy="124" r="16" /></Ol>
                    <path className="rc-weed-line" d="M778 118 Q790 108 802 120 Q794 134 782 128 Q786 116 798 116 M780 130 Q792 138 800 126" />
                </g>
            </Mid>
            <Near>
                <Ol c="rc-rock"><ellipse cx="60" cy="154" rx="14" ry="7" /><ellipse cx="330" cy="155" rx="10" ry="5" /></Ol>
                <path className="rc-tuft" d="M200 160 L196 142 M204 160 L206 140 M208 160 L216 146" />
            </Near>
        </>
    );
}

// ── Sneeuw: snowy mountains, pine trees with snow caps, a snowman, snow falling ─────────────────────────────
function Pine({ x, s = 1 }: { x: number; s?: number }) {
    const tiers = [[35, 16, 60], [28, 46, 88], [20, 74, 112]] as const;
    return (
        <g transform={`translate(${x} 140) scale(${s})`}>
            <Ol c="rc-trunk"><rect x="-6" y="-20" width="12" height="20" /></Ol>
            <Ol c="rc-pine">{tiers.map(([w, b, t]) => <path key={t} d={`M${-w} ${-b} L0 ${-t} L${w} ${-b} Z`} />)}</Ol>
            {tiers.map(([w, b, t]) => (
                <path key={t} className="rc-snowcap" d={`M0 ${-t} L${w * .42} ${-t + (t - b) * .42} Q${w * .2} ${-t + (t - b) * .34} 0 ${-t + (t - b) * .44} Q${-w * .2} ${-t + (t - b) * .34} ${-w * .42} ${-t + (t - b) * .42} Z`} />
            ))}
            <path className="rc-snow-ledge" d={`M${-35} -16 Q0 -10 35 -16`} />
        </g>
    );
}

function Sneeuw() {
    return (
        <>
            <Clouds spots={[[40, 20, 1.2], [600, 50, .9], [1080, 10, 1.1]]} />
            <Far>
                <Ridge c="rc-mtn" top="M0 190 L140 70 L250 170 L380 40 L520 180 L640 90 L780 190 L880 110 L1000 190" />
                <path className="rc-mtn-snow" d="M140 70 L104 103 L120 98 L132 110 L146 98 L166 94 Z M380 40 L334 87 L352 80 L366 94 L384 82 L410 76 Z M640 90 L606 121 L622 116 L634 126 L648 116 L670 118 Z M880 110 L852 135 L866 130 L876 140 L888 130 L904 130 Z" />
                <Ridge c="rc-snowfield" top="M0 236 Q250 220 500 238 Q750 254 1000 236" />
            </Far>
            <Mid>
                <Pine x={60} />
                <Pine x={170} s={.8} />
                <g>
                    <Ol c="rc-snowman"><circle cx="300" cy="118" r="22" /><circle cx="300" cy="84" r="15" /></Ol>
                    <Ol c="rc-hat"><rect x="282" y="68" width="36" height="5" rx="2" /><rect x="289" y="52" width="22" height="18" rx="2" /></Ol>
                    <path className="rc-carrot" d="M303 85 L320 88 L303 91 Z" />
                    <circle className="rc-dot" cx="295" cy="80" r="2" /><circle className="rc-dot" cx="306" cy="80" r="2" />
                    <circle className="rc-dot" cx="300" cy="110" r="2.5" /><circle className="rc-dot" cx="300" cy="122" r="2.5" />
                    <path className="rc-scarf" d="M287 96 Q300 103 313 96 L312 102 Q300 108 288 102 Z M306 101 L312 116 L318 113 L311 100 Z" />
                </g>
                <Pine x={430} s={1.1} />
                <Pine x={530} s={.85} />
                <Ol c="rc-snowbank"><ellipse cx="640" cy="138" rx="40" ry="10" /></Ol>
                <Pine x={760} />
                <Pine x={850} s={.7} />
            </Mid>
            <Near>
                <path className="rc-snowbank" d={`M0 160 L0 150 Q60 142 120 150 Q180 156 240 148 Q300 142 360 150 Q420 156 ${NEAR_W} 150 L${NEAR_W} 160 Z`} />
                <path className="rc-ridge-line" d={`M0 150 Q60 142 120 150 Q180 156 240 148 Q300 142 360 150 Q420 156 ${NEAR_W} 150`} />
                {[90, 330].map(x => (
                    <g key={x}>
                        <rect className="rc-post" x={x} y="104" width="10" height="48" rx="2" />
                        <rect className="rc-post-band" x={x} y="112" width="10" height="10" />
                    </g>
                ))}
            </Near>
        </>
    );
}

// ── Stad bij nacht: a skyline with lit windows, houses, street lanterns, the moon and stars ────────────────
// [x, width, height] of the far skyline; windows lit by a fixed pattern (no randomness: the tiles must match).
const SKYLINE = [[0, 90, 120], [96, 60, 180], [160, 104, 100], [270, 70, 210], [346, 96, 150], [448, 58, 120], [512, 86, 190], [604, 116, 110], [726, 66, 170], [798, 104, 130], [908, 62, 200]] as const;
function Skyline() {
    return (
        <>
            {SKYLINE.map(([x, w, h], i) => {
                const top = 260 - h;
                const cols = Math.floor((w - 12) / 16);
                const rows = Math.floor((h - 20) / 22);
                return (
                    <g key={x}>
                        <rect className="rc-bld" x={x} y={top} width={w} height={h} />
                        <path className="rc-bld-line" d={`M${x} 260 L${x} ${top} L${x + w} ${top} L${x + w} 260`} />
                        {i % 3 === 1 && <path className="rc-bld-line" d={`M${x + w / 2} ${top} L${x + w / 2} ${top - 20}`} />}
                        {Array.from({ length: rows * cols }, (_, k) => {
                            const r = Math.floor(k / cols), c = k % cols;
                            return (k * 7 + i * 3) % 5 < 2
                                ? <rect key={k} className="rc-window" x={x + 10 + c * 16} y={top + 12 + r * 22} width="8" height="11" />
                                : null;
                        })}
                    </g>
                );
            })}
        </>
    );
}

function House({ x, w, h, roof = false, i }: { x: number; w: number; h: number; roof?: boolean; i: number }) {
    const top = 140 - h;
    return (
        <g>
            <Ol c="rc-house">
                <rect x={x} y={top} width={w} height={h} />
                {roof && <path d={`M${x - 6} ${top + 2} L${x + w / 2} ${top - 30} L${x + w + 6} ${top + 2} Z`} />}
            </Ol>
            {Array.from({ length: Math.floor((w - 16) / 26) }, (_, c) => [0, 1].map(r => (
                (c + r + i) % 3 !== 0 && <rect key={`${c}${r}`} className="rc-window is-near" x={x + 12 + c * 26} y={top + 12 + r * 30} width="14" height="18" rx="2" />
            )))}
            <rect className="rc-door" x={x + w / 2 - 9} y="114" width="18" height="26" rx="3" />
        </g>
    );
}

function Stad() {
    return (
        <>
            <Stars />
            <Far><Skyline /></Far>
            <Mid>
                <House x={0} w={150} h={104} i={0} />
                <House x={176} w={120} h={74} roof i={1} />
                <House x={330} w={140} h={112} i={2} />
                <House x={500} w={110} h={80} roof i={3} />
                <House x={640} w={130} h={100} i={4} />
                <House x={800} w={86} h={66} roof i={5} />
            </Mid>
            <Near>
                {[120, 360].map(x => (
                    <g key={x}>
                        <circle className="rc-glow" cx={x + 22} cy="44" r="34" />
                        <circle className="rc-glow is-in" cx={x + 22} cy="44" r="18" />
                        <Ol c="rc-pole"><rect x={x - 4} y="36" width="8" height="124" rx="3" /><rect x={x - 4} y="30" width="30" height="7" rx="3" /></Ol>
                        <Ol c="rc-lamp"><path d={`M${x + 12} 36 L${x + 32} 36 L${x + 28} 50 L${x + 16} 50 Z`} /></Ol>
                    </g>
                ))}
            </Near>
        </>
    );
}

// ── Strand: the sea with a sailboat and an island, palm trees, a parasol, a sandcastle ─────────────────────
function Palm({ x, s = 1, flip = false }: { x: number; s?: number; flip?: boolean }) {
    const fronds = ['M0 0 Q30 -22 64 4 Q34 -6 0 8 Z', 'M0 0 Q-30 -22 -64 4 Q-34 -6 0 8 Z', 'M0 0 Q20 -34 50 -36 Q26 -22 4 6 Z', 'M0 0 Q-20 -34 -50 -36 Q-26 -22 -4 6 Z', 'M0 0 Q40 6 58 32 Q30 14 2 8 Z'];
    return (
        <g transform={`translate(${x} 140) scale(${flip ? -s : s} ${s})`}>
            <Tubes c="rc-palm-trunk" parts={[['M0 0 Q-8 -40 10 -96', 14]]} />
            <path className="rc-palm-ring" d="M-7 -20 L7 -22 M-6 -42 L8 -44 M-2 -64 L11 -64 M4 -84 L15 -82" />
            <g transform="translate(10 -96)">
                <Ol c="rc-palm-leaf">{fronds.map(d => <path key={d} d={d} />)}</Ol>
                <Ol c="rc-coco"><circle cx="-4" cy="8" r="6" /><circle cx="7" cy="9" r="6" /></Ol>
            </g>
        </g>
    );
}

function Strand() {
    return (
        <>
            <Clouds spots={[[120, 50, .8], [700, 90, .55], [1100, 30, .9]]} />
            <svg className="rc-gulls" viewBox="0 0 200 60" aria-hidden><path d="M10 30 Q20 20 30 30 Q40 20 50 30 M120 14 Q128 6 136 14 Q144 6 152 14 M160 44 Q166 38 172 44 Q178 38 184 44" /></svg>
            <Far>
                <path className="rc-sea" d="M0 260 L0 150 L1000 150 L1000 260 Z" />
                <path className="rc-ridge-line" d="M0 150 L1000 150" />
                <path className="rc-wave" d="M40 180 q10 -8 20 0 q10 8 20 0 M420 196 q10 -8 20 0 q10 8 20 0 M820 176 q10 -8 20 0 q10 8 20 0 M600 210 q10 -8 20 0" />
                <path className="rc-island" d="M640 150 Q700 118 760 150 Z" />
                <path className="rc-ridge-line" d="M640 150 Q700 118 760 150" />
                <path className="rc-ridge-line is-thin" d="M700 134 Q698 116 708 104 M708 104 Q696 100 688 106 M708 104 Q720 98 728 104" />
                <path className="rc-hull" d="M270 168 L330 168 L320 180 L280 180 Z" />
                <path className="rc-sail" d="M302 128 L302 164 L330 164 Z" />
                <path className="rc-ridge-line" d="M270 168 L330 168 L320 180 L280 180 Z M300 168 L300 126 M302 128 L302 164 L330 164 Z" />
                <Ridge c="rc-sand-far" top="M0 232 Q250 220 500 232 Q750 244 1000 232" />
            </Far>
            <Mid>
                <Palm x={110} />
                <g>
                    <path className="rc-pole-line" d="M330 140 L330 74" />
                    <Ol c="rc-parasol"><path d="M286 78 Q330 30 374 78 Z" /></Ol>
                    <path className="rc-parasol-stripe" d="M316 78 Q322 46 330 39 Q338 46 344 78 Z" />
                </g>
                <g>
                    <Ol c="rc-castle">
                        <rect x="446" y="110" width="64" height="30" />
                        <rect x="452" y="92" width="18" height="20" /><rect x="486" y="92" width="18" height="20" />
                    </Ol>
                    <path className="rc-castle-line" d="M452 92 L452 86 L458 86 L458 92 M464 92 L464 86 L470 86 L470 92 M486 92 L486 86 L492 86 L492 92 M498 92 L498 86 L504 86 L504 92 M495 92 L495 74" />
                    <path className="rc-flag" d="M495 74 L509 79 L495 84 Z" />
                    <path className="rc-door" d="M472 140 L472 126 Q478 118 484 126 L484 140 Z" />
                </g>
                <Palm x={660} s={.85} flip />
                <g>
                    <Ol c="rc-ball"><circle cx="810" cy="126" r="14" /></Ol>
                    <path className="rc-ball-stripe" d="M810 112 Q800 126 810 140 L816 139 Q808 126 816 113 Z" />
                    <path className="rc-ball-stripe is-2" d="M824 124 Q812 120 800 116 L798 122 Q812 126 823 131 Z" />
                </g>
            </Mid>
            <Near>
                <path className="rc-tuft" d="M60 160 L54 140 M64 160 L66 136 M68 160 L78 144 M300 160 L296 146 M304 160 L308 142" />
                <path className="rc-shell" d="M180 160 Q186 148 192 160 Z" />
            </Near>
        </>
    );
}

// ── Herfst: misty hills, orange and yellow trees, mushrooms, leaves, rain ───────────────────────────────────
function Herfst() {
    return (
        <>
            <Clouds dark spots={[[0, 10, 1.3], [380, 40, 1.1], [760, 0, 1.4], [1120, 50, 1.1]]} />
            <Far>
                <Ridge c="rc-hill-back" top="M0 160 Q150 100 320 150 Q500 200 680 130 Q840 80 1000 160" />
                <Ridge c="rc-hill-front" top="M0 214 Q200 180 420 212 Q640 244 1000 214" />
            </Far>
            <Mid>
                <RoundTree x={90} c="rc-leaf" />
                <g>
                    <Ol c="rc-trunk"><rect x="294" y="80" width="12" height="60" rx="3" /></Ol>
                    <Ol c="rc-leaf-2"><ellipse cx="300" cy="64" rx="28" ry="44" /></Ol>
                </g>
                <g>
                    <Ol c="rc-mush"><path d="M196 124 Q210 104 224 124 Z" /></Ol>
                    <Ol c="rc-mush-stem"><rect x="206" y="124" width="8" height="16" rx="2" /></Ol>
                    <circle className="rc-dot is-light" cx="206" cy="117" r="2.5" /><circle className="rc-dot is-light" cx="216" cy="114" r="2" />
                </g>
                <Ol c="rc-leafpile"><path d="M380 140 Q384 122 404 124 Q414 112 428 124 Q448 122 452 140 Z" /></Ol>
                <RoundTree x={540} s={1.05} c="rc-leaf-3" />
                <g>
                    <Ol c="rc-mush"><path d="M656 126 Q666 112 676 126 Z" /></Ol>
                    <Ol c="rc-mush-stem"><rect x="663" y="126" width="6" height="14" rx="2" /></Ol>
                </g>
                <RoundTree x={770} s={.85} c="rc-leaf-2" />
            </Mid>
            <Near>
                <Ol c="rc-leafpile"><path d="M100 160 Q104 148 118 150 Q126 142 136 150 Q148 150 150 160 Z" /></Ol>
                {[[250, 154], [262, 158], [380, 156]].map(([x, y]) => <ellipse key={x} className="rc-fallen" cx={x} cy={y} rx="6" ry="3" />)}
            </Near>
        </>
    );
}

const ART: Record<Land, () => ReactNode> = { platteland: Platteland, woestijn: Woestijn, sneeuw: Sneeuw, stad: Stad, strand: Strand, herfst: Herfst };
// Who has a sun or a moon, and which weather falls in front of the scene.
const SUN: readonly Land[] = ['platteland', 'woestijn', 'strand'];
const WEATHER: Partial<Record<Land, 'snow' | 'rain'>> = { sneeuw: 'snow', herfst: 'rain' };

/** One landscape: its sky, sun or moon and its strips. Memo: it only changes with the land. */
export const Landscape = memo(function Landscape({ land, leaving }: { land: Land; leaving: boolean }) {
    const Art = ART[land];
    return (
        <div className={`rc-land${leaving ? ' is-leaving' : ''}`} data-land={land}>
            <div className="rc-sky" />
            {SUN.includes(land) && <Sun />}
            {land === 'stad' && <Moon />}
            <Art />
        </div>
    );
});

// Flakes, drops and leaves: fixed spots (% across), each its own speed and delay; CSS makes them fall.
const FLAKES = Array.from({ length: 34 }, (_, i) => ({ x: (i * 37) % 100, d: 4 + (i * 7) % 5, delay: -((i * 13) % 40) / 5, s: 5 + (i * 3) % 6 }));
const DROPS = Array.from({ length: 40 }, (_, i) => ({ x: (i * 41) % 104, d: 0.6 + ((i * 7) % 5) / 10, delay: -((i * 17) % 30) / 20, s: 16 + (i * 5) % 12 }));
const LEAVES = [0, 1, 2, 3, 4].map(i => ({ x: 10 + i * 19, d: 6 + i % 3, delay: -i * 1.7, s: 12 }));

/** The weather in front of the whole scene, road included (snow, rain with a few falling leaves). */
export const Weather = memo(function Weather({ land }: { land: Land }) {
    const w = WEATHER[land];
    if (!w) return null;
    const bits = w === 'snow' ? FLAKES.map(f => ({ ...f, c: 'rc-flake' })) : [...DROPS.map(f => ({ ...f, c: 'rc-drop' })), ...LEAVES.map(f => ({ ...f, c: 'rc-fall-leaf' }))];
    return (
        <div className={`rc-weather is-${w}`} aria-hidden>
            {bits.map((b, i) => (
                <span key={i} className={b.c} style={{ left: `${b.x}%`, '--y': `${(i * i * 7 + i * 13) % 88}%`, animationDuration: `${b.d}s`, animationDelay: `${b.delay}s`, '--s': b.s } as CSSProperties} />
            ))}
        </div>
    );
});

// A small picture of a landscape for the gate's sign: what comes next.
export function LandIcon({ land }: { land: Land }) {
    return (
        <g className="rc-icon">
            {land === 'platteland' && <><circle className="rc-sun-disc" cx="-14" cy="-12" r="12" /><path className="rc-hill-front rc-icon-line" d="M-34 20 Q-14 -8 6 12 Q20 -2 34 20 Z" /></>}
            {land === 'woestijn' && <Tubes c="rc-cactus" parts={[['M0 22 L0 -22', 12], ['M0 2 L-12 2 L-12 -10', 8], ['M0 -6 L12 -6 L12 -16', 8]]} />}
            {land === 'sneeuw' && <path className="rc-icon-flake" d="M0 -24 L0 24 M-21 -12 L21 12 M-21 12 L21 -12 M-6 -20 L0 -14 L6 -20 M-6 20 L0 14 L6 20" />}
            {land === 'stad' && <><path className="rc-moon-disc rc-icon-line" d="M6 -22 A22 22 0 1 0 22 8 A16 16 0 1 1 6 -22 Z" /><path className="rc-star-fill" d={STAR_D} transform="translate(-14 -14) scale(.9)" /></>}
            {land === 'strand' && <g transform="translate(-4 -35) scale(.42)"><Palm x={0} /></g>}
            {land === 'herfst' && <><path className="rc-leaf-3 rc-icon-line" d="M-18 18 Q-22 -14 18 -20 Q20 14 -18 18 Z" /><path className="rc-icon-vein" d="M-18 18 L10 -10" /></>}
        </g>
    );
}
