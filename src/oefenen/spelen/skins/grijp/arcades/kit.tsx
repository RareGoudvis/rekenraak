import type { CSSProperties, ReactNode } from 'react';
import { BUTTON, C, CLAW_BOX, COUNTER, DOOR, SLOT, STICK, fill, mix, pivot, type ClawLook, type PlushLook, type Pt } from './layout';

// The shared drawing kit of the five arcades (one file each beside this one; the layout and colours in layout.ts): a
// plush face, a sitting plush, chasing bulbs, the control panel and the claw's moving parts. Flat fills under the
// --spel-ink outline: every outlined shape has class "o" (grijp.css sets the stroke per SVG).

// ── Prize faces ─────────────────────────────────────────────────────────────────

/** Two shiny eyes that blink (grijp.css .gm-eyes), rosy cheeks and a smile; s = scale (1 = a 100-unit plush). */
export function Face({ x, y, s = 1, gap = 14, cheeks = true, mouth = 'smile', eye = C.ink }: { x: number; y: number; s?: number; gap?: number; cheeks?: boolean; mouth?: 'smile' | 'open' | 'o' | 'grin' | 'none'; eye?: string }) {
    return (
        <g transform={`translate(${x} ${y}) scale(${s})`}>
            {cheeks && <g style={fill(mix(C.rose, 90, C.red))} opacity={0.55}><ellipse cx={-gap - 6} cy={8} rx={6} ry={4} /><ellipse cx={gap + 6} cy={8} rx={6} ry={4} /></g>}
            <g className="gm-eyes">
                {[-gap, gap].map(dx => (
                    <g key={dx}>
                        <ellipse cx={dx} cy={0} rx={5.2} ry={6.4} style={fill(eye)} />
                        <circle cx={dx + 1.8} cy={-2.4} r={1.9} style={fill(C.paper)} />
                    </g>
                ))}
            </g>
            {mouth === 'smile' && <path className="gm-mouth" d="M-6 8 Q0 14 6 8" fill="none" />}
            {mouth === 'grin' && <path className="gm-mouth" d="M-8 7 Q0 17 8 7 Z" style={fill(mix(C.red, 70, C.ink))} />}
            {mouth === 'open' && <ellipse className="gm-mouth" cx={0} cy={10} rx={4.4} ry={5} style={fill(mix(C.red, 70, C.ink))} />}
            {mouth === 'o' && <circle className="gm-mouth" cx={0} cy={10} r={3} style={fill(mix(C.red, 70, C.ink))} />}
        </g>
    );
}

// ── A sitting plush (the animals of several machines) ─────────────────────────────


/** A plush sitting in a 100 × 100 box: feet, body, belly, arms (the right one waves), head; the face and the tag sit
 *  in the top half (the tag hides the belly). back = ears and tails behind, front = snouts, spots and whiskers. */
export function Plush({ look, back, front, face, head = 25 }: { look: PlushLook; back?: ReactNode; front?: ReactNode; face?: ReactNode; head?: number }) {
    return (
        <g className="gm-plush-g">
            {back}
            <g style={fill(look.dark ?? mix(look.body, 70, C.ink))}>
                <ellipse className="o" cx={34} cy={95} rx={10} ry={6} />
                <ellipse className="o" cx={66} cy={95} rx={10} ry={6} />
            </g>
            <ellipse className="o" cx={50} cy={78} rx={27} ry={21} style={fill(look.body)} />
            <ellipse cx={50} cy={82} rx={15} ry={12} style={fill(look.belly)} />
            <ellipse className="o" cx={25} cy={76} rx={7} ry={11} transform="rotate(25 25 76)" style={fill(look.body)} />
            <g className="gm-wave" style={pivot(71, 66)}>
                <ellipse className="o" cx={77} cy={74} rx={7} ry={11} transform="rotate(-25 77 74)" style={fill(look.body)} />
            </g>
            <circle className="o" cx={50} cy={44} r={head} style={fill(look.body)} />
            {front}
            {face ?? <Face x={50} y={44} />}
        </g>
    );
}

// ── Bulbs ───────────────────────────────────────────────────────────────────────

/** Chasing bulbs (grijp.css .gm-bulb: three colours in turn light up, one step per --k). */
export function Bulbs({ points, r = 9, kind = 'chase' }: { points: readonly Pt[]; r?: number; kind?: 'chase' | 'blink' }) {
    return (
        <g className={`gm-bulbs is-${kind}`}>
            {points.map(([x, y], k) => <circle key={k} className={`gm-bulb o is-c${k % 3}`} cx={x} cy={y} r={r} style={{ '--k': k % 6 } as CSSProperties} />)}
        </g>
    );
}

