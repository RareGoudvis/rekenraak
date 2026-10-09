import type { Instrument } from '../boardTypes';
import { IC, NO_POINTER } from './instrumentStyle';
import { BOARD_CM_PX, BOARD_MM_PX, EDGE_TOL_PX, LAT, bodyPolygon, formatCm, passerHinge, polyPoints, rotateHandleSpots, round1, type PasserSide } from '../instrumentGeometry';

// The meetinstrumenten as SVG, each drawn in its own local frame (InstrumentLayer places it
// with translate + rotate). Translucent "plastic" from tokens: a frosted light body keeps the
// black scale legible on a white and on a black board alike.

// body = move, rotate = turn about the reference point; passer: open = set the opening, draw = arc.
export type Grip = 'body' | 'rotate' | 'open' | 'draw';
export interface ShapeProps {
    inst: Instrument;
    selected: boolean;
    // An ink tool is active: only the inner zone grabs, the band along each edge draws.
    passThrough: boolean;
    onGrip: (e: React.PointerEvent, grip: Grip) => void;
    // "Handvatten op het bord houden" (placeRotateHandle / placePasserHinge); absent = the default spot.
    handle?: { at: [number, number]; chip: boolean };
    passer?: { side: PasserSide; chip: [number, number] | null };
}


const HANDLE_R = 19;    // ≈ 40 px across: a finger-sized target on a digibord

function RotateHandle({ at, chip, onGrip }: { at: [number, number]; chip: boolean; onGrip: ShapeProps['onGrip'] }) {
    return (
        <g data-instrument-grip="rotate" data-handle-chip={chip || undefined} transform={`translate(${round1(at[0])} ${round1(at[1])})`}
            style={{ pointerEvents: 'all', cursor: 'grab' }} onPointerDown={(e) => onGrip(e, 'rotate')}>
            <title>Draaien</title>
            {/* pulled off the body to the board's edge: a light ring sets it apart from the board */}
            {chip && <circle r={HANDLE_R + 3} style={{ fill: IC.label }} />}
            <circle r={HANDLE_R} style={{ fill: IC.handle }} />
            <path d="M -8 -3 A 9 9 0 1 1 -3 8" fill="none" strokeWidth={2.4} strokeLinecap="round" style={{ stroke: IC.handleOn }} />
            <path d="M -12 -6 L -8 -3 L -5 -8" fill="none" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" style={{ stroke: IC.handleOn }} />
        </g>
    );
}


// Body + its grab zone: the visible plastic never takes pointers itself, the grip polygon
// does (the whole body for select/hand, the inset core while drawing).
function Body({ kind, selected, passThrough, onGrip, children }: Omit<ShapeProps, 'inst'> & { kind: 'lat' | 'geodriehoek'; children?: React.ReactNode }) {
    const outline = polyPoints(bodyPolygon(kind));
    return (
        <>
            <polygon points={outline} style={{ fill: IC.body, pointerEvents: 'none' }} />
            <polygon points={outline} strokeWidth={selected ? 2.5 : 1.4} strokeLinejoin="round"
                style={{ fill: IC.tint, stroke: selected ? IC.selected : IC.edge, pointerEvents: 'none' }} />
            <polygon data-instrument-grip="body" points={polyPoints(bodyPolygon(kind, passThrough ? EDGE_TOL_PX : 0))}
                fill="transparent" style={{ pointerEvents: 'all', cursor: 'move' }} onPointerDown={(e) => onGrip(e, 'body')} />
            {children}
        </>
    );
}

