import type { CSSProperties, ReactNode } from 'react';
import type { PresentLook, ToyKind } from './presents';
import { needleAngle, NEEDLE_SWEEP, PRESSURE, type PressureMood } from './pressure';

// The Speelgoedfabriek's drawings: presents, toys, the wrapping machine with its pressure gauge, the crate,
// the robot arm, gears and lamps. Flat fills under the --spel-ink outline (pakjesband.css), no numbers anywhere.

interface Placed { x?: number; y?: number; width?: number; height?: number; className?: string; style?: CSSProperties }

/** An inline svg, or a nested one when x / y / width / height place it inside another drawing (the end screen). */
function Art({ viewBox, children, x, y, width, height, className, style }: Placed & { viewBox: string; children: ReactNode }) {
    return <svg className={className} style={style} viewBox={viewBox} x={x} y={y} width={width} height={height} overflow="visible" aria-hidden>{children}</svg>;
}

// ── Presents ────────────────────────────────────────────────────────────────

const STAR_PATH = (cx: number, cy: number, R: number, r: number) =>
    Array.from({ length: 10 }, (_, i) => {
        const a = (Math.PI / 5) * i;
        const d = i % 2 ? r : R;
        return `${i ? 'L' : 'M'}${(cx + d * Math.sin(a)).toFixed(1)} ${(cy - d * Math.cos(a)).toFixed(1)}`;
    }).join(' ') + ' Z';
const BIG_STAR = STAR_PATH(50, 56, 48, 27);

// The paper of each shape, as plain elements: drawn once filled, once with the pattern, once as the outline.
function paperOf(shape: PresentLook['shape']): ReactNode {
    switch (shape) {
        case 'box': return <><rect x="8" y="34" width="84" height="63" rx="6" /><rect className="pk-lid" x="3" y="24" width="94" height="16" rx="5" /></>;
        case 'tall': return <><rect x="20" y="14" width="60" height="83" rx="6" /><rect className="pk-lid" x="15" y="5" width="70" height="14" rx="5" /></>;
        case 'tin': return <><path d="M5 50 L5 84 A45 13 0 0 0 95 84 L95 50 Z" /><ellipse className="pk-lid" cx="50" cy="50" rx="45" ry="13" /></>;
        case 'tube': return <><path d="M22 18 L22 88 A28 9 0 0 0 78 88 L78 18 Z" /><ellipse className="pk-lid" cx="50" cy="18" rx="28" ry="9" /></>;
        case 'star': return <path d={BIG_STAR} />;
    }
}

function ribbonOf(shape: PresentLook['shape']): ReactNode {
    switch (shape) {
        case 'box': return <><rect x="43" y="24" width="14" height="73" /><rect x="8" y="58" width="84" height="12" /></>;
        case 'tall': return <><rect x="44" y="5" width="12" height="92" /><rect x="20" y="46" width="60" height="11" /></>;
        case 'tin': return <path d="M5 66 A45 13 0 0 0 95 66 L95 77 A45 13 0 0 1 5 77 Z" />;
        case 'tube': return <path d="M22 42 A28 9 0 0 0 78 42 L78 52 A28 9 0 0 1 22 52 Z" />;
        case 'star': return null;
    }
}

// Where the bow sits on each shape (its knot).
const BOW_AT: Record<PresentLook['shape'], [number, number, number]> = { box: [50, 24, 1], tall: [50, 5, .85], tin: [50, 44, .9], tube: [50, 14, .75], star: [50, 9, .7] };

function Pattern({ id, kind }: { id: string; kind: PresentLook['pattern'] }) {
    if (kind === 'plain') return null;
    return (
        <pattern id={id} patternUnits="userSpaceOnUse" width="14" height="14" patternTransform={kind === 'stripes' ? 'rotate(40)' : undefined}>
            {kind === 'stripes' && <rect className="pk-pat" x="0" y="0" width="6" height="14" />}
            {kind === 'dots' && <circle className="pk-pat" cx="7" cy="7" r="3" />}
            {kind === 'zigzag' && <path className="pk-pat-line" d="M-1 10 L3.5 4 L10.5 10 L15 4" />}
            {kind === 'stars' && <path className="pk-pat" d={STAR_PATH(7, 7.5, 5, 2.2)} />}
        </pattern>
    );
}

