import type { Instrument } from '../boardTypes';
import { IC, NO_POINTER } from './instrumentStyle';
import { BOARD_CM_PX, BOARD_MM_PX, EDGE_TOL_PX, GEO, LAT, PASSER, bodyPolygon, formatCm, passerHinge, polyPoints, round1 } from '../instrumentGeometry';

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
}


const HANDLE_R = 19;    // ≈ 40 px across: a finger-sized target on a digibord

function RotateHandle({ x, y, onGrip }: { x: number; y: number; onGrip: ShapeProps['onGrip'] }) {
    return (
        <g data-instrument-grip="rotate" transform={`translate(${round1(x)} ${round1(y)})`}
            style={{ pointerEvents: 'all', cursor: 'grab' }} onPointerDown={(e) => onGrip(e, 'rotate')}>
            <title>Draaien</title>
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
            <RotateHandle x={LAT.cm * BOARD_CM_PX - 0.9 * BOARD_CM_PX} y={LAT.h - 0.95 * BOARD_CM_PX} onGrip={p.onGrip} />
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
            <RotateHandle x={0} y={GEO.half - 1.55 * BOARD_CM_PX} onGrip={p.onGrip} />
        </Body>
    );
}

// Passer in its local frame: needle at the origin, pencil tip at (radius, 0), the hinge on the
// chord's upper side. Needle leg and hinge move the passer, the pencil leg opens it, the pencil tip draws.
export function PasserShape({ inst, selected, onGrip }: ShapeProps) {
    const r = inst.radius ?? 5 * BOARD_CM_PX;
    const [hx, hy] = passerHinge(r, inst.rotation);
    const legW = 11;
    const metal = selected ? IC.selected : IC.edge;
    // The pin's top: 0.8 cm up the needle leg (the leg is PASSER.leg long, needle at the origin).
    const pin = (0.8 * BOARD_CM_PX) / PASSER.leg;
    const pinX = hx * pin, pinY = hy * pin;
    // The pencil: the leg's last 1.2 cm is a cone to the lead; n = the leg's unit normal.
    const cone = (1.2 * BOARD_CM_PX) / PASSER.leg;
    const coneX = r + (hx - r) * cone, coneY = hy * cone;
    const nx = -hy / PASSER.leg, ny = (hx - r) / PASSER.leg;
    return (
        <>
            {/* needle leg: the plastic leg ends in a metal pin of 0.8 cm */}
            <g data-instrument-grip="body" style={{ pointerEvents: 'all', cursor: 'move' }} onPointerDown={(e) => onGrip(e, 'body')}>
                <line x1={hx} y1={hy} x2={0} y2={0} strokeWidth={legW + 16} stroke="transparent" />
                <line x1={hx} y1={hy} x2={pinX} y2={pinY} strokeWidth={legW} strokeLinecap="round" style={{ stroke: IC.body }} />
                <line x1={hx} y1={hy} x2={pinX} y2={pinY} strokeWidth={legW} strokeLinecap="round" opacity={0.55} style={{ stroke: metal }} />
                {/* light halo under the dark pin: the needle stays visible on a black board */}
                <line x1={pinX} y1={pinY} x2={0} y2={0} strokeWidth={5.5} strokeLinecap="round" style={{ stroke: IC.label }} />
                <line x1={pinX} y1={pinY} x2={0} y2={0} strokeWidth={2.5} strokeLinecap="round" style={{ stroke: IC.tick }} />
                <circle r={4} strokeWidth={2} style={{ fill: IC.tick, stroke: IC.label }} />
            </g>
            {/* the opening: a dashed radius with its length, always upright */}
            <g style={NO_POINTER}>
                <line x1={0} y1={0} x2={r} y2={0} strokeWidth={4} opacity={0.7} style={{ stroke: IC.label }} />
                <line x1={0} y1={0} x2={r} y2={0} strokeWidth={1.5} strokeDasharray="6 5" style={{ stroke: IC.edge }} />
                <g data-passer-radius transform={`translate(${round1(r / 2)} ${hy < 0 ? 26 : -26}) rotate(${-inst.rotation})`}>
                    <rect x={-40} y={-14} width={80} height={28} rx={14} strokeWidth={1.5} style={{ fill: IC.label, stroke: IC.edge }} />
                    <text textAnchor="middle" dy="0.35em" fontSize={16} fontWeight={700} fontFamily="var(--font-ui)" style={{ fill: IC.edge }}>{formatCm(r)}</text>
                </g>
            </g>
            {/* pencil leg: dragging it sets the opening (no ink) */}
            <g data-instrument-grip="open" style={{ pointerEvents: 'all', cursor: 'ew-resize' }} onPointerDown={(e) => onGrip(e, 'open')}>
                <title>Passer openen</title>
                <line x1={hx} y1={hy} x2={coneX} y2={coneY} strokeWidth={legW + 16} stroke="transparent" />
                <line x1={hx} y1={hy} x2={coneX} y2={coneY} strokeWidth={legW} strokeLinecap="round" style={{ stroke: IC.body }} />
                <line x1={hx} y1={hy} x2={coneX} y2={coneY} strokeWidth={legW} strokeLinecap="round" opacity={0.55} style={{ stroke: metal }} />
                <path d={`M ${round1(coneX - nx * 7)} ${round1(coneY - ny * 7)} L ${round1(r)} 0 L ${round1(coneX + nx * 7)} ${round1(coneY + ny * 7)} Z`}
                    style={{ fill: IC.faint }} />
            </g>
            {/* pencil tip: dragging it round the needle draws the arc */}
            <g data-instrument-grip="draw" transform={`translate(${round1(r)} 0)`} style={{ pointerEvents: 'all', cursor: 'crosshair' }} onPointerDown={(e) => onGrip(e, 'draw')}>
                <title>Cirkelboog tekenen</title>
                <circle r={20} strokeWidth={2.5} style={{ fill: IC.tint, stroke: IC.handle }} />
                <circle r={3.5} style={{ fill: IC.tick }} />
            </g>
            {/* hinge + handle */}
            <g data-instrument-grip="body" style={{ pointerEvents: 'all', cursor: 'move' }} onPointerDown={(e) => onGrip(e, 'body')}>
                <circle cx={hx} cy={hy} r={14} style={{ fill: IC.handle }} />
                <circle cx={hx} cy={hy} r={5} style={{ fill: IC.handleOn }} />
            </g>
        </>
    );
}