// The lat's scale on its measuring edge: a faint tick every mm, longer at every half cm, a
// numbered tick every cm (0–20), at the board's real cm (BOARD_CM_PX).
const LAT_TICKS = (() => {
    const mm: string[] = [], half: string[] = [], cm: string[] = [];
    for (let i = 0; i <= LAT.cm * 10; i++) {
        const x = round1(i * BOARD_MM_PX);
        if (i % 10 === 0) cm.push(`M ${x} 0 V ${round1(0.6 * BOARD_CM_PX)}`);
        else if (i % 5 === 0) half.push(`M ${x} 0 V ${round1(0.42 * BOARD_CM_PX)}`);
        else mm.push(`M ${x} 0 V ${round1(0.25 * BOARD_CM_PX)}`);
    }
    return { mm: mm.join(' '), half: half.join(' '), cm: cm.join(' ') };
})();

export function LatShape(p: ShapeProps) {
    return (
        <Body kind="lat" {...p}>
            <g style={NO_POINTER}>
                <path d={LAT_TICKS.mm} strokeWidth={1} style={{ stroke: IC.faint }} />
                <path d={LAT_TICKS.half} strokeWidth={1.4} style={{ stroke: IC.tick }} />
                <path d={LAT_TICKS.cm} strokeWidth={2} style={{ stroke: IC.tick }} />
                {Array.from({ length: LAT.cm + 1 }, (_, i) => (
                    <text key={i} x={round1(i * BOARD_CM_PX)} y={round1(1.18 * BOARD_CM_PX)} textAnchor="middle"
                        fontSize={18} fontWeight={600} fontFamily="var(--font-ui)" style={{ fill: IC.tick }}>{i}</text>
                ))}
                <text x={round1(0.15 * BOARD_CM_PX)} y={round1(2.1 * BOARD_CM_PX)} fontSize={14} fontFamily="var(--font-ui)" style={{ fill: IC.faint }}>cm</text>
            </g>
            <RotateHandle {...(p.handle ?? { at: rotateHandleSpots('lat')[0], chip: false })} onGrip={p.onGrip} />
        </Body>
    );
}

// Geodriehoek scales, local frame (origin = hypotenuse midpoint, body below): a cm scale on
// the hypotenuse from 0 in the middle to 7 both ways, and the protractor: a tick every degree
// on the arc, longer every 5° and 10°, and two numbered rings (0–180 from the right end
// outside, from the left end inside), like the Flemish classroom geodriehoek.
// Protractor arc: inside the legs (5.66 cm from the centre) yet clear of the "5" cm labels.
const GEO_R = 5.45 * BOARD_CM_PX;
const GEO_RING_OUT = GEO_R - 0.88 * BOARD_CM_PX;
const GEO_RING_IN = GEO_R - 1.5 * BOARD_CM_PX;
const GEO_SCALE = (() => {
    const mm: string[] = [], cm: string[] = [], deg1: string[] = [], deg5: string[] = [];
    for (let i = -70; i <= 70; i++) {
        const x = round1(i * BOARD_MM_PX);
        if (i % 10 === 0) cm.push(`M ${x} 0 V ${round1(0.5 * BOARD_CM_PX)}`);
        else mm.push(`M ${x} 0 V ${round1((i % 5 === 0 ? 0.32 : 0.2) * BOARD_CM_PX)}`);
    }
    for (let d = 0; d <= 180; d++) {
        const len = (d % 10 === 0 ? 0.5 : d % 5 === 0 ? 0.32 : 0.17) * BOARD_CM_PX;
        const c = Math.cos(d * Math.PI / 180), s = Math.sin(d * Math.PI / 180);
        const seg = `M ${round1(GEO_R * c)} ${round1(GEO_R * s)} L ${round1((GEO_R - len) * c)} ${round1((GEO_R - len) * s)}`;
        (d % 5 === 0 ? deg5 : deg1).push(seg);
    }
    return { mm: mm.join(' '), cm: cm.join(' '), deg1: deg1.join(' '), deg5: deg5.join(' ') };
})();