/** One wrapped present (viewBox 100 × 100, standing on y ≈ 97). */
export function PresentArt({ look, uid, ...placed }: { look: PresentLook; uid: string } & Placed) {
    const [bx, by, bs] = BOW_AT[look.shape];
    const pat = `${uid}-pat`;
    const style = { ...placed.style, '--fill': `var(--spel-fill-${look.fill})`, '--ribbon': `var(--spel-fill-${look.ribbon})` } as CSSProperties;
    return (
        <Art viewBox="0 0 100 100" {...placed} className={`pk-art is-${look.shape}${placed.className ? ` ${placed.className}` : ''}`} style={style}>
            <defs><Pattern id={pat} kind={look.pattern} /></defs>
            {look.shape === 'star' && <path className="pk-depth" d={BIG_STAR} transform="translate(4 3)" />}
            <g className="pk-paper">{paperOf(look.shape)}</g>
            {look.pattern !== 'plain' && <g className="pk-pattern" style={{ fill: `url(#${pat})` }}>{paperOf(look.shape)}</g>}
            <g className="pk-ribbon">{ribbonOf(look.shape)}</g>
            <g className="pk-edge">{paperOf(look.shape)}</g>
            <g className="pk-bow" transform={`translate(${bx} ${by}) scale(${bs})`}>
                <path d="M0 0 C -14 -18, -30 -12, -20 -2 C -14 3, -5 2, 0 0 C 5 2, 14 3, 20 -2 C 30 -12, 14 -18, 0 0 Z" />
                <path d="M-3 1 L-10 13 M3 1 L10 13" className="pk-bow-tail" />
                <circle r="5" />
            </g>
        </Art>
    );
}

// ── Toys (fed into the machine, and popping out when it sputters) ───────────

/** A small toy (viewBox 40 × 40). */
export function ToyArt({ kind, ...placed }: { kind: ToyKind } & Placed) {
    return (
        <Art viewBox="0 0 40 40" {...placed} className={`pk-toy is-${kind}${placed.className ? ` ${placed.className}` : ''}`}>
            {kind === 'teddy' && <>
                <circle className="pk-toy-brown" cx="11" cy="9" r="5" /><circle className="pk-toy-brown" cx="29" cy="9" r="5" />
                <ellipse className="pk-toy-brown" cx="20" cy="30" rx="11" ry="9" />
                <circle className="pk-toy-brown" cx="20" cy="16" r="10" />
                <ellipse className="pk-toy-light" cx="20" cy="19" rx="4.5" ry="3.5" />
                <circle className="pk-toy-ink" cx="16" cy="14" r="1.6" /><circle className="pk-toy-ink" cx="24" cy="14" r="1.6" />
            </>}
            {kind === 'ball' && <>
                <circle className="pk-toy-a" cx="20" cy="21" r="15" />
                <path className="pk-toy-b" d="M7 15 Q20 24 33 15 L35 23 Q20 32 5 23 Z" />
                <circle className="pk-toy-none" cx="20" cy="21" r="15" />
            </>}
            {kind === 'duck' && <>
                <ellipse className="pk-toy-yellow" cx="18" cy="28" rx="15" ry="9" />
                <circle className="pk-toy-yellow" cx="26" cy="14" r="8" />
                <path className="pk-toy-orange" d="M33 14 L40 16 L33 19 Z" />
                <circle className="pk-toy-ink" cx="28" cy="12" r="1.6" />
            </>}
            {kind === 'rocket' && <>
                <path className="pk-toy-orange" d="M12 30 L5 38 L14 36 Z M28 30 L35 38 L26 36 Z" />
                <path className="pk-toy-light" d="M20 2 C29 9 30 22 27 34 L13 34 C10 22 11 9 20 2 Z" />
                <circle className="pk-toy-b" cx="20" cy="17" r="4.5" />
            </>}
            {kind === 'car' && <>
                <path className="pk-toy-a" d="M4 28 L4 20 L11 19 L15 11 L27 11 L31 19 L37 21 L37 28 Z" />
                <path className="pk-toy-light" d="M16.5 13.5 L25.5 13.5 L28 19 L14 19 Z" />
                <circle className="pk-toy-ink" cx="12" cy="29" r="5" /><circle className="pk-toy-ink" cx="30" cy="29" r="5" />
            </>}
            {kind === 'block' && <>
                <path className="pk-toy-b" d="M6 12 L22 6 L36 11 L36 30 L20 36 L6 30 Z" />
                <path className="pk-toy-none" d="M6 12 L20 17 L36 11 M20 17 L20 36" />
                <path className="pk-toy-yellow" d={STAR_PATH(13, 24, 5, 2.3)} />
            </>}
        </Art>
    );
}