// ── The panel's moving parts (same place on every machine; colours from the machine's --gm-* vars) ───────────

export function PanelBits() {
    return (
        <g className="gm-panelbits">
            {/* The prize door under the chute: a flap that swings when a prize comes out. */}
            <rect className="o gm-door-hole" x={DOOR.x} y={DOOR.y} width={DOOR.w} height={DOOR.h} rx={16} />
            <g className="gm-door" style={pivot(DOOR.x + DOOR.w / 2, DOOR.y + 8)}>
                <rect className="o gm-door-flap" x={DOOR.x + 8} y={DOOR.y + 8} width={DOOR.w - 16} height={DOOR.h - 22} rx={10} />
                <text className="gm-door-label" x={DOOR.x + DOOR.w / 2} y={DOOR.y + DOOR.h / 2 + 4} textAnchor="middle">PRIJS</text>
            </g>
            {/* The joystick: it leans the way the claw goes (data-move on the root). */}
            <ellipse className="o gm-stick-base" cx={STICK.x} cy={STICK.y + 6} rx={46} ry={16} />
            <g className="gm-stick" style={pivot(STICK.x, STICK.y)}>
                <rect className="o gm-stick-rod" x={STICK.x - 7} y={STICK.y - 66} width={14} height={66} rx={6} />
                <circle className="o gm-stick-ball" cx={STICK.x} cy={STICK.y - 70} r={22} />
                <ellipse cx={STICK.x - 7} cy={STICK.y - 78} rx={6} ry={4} style={fill(C.paper)} opacity={0.7} />
            </g>
            {/* The big button: pressed while the claw goes down. */}
            <ellipse className="o gm-button-base" cx={BUTTON.x} cy={BUTTON.y + 14} rx={44} ry={18} />
            <g className="gm-button">
                <ellipse className="o gm-button-top" cx={BUTTON.x} cy={BUTTON.y} rx={36} ry={15} />
                <ellipse cx={BUTTON.x - 10} cy={BUTTON.y - 4} rx={9} ry={4} style={fill(C.paper)} opacity={0.6} />
            </g>
            {/* The coin slot with its glowing "insert coin" arrow. */}
            <rect className="o gm-slot-plate" x={SLOT.x} y={SLOT.y} width={SLOT.w} height={SLOT.h} rx={12} />
            <rect className="gm-slot-hole" x={SLOT.x + SLOT.w / 2 - 5} y={SLOT.y + 12} width={10} height={SLOT.h - 30} rx={4} />
            <path className="gm-slot-arrow" d={`M${SLOT.x + SLOT.w / 2 - 12} ${SLOT.y - 22} l12 12 l12 -12`} fill="none" />
            <rect className="o gm-counter-plate" x={COUNTER.x} y={COUNTER.y} width={COUNTER.w} height={COUNTER.h} rx={14} />
        </g>
    );
}

/** A coin (the slot's, the rolling one on the floor). */
export function CoinArt({ className = '' }: { className?: string }) {
    return (
        <svg className={`gm-coin-art ${className}`} viewBox="-22 -22 44 44" aria-hidden>
            <circle className="o" r={18} style={fill(C.yellow)} />
            <circle r={11} fill="none" stroke={C.ink} strokeOpacity={0.35} strokeWidth={2.5} />
            <path d="M-3 -6 L3 -6 M0 -6 L0 7" stroke={C.ink} strokeOpacity={0.5} strokeWidth={3} strokeLinecap="round" />
        </svg>
    );
}

// ── The claw ───────────────────────────────────────────────────────────────────

export function ClawFrom({ look }: { look: ClawLook }) {
    const py = look.pivotY ?? 40;
    const sx = look.spread ?? 22;
    return (
        <svg className="gm-claw-art" viewBox={`0 0 ${CLAW_BOX.w} ${CLAW_BOX.h}`} overflow="visible" aria-hidden>
            {look.middle && <g className="gm-prong is-m" style={pivot(60, py)}><g transform={`translate(60 ${py})`}>{look.middle}</g></g>}
            <g className="gm-prong is-l" style={pivot(60 - sx, py)}><g transform={`translate(${60 - sx} ${py})`}>{look.prong}</g></g>
            <g className="gm-prong is-r" style={pivot(60 + sx, py)}><g transform={`translate(${60 + sx} ${py}) scale(-1 1)`}>{look.prong}</g></g>
            {look.hub}
        </svg>
    );
}