// A protractor number at angle d on radius r, its top towards the centre (read from inside).
function DegLabel({ d, r, label, size }: { d: number; r: number; label: number; size: number }) {
    const c = Math.cos(d * Math.PI / 180), s = Math.sin(d * Math.PI / 180);
    return (
        <text transform={`translate(${round1(r * c)} ${round1(r * s)}) rotate(${d - 90})`} textAnchor="middle" dy="0.35em"
            fontSize={size} fontWeight={600} fontFamily="var(--font-ui)" style={{ fill: IC.tick }}>{label}</text>
    );
}

export function GeodriehoekShape(p: ShapeProps) {
    const tens = Array.from({ length: 19 }, (_, i) => i * 10);
    return (
        <Body kind="geodriehoek" {...p}>
            <g style={NO_POINTER}>
                {/* hypotenuse cm scale */}
                <path d={GEO_SCALE.mm} strokeWidth={1} style={{ stroke: IC.faint }} />
                <path d={GEO_SCALE.cm} strokeWidth={2} style={{ stroke: IC.tick }} />
                {Array.from({ length: 13 }, (_, i) => i - 6).map(c => (
                    <text key={c} x={round1(c * BOARD_CM_PX)} y={round1(0.92 * BOARD_CM_PX)} textAnchor="middle"
                        fontSize={15} fontWeight={600} fontFamily="var(--font-ui)" style={{ fill: IC.tick }}>{Math.abs(c)}</text>
                ))}
                {/* protractor */}
                <path d={`M ${round1(GEO_R)} 0 A ${round1(GEO_R)} ${round1(GEO_R)} 0 0 1 ${round1(-GEO_R)} 0`} fill="none" strokeWidth={1.4} style={{ stroke: IC.tick }} />
                <path d={GEO_SCALE.deg1} strokeWidth={1} style={{ stroke: IC.faint }} />
                <path d={GEO_SCALE.deg5} strokeWidth={1.6} style={{ stroke: IC.tick }} />
                {/* 0/10 and 170/180 sit on the cm scale's numbers; their ticks carry them */}
                {tens.filter(d => d >= 20 && d <= 160).map(d => <DegLabel key={`o${d}`} d={d} r={GEO_RING_OUT} label={d} size={15} />)}
                {tens.filter(d => d >= 20 && d <= 160).map(d => <DegLabel key={`i${d}`} d={d} r={GEO_RING_IN} label={180 - d} size={12} />)}
                {/* the 90° line: perpendiculars are drawn from it */}
                <path d={`M 0 ${round1(0.55 * BOARD_CM_PX)} V ${round1(GEO_RING_IN - 0.4 * BOARD_CM_PX)}`} strokeWidth={1} strokeDasharray="4 4" style={{ stroke: IC.faint }} />
                <circle r={3.5} style={{ fill: IC.selected }} />
            </g>
            <RotateHandle {...(p.handle ?? { at: rotateHandleSpots('geodriehoek')[0], chip: false })} onGrip={p.onGrip} />
        </Body>
    );
}

// A leg seen from above: a bar from a (half-width wa) to b (half-width wb), as a polygon.
function taper(ax: number, ay: number, bx: number, by: number, wa: number, wb: number): string {
    const len = Math.hypot(bx - ax, by - ay) || 1;
    const nx = -(by - ay) / len, ny = (bx - ax) / len;
    return polyPoints([ax + nx * wa, ay + ny * wa, bx + nx * wb, by + ny * wb, bx - nx * wb, by - ny * wb, ax - nx * wa, ay - ny * wa]);
}

// The point a distance d back from `to` towards `from`.
function back(fx: number, fy: number, tx: number, ty: number, d: number): [number, number] {
    const len = Math.hypot(tx - fx, ty - fy) || 1;
    return [tx + ((fx - tx) / len) * d, ty + ((fy - ty) / len) * d];
}