// ── The wrapping machine ────────────────────────────────────────────────────

const GAUGE = { cx: 100, cy: 148, r: 46, arc: 34 };
const at = (deg: number, r: number) => {
    const a = (deg * Math.PI) / 180;
    return [GAUGE.cx + r * Math.sin(a), GAUGE.cy - r * Math.cos(a)] as const;
};
const arcPath = (from: number, to: number, r: number) => {
    const [x0, y0] = at(from, r);
    const [x1, y1] = at(to, r);
    return `M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
};
// The zones on the dial, in needle degrees: green until half way, yellow at "warm", orange before the top.
const ZONE_YELLOW = needleAngle(PRESSURE.warm - 0.5);
const ZONE_ORANGE = needleAngle(PRESSURE.max - 1.5);
const TICKS = Array.from({ length: PRESSURE.max + 1 }, (_, p) => needleAngle(p));

const SPIRAL = 'M0 0 C 2 -2, 5 0, 4 3 C 3 7, -3 7, -5 3 C -8 -3, -2 -8, 3 -7 C 9 -6, 11 1, 9 6';

function Eye({ x, mood }: { x: number; mood: PressureMood | 'happy' }) {
    const y = 88;
    if (mood === 'burst') return <g transform={`translate(${x} ${y})`}><circle className="pk-eye" r="16" /><path className="pk-spiral" d={SPIRAL} /></g>;
    if (mood === 'happy') return <path className="pk-happy-eye" d={`M${x - 11} ${y + 3} Q${x} ${y - 12} ${x + 11} ${y + 3}`} />;
    return (
        <g>
            <circle className="pk-eye" cx={x} cy={y} r="16" />
            <circle className="pk-pupil" cx={x + 4} cy={y + 5} r="7" />
            <circle className="pk-glint" cx={x + 6} cy={y + 2} r="2" />
        </g>
    );
}

/** The machine's head (viewBox 200 × 200): the hopper, the valve, the lamp, two eyes and the pressure gauge. */
export function MachineHead({ pressure, mood, ...placed }: { pressure: number; mood: PressureMood | 'happy' } & Placed) {
    const worried = mood === 'warm' || mood === 'high';
    return (
        <Art viewBox="0 0 200 200" {...placed} className={`pk-head is-${mood}${placed.className ? ` ${placed.className}` : ''}`}>
            {/* The valve pipe, where the steam comes out. */}
            <rect className="pk-metal" x="158" y="16" width="20" height="36" />
            <rect className="pk-metal-dark" x="152" y="8" width="32" height="11" rx="3" />
            {/* The hopper the toys drop into. */}
            <path className="pk-hopper" d="M26 10 L138 10 L114 50 L50 50 Z" />
            <path className="pk-hopper-in" d="M44 16 L120 16 L108 36 L56 36 Z" />
            <rect className="pk-hopper-rim" x="20" y="2" width="124" height="12" rx="5" />
            {/* The head itself, open at the bottom: the body (pakjesband.css) carries on under it. */}
            <path className="pk-machine-fill" d="M4 202 L4 64 Q4 46 22 46 L178 46 Q196 46 196 64 L196 202 Z" />
            <path className="pk-machine-line" d="M4 202 L4 64 Q4 46 22 46 L178 46 Q196 46 196 64 L196 202" />
            <circle className="pk-rivet" cx="16" cy="58" r="3" /><circle className="pk-rivet" cx="184" cy="58" r="3" />
            {/* The warning lamp: dim when calm, blinking when the pressure is high. */}
            <path className="pk-lamp-dome" d="M14 46 A12 12 0 0 1 38 46 Z" />
            <Eye x={62} mood={mood} />
            <Eye x={138} mood={mood} />
            {worried && <path className="pk-brow" d="M46 70 L74 62 M154 70 L126 62" />}
            {mood === 'high' && <path className="pk-sweat" d="M186 74 C 180 84, 182 92, 187 92 C 192 92, 193 84, 186 74 Z" />}
            {/* The pressure gauge: green, yellow, orange; ticks only. */}
            <circle className="pk-gauge" cx={GAUGE.cx} cy={GAUGE.cy} r={GAUGE.r} />
            <path className="pk-zone is-green" d={arcPath(-NEEDLE_SWEEP, ZONE_YELLOW, GAUGE.arc)} />
            <path className="pk-zone is-yellow" d={arcPath(ZONE_YELLOW, ZONE_ORANGE, GAUGE.arc)} />
            <path className="pk-zone is-orange" d={arcPath(ZONE_ORANGE, NEEDLE_SWEEP, GAUGE.arc)} />
            {TICKS.map(t => {
                const [x0, y0] = at(t, GAUGE.arc - 8);
                const [x1, y1] = at(t, GAUGE.arc - 14);
                return <path key={t} className="pk-tick" d={`M${x0.toFixed(1)} ${y0.toFixed(1)} L${x1.toFixed(1)} ${y1.toFixed(1)}`} />;
            })}
            <g className="pk-needle" style={{ transform: `rotate(${needleAngle(pressure)}deg)`, transformOrigin: `${GAUGE.cx}px ${GAUGE.cy}px` }}>
                <path d={`M${GAUGE.cx - 4} ${GAUGE.cy} L${GAUGE.cx} ${GAUGE.cy - 36} L${GAUGE.cx + 4} ${GAUGE.cy} Z`} />
            </g>
            <circle className="pk-hub" cx={GAUGE.cx} cy={GAUGE.cy} r="7" />
        </Art>
    );
}

// ── The crate, the robot arm, the bin, gears and lamps ──────────────────────

/** The shipping crate's back (the dark inside, and the presents already in it); viewBox 125 × 100. */
export function CrateBack({ pile, ...placed }: { pile: number } & Placed) {
    // Up to eight presents peek out of the crate, filling it from the middle.
    const spots: [number, number, number][] = [[50, 30, 0], [76, 32, 1], [26, 33, 2], [62, 20, 3], [38, 21, 4], [90, 25, 5], [12, 26, 0], [50, 10, 1]];
    return (
        <Art viewBox="0 0 125 100" {...placed} className={`pk-crate-back${placed.className ? ` ${placed.className}` : ''}`}>
            <path className="pk-crate-inside" d="M6 30 L119 30 L112 46 L13 46 Z" />
            {spots.slice(0, Math.min(pile, spots.length)).map(([x, y, f], i) => (
                <g key={i} className="pk-pile" style={{ '--fill': `var(--spel-fill-${(f + i) % 6})` } as CSSProperties}>
                    <rect x={x - 10} y={y} width="20" height="18" rx="3" />
                    <path className="pk-pile-ribbon" d={`M${x} ${y} L${x} ${y + 18}`} />
                </g>
            ))}
        </Art>
    );
}

/** The crate's front planks, drawn over a present landing in it. */
export function CrateFront(placed: Placed) {
    return (
        <Art viewBox="0 0 125 100" {...placed} className={`pk-crate-front${placed.className ? ` ${placed.className}` : ''}`}>
            <path className="pk-wood" d="M4 44 L121 44 L114 98 L11 98 Z" />
            <path className="pk-wood-line" d="M8 62 L117 62 M10 80 L115 80" />
            <path className="pk-wood-dark" d="M4 44 L121 44 L119 52 L6 52 Z" />
            <path className="pk-wood-cross" d="M16 56 L106 94 M106 56 L16 94" />
            {/* A star on the side: the factory's mark. */}
            <path className="pk-crate-star" d={STAR_PATH(62.5, 77, 11, 5)} />
        </Art>
    );
}

/** A friendly robot arm with one big eye (viewBox 120 × 150), base on the floor. */
export function RobotArm(placed: Placed) {
    return (
        <Art viewBox="0 0 120 150" {...placed} className={`pk-robot${placed.className ? ` ${placed.className}` : ''}`}>
            <rect className="pk-metal-dark" x="10" y="132" width="56" height="16" rx="6" />
            <g className="pk-robot-lower">
                <rect className="pk-robot-paint" x="30" y="70" width="16" height="66" rx="8" />
                <circle className="pk-metal" cx="38" cy="72" r="10" />
                <g className="pk-robot-upper">
                    <rect className="pk-robot-paint" x="34" y="62" width="62" height="15" rx="7.5" transform="rotate(-38 38 72)" />
                    <circle className="pk-metal" cx="86" cy="38" r="9" />
                    <g className="pk-robot-hand">
                        <circle className="pk-robot-face" cx="92" cy="22" r="17" />
                        <circle className="pk-eye" cx="92" cy="20" r="8" />
                        <circle className="pk-pupil" cx="90" cy="22" r="4" />
                        <path className="pk-robot-smile" d="M85 31 Q92 36 99 31" />
                        <path className="pk-metal-line" d="M92 5 L92 -4" />
                        <circle className="pk-robot-tip" cx="92" cy="-6" r="4" />
                    </g>
                </g>
            </g>
        </Art>
    );
}

/** The bin under the belt's end, for presents nobody picked (viewBox 100 × 80). */
export function Bin(placed: Placed) {
    return (
        <Art viewBox="0 0 100 80" {...placed} className={`pk-bin${placed.className ? ` ${placed.className}` : ''}`}>
            <path className="pk-bin-body" d="M6 8 L94 8 L84 78 L16 78 Z" />
            <path className="pk-bin-line" d="M30 18 L34 70 M50 18 L50 70 M70 18 L66 70" />
            <rect className="pk-bin-rim" x="2" y="2" width="96" height="12" rx="5" />
        </Art>
    );
}

const GEAR_PATH = (() => {
    const teeth = 10;
    const pts: string[] = [];
    for (let i = 0; i < teeth * 4; i++) {
        const a = (Math.PI * 2 * i) / (teeth * 4);
        const r = i % 4 === 1 || i % 4 === 2 ? 48 : 38;
        pts.push(`${(50 + r * Math.sin(a)).toFixed(1)} ${(50 - r * Math.cos(a)).toFixed(1)}`);
    }
    return `M${pts.join(' L')} Z`;
})();

export function Gear(placed: Placed) {
    return (
        <Art viewBox="0 0 100 100" {...placed} className={`pk-gear${placed.className ? ` ${placed.className}` : ''}`}>
            <path className="pk-gear-body" d={GEAR_PATH} />
            <circle className="pk-gear-hole" cx="50" cy="50" r="12" />
            <circle className="pk-gear-ring" cx="50" cy="50" r="26" />
        </Art>
    );
}

export function Lamp(placed: Placed) {
    return (
        <Art viewBox="0 0 80 70" {...placed} className={`pk-lamp${placed.className ? ` ${placed.className}` : ''}`}>
            <path className="pk-lamp-glow" d="M22 40 L58 40 L80 70 L0 70 Z" />
            <path className="pk-lamp-shade" d="M40 4 C 18 6, 12 22, 10 40 L70 40 C 68 22, 62 6, 40 4 Z" />
            <ellipse className="pk-lamp-bulb" cx="40" cy="42" rx="11" ry="6" />
        </Art>
    );
}
