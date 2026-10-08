import type { VormleerExercise } from '../../services/math/types';
import { CONCEPT_NAMES } from '../../services/vormleer/vormleerGenerator';
import { hoekFromPoint, hoekStep } from '../../services/vormleer/hoekDrag';
import type { ViewerInteraction } from './ViewerInteractionContext';
import { dragHandleProps, dragSurfaceProps, dragValuesOf } from './kioskDrag';

// SYNC: VormleerViewer's divisor (13pt = 17.33 px): the figure follows the Lettergrootte token.
const PX_PER_EM_AT_DEFAULT = 17.33;
const mathPx = (px: number) => `calc(var(--sheet-size-math) * ${(px / PX_PER_EM_AT_DEFAULT).toFixed(3)})`;
const mono = "'Azeret Mono', monospace";

// viewBox geometry: the hoekpunt low in the middle so every opening up to a gestrekte hoek
// (the free been pointing left) and the letters past the been ends fit.
const W = 200, H = 120;
const VX = 100, VY = 98, LEG = 80, BOOG = 18;

const rad = (deg: number) => (deg * Math.PI) / 180;
const end = (deg: number, len: number) => ({ x: VX + Math.cos(rad(deg)) * len, y: VY - Math.sin(rad(deg)) * len });

/** The kiosk's tekenvak for "teken een … hoek": a vaste been to the right, the pupil drags the other one open. */
export default function HoekDragSVG({ ex, ctx }: { ex: VormleerExercise; ctx: ViewerInteraction }) {
    const angle = dragValuesOf(ctx).a;
    const placed = angle !== undefined;
    const a = angle ?? 0;
    const free = end(a, LEG);
    const names = (ex.labels ?? []).length === 3 ? ex.labels! : null;
    const fs = 0.62 * PX_PER_EM_AT_DEFAULT;
    const glyph = (p: { x: number; y: number }, s: string) =>
        <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fontSize={fs} fontFamily={mono} fontStyle="italic" fill="currentColor">{s}</text>;
    // Like the sheet's hoek: a square at exactly 90°, else a boog from the vaste been.
    const marker = !placed || a === 0 ? null : a === 90
        ? <polyline points={`${VX + 12},${VY} ${VX + 12},${VY - 12} ${VX},${VY - 12}`} fill="none" stroke="currentColor" strokeWidth={1.2} />
        : <path d={`M ${VX + BOOG} ${VY} A ${BOOG} ${BOOG} 0 0 0 ${end(a, BOOG).x} ${end(a, BOOG).y}`} fill="none" stroke="currentColor" strokeWidth={1.2} />;
    return (
        <svg width={mathPx(W)} height={mathPx(H)} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}
            {...dragSurfaceProps(ctx, { width: W, height: H, pick: () => 'a', move: (_k, p, from) => ({ ...from, a: hoekFromPoint(p, VX, VY) }) })}>
            <line x1={VX} y1={VY} x2={VX + LEG} y2={VY} stroke="currentColor" strokeWidth={1.8} />
            {placed && <line x1={VX} y1={VY} x2={free.x} y2={free.y} stroke="currentColor" strokeWidth={1.8} />}
            {marker}
            <circle cx={VX} cy={VY} r={2} fill="currentColor" />
            {names && <>
                {glyph({ x: VX + LEG + 10, y: VY }, names[0])}
                {glyph({ x: VX, y: VY + 13 }, `${names[1]}̂`)}
                {placed && glyph(end(a, LEG + 11), names[2])}
            </>}
            <g {...dragHandleProps(ctx, 'a', {
                label: `been van de ${CONCEPT_NAMES[ex.concept] ?? 'hoek'}`, valueText: `${a} graden`, value: a, min: 0, max: 180,
                step: (dir, from) => ({ ...from, a: hoekStep(from.a, dir) }),
            })}>
                {/* Not placed yet: the knob waits hollow on the vaste been, ready to be pulled open. */}
                <circle cx={free.x} cy={free.y} r={6} className={`kiosk-knob${placed ? '' : ' is-unset'}`} />
            </g>
        </svg>
    );
}
