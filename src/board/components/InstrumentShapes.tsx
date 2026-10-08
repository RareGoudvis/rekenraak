import type { Instrument } from '../boardTypes';
import { IC, NO_POINTER } from './instrumentStyle';
import { BOARD_CM_PX, BOARD_MM_PX, EDGE_TOL_PX, GEO, LAT, PASSER, bodyPolygon, passerHinge, polyPoints, round1 } from '../instrumentGeometry';

// The meetinstrumenten as SVG, each drawn in its own local frame (InstrumentLayer places it
// with translate + rotate). Translucent "plastic" from tokens: a frosted light body keeps the
// black scale legible on a white and on a black board alike.

export type Grip = 'body' | 'rotate';
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

export function GeodriehoekShape(p: ShapeProps) {
    return (
        <Body kind="geodriehoek" {...p}>
            <RotateHandle x={0} y={GEO.half - 1.55 * BOARD_CM_PX} onGrip={p.onGrip} />
        </Body>
    );
}

// Passer in its local frame: needle at the origin, pencil tip at (radius, 0), the hinge above
// the chord. Needle leg and hinge move the passer.
export function PasserShape({ inst, selected, onGrip }: ShapeProps) {
    const r = inst.radius ?? 5 * BOARD_CM_PX;
    const [hx, hy] = passerHinge(r);
    const legW = 11;
    const metal = selected ? IC.selected : IC.edge;
    // The pin's top: 0.8 cm up the needle leg (the leg is PASSER.leg long, needle at the origin).
    const pin = (0.8 * BOARD_CM_PX) / PASSER.leg;
    const pinX = hx * pin, pinY = hy * pin;
    return (
        <>
            {/* needle leg: the plastic leg ends in a metal pin of 0.8 cm */}
            <g data-instrument-grip="body" style={{ pointerEvents: 'all', cursor: 'move' }} onPointerDown={(e) => onGrip(e, 'body')}>
                <line x1={hx} y1={hy} x2={0} y2={0} strokeWidth={legW + 16} stroke="transparent" />
                <line x1={hx} y1={hy} x2={pinX} y2={pinY} strokeWidth={legW} strokeLinecap="round" style={{ stroke: IC.body }} />
                <line x1={hx} y1={hy} x2={pinX} y2={pinY} strokeWidth={legW} strokeLinecap="round" opacity={0.55} style={{ stroke: metal }} />
                <line x1={pinX} y1={pinY} x2={0} y2={0} strokeWidth={2.5} strokeLinecap="round" style={{ stroke: IC.tick }} />
                <circle r={4} style={{ fill: IC.tick }} />
            </g>
            {/* pencil leg */}
            <line x1={hx} y1={hy} x2={r} y2={0} strokeWidth={legW} strokeLinecap="round" opacity={0.55} style={{ stroke: metal, pointerEvents: 'none' }} />
            {/* hinge + handle */}
            <g data-instrument-grip="body" style={{ pointerEvents: 'all', cursor: 'move' }} onPointerDown={(e) => onGrip(e, 'body')}>
                <circle cx={hx} cy={hy} r={14} style={{ fill: IC.handle }} />
                <circle cx={hx} cy={hy} r={5} style={{ fill: IC.handleOn }} />
            </g>
        </>
    );
}