// Passer in its local frame, drawn top-down (an opened passer seen from above): needle at the
// origin, pencil tip at (radius, 0), the hinge at the apex of the two equal legs on the chord's
// perpendicular bisector (passerHinge), its grip stem pointing away from the chord. A rigid
// drawing, so it reads right at every rotation. Needle leg and hinge move the passer, the
// pencil leg opens it, the pencil tip draws.
export function PasserShape({ inst, selected, onGrip, passer }: ShapeProps) {
    const r = inst.radius ?? 5 * BOARD_CM_PX;
    const side = passer?.side ?? -1;
    const chip = passer?.chip ?? null;
    const [hx, hy] = passerHinge(r, side);
    const metal = selected ? IC.selected : IC.edge;
    const cm = BOARD_CM_PX;
    // Needle leg: the bar ends 0.8 cm short of the paper, a steel pin does the rest.
    const [pinX, pinY] = back(hx, hy, 0, 0, 0.8 * cm);
    // Pencil leg: bar, a clamp 2.4 cm up, the pencil from there, sharpened over its last 1 cm.
    const [clampX, clampY] = back(hx, hy, r, 0, 2.4 * cm);
    const [clamp2X, clamp2Y] = back(hx, hy, r, 0, 1.9 * cm);
    const [coneX, coneY] = back(hx, hy, r, 0, 1.0 * cm);
    // The grip stem: 1.5 cm from the hinge straight away from the chord.
    const stemY = hy + side * 1.5 * cm;
    const leg = (x: number, y: number) => taper(hx, hy, x, y, 7, 4.5);
    return (
        <>
            {/* the opening: a dashed radius with its length, always upright, on the side away from the hinge */}
            <g style={NO_POINTER}>
                <line x1={0} y1={0} x2={r} y2={0} strokeWidth={4} opacity={0.7} style={{ stroke: IC.label }} />
                <line x1={0} y1={0} x2={r} y2={0} strokeWidth={1.5} strokeDasharray="6 5" style={{ stroke: IC.edge }} />
                <g data-passer-radius transform={`translate(${round1(r / 2)} ${hy < 0 ? 26 : -26}) rotate(${-inst.rotation})`}>
                    <rect x={-40} y={-14} width={80} height={28} rx={14} strokeWidth={1.5} style={{ fill: IC.label, stroke: IC.edge }} />
                    <text textAnchor="middle" dy="0.35em" fontSize={16} fontWeight={700} fontFamily="var(--font-ui)" style={{ fill: IC.edge }}>{formatCm(r)}</text>
                </g>
            </g>
            {/* needle leg + steel pin */}
            <g data-instrument-grip="body" data-passer-part="needle-leg" style={{ pointerEvents: 'all', cursor: 'move' }} onPointerDown={(e) => onGrip(e, 'body')}>
                <title>Passer verplaatsen</title>
                <line x1={round1(hx)} y1={round1(hy)} x2={0} y2={0} strokeWidth={30} stroke="transparent" />
                <polygon points={leg(pinX, pinY)} strokeWidth={1.4} strokeLinejoin="round" style={{ fill: IC.body, stroke: metal }} />
                <polygon points={leg(pinX, pinY)} opacity={0.45} style={{ fill: metal }} />
                {/* light halo under the dark pin: the needle stays visible on a black board */}
                <line x1={round1(pinX)} y1={round1(pinY)} x2={0} y2={0} strokeWidth={5.5} strokeLinecap="round" style={{ stroke: IC.label }} />
                <line x1={round1(pinX)} y1={round1(pinY)} x2={0} y2={0} strokeWidth={2.5} strokeLinecap="round" style={{ stroke: IC.tick }} />
                <circle data-passer-needle r={4} strokeWidth={2} style={{ fill: IC.tick, stroke: IC.label }} />
            </g>
            {/* pencil leg: bar, clamp and pencil; dragging it sets the opening (no ink) */}
            <g data-instrument-grip="open" data-passer-part="pencil-leg" style={{ pointerEvents: 'all', cursor: 'ew-resize' }} onPointerDown={(e) => onGrip(e, 'open')}>
                <title>Passer openen</title>
                <line x1={round1(hx)} y1={round1(hy)} x2={round1(coneX)} y2={round1(coneY)} strokeWidth={30} stroke="transparent" />
                <polygon points={leg(clampX, clampY)} strokeWidth={1.4} strokeLinejoin="round" style={{ fill: IC.body, stroke: metal }} />
                <polygon points={leg(clampX, clampY)} opacity={0.45} style={{ fill: metal }} />
                <polygon points={taper(clampX, clampY, coneX, coneY, 5.5, 5.5)} strokeWidth={1.2} strokeLinejoin="round" style={{ fill: IC.tint, stroke: IC.edge }} />
                <polygon points={taper(coneX, coneY, r, 0, 5.5, 0.6)} strokeWidth={1.2} strokeLinejoin="round" style={{ fill: IC.label, stroke: IC.faint }} />
                <polygon points={taper(clampX, clampY, clamp2X, clamp2Y, 8.5, 8.5)} strokeWidth={1.4} strokeLinejoin="round" style={{ fill: IC.handle, stroke: metal }} />
            </g>
            {/* pencil tip: dragging it round the needle draws the arc */}
            <g data-instrument-grip="draw" transform={`translate(${round1(r)} 0)`} style={{ pointerEvents: 'all', cursor: 'crosshair' }} onPointerDown={(e) => onGrip(e, 'draw')}>
                <title>Cirkelboog tekenen</title>
                <circle r={20} strokeWidth={2.5} style={{ fill: IC.tint, stroke: IC.handle }} />
                <circle data-passer-pencil r={3.5} style={{ fill: IC.tick }} />
            </g>
            {/* hinge head seen from above (the round joint and its screw) + the grip stem */}
            <g data-instrument-grip="body" data-passer-part="hinge" style={{ pointerEvents: 'all', cursor: 'move' }} onPointerDown={(e) => onGrip(e, 'body')}>
                <title>Passer verplaatsen</title>
                <polygon points={taper(hx, hy, hx, stemY, 6, 6)} strokeWidth={1.4} strokeLinejoin="round" style={{ fill: IC.handle, stroke: metal }} />
                <circle cx={round1(hx)} cy={round1(stemY)} r={7.5} strokeWidth={1.4} style={{ fill: IC.handle, stroke: metal }} />
                <circle data-passer-hinge cx={round1(hx)} cy={round1(hy)} r={15} strokeWidth={1.6} style={{ fill: IC.handle, stroke: metal }} />
                <circle cx={round1(hx)} cy={round1(hy)} r={8} strokeWidth={1.4} style={{ fill: 'none', stroke: IC.handleOn }} />
                <circle cx={round1(hx)} cy={round1(hy)} r={3} style={{ fill: IC.handleOn }} />
            </g>
            {/* the hinge is off the board on both sides: an on-board stand-in at the nearest edge, tied to it by a dashed line */}
            {chip && (
                <g data-instrument-grip="body" data-passer-part="hinge-chip" style={{ pointerEvents: 'all', cursor: 'move' }} onPointerDown={(e) => onGrip(e, 'body')}>
                    <title>Passer verplaatsen</title>
                    <line x1={round1(chip[0])} y1={round1(chip[1])} x2={round1(hx)} y2={round1(hy)} strokeWidth={2} strokeDasharray="5 5" style={{ stroke: IC.handle, pointerEvents: 'none' }} />
                    <circle cx={round1(chip[0])} cy={round1(chip[1])} r={HANDLE_R + 3} style={{ fill: IC.label }} />
                    <circle cx={round1(chip[0])} cy={round1(chip[1])} r={HANDLE_R} strokeWidth={1.6} style={{ fill: IC.handle, stroke: metal }} />
                    <circle cx={round1(chip[0])} cy={round1(chip[1])} r={8} strokeWidth={1.4} style={{ fill: 'none', stroke: IC.handleOn }} />
                    <circle cx={round1(chip[0])} cy={round1(chip[1])} r={3} style={{ fill: IC.handleOn }} />
                </g>
            )}
        </>
    );
}
