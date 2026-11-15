import { useId, useMemo } from 'react';
import { crackLines } from './layout';
import './scene.css';

export type CrackStage = 0 | 1 | 2;

export interface CrackLinesProps {
    // The box in the parent SVG's units.
    x?: number;
    y?: number;
    width: number;
    height: number;
    // 0 = whole, 1 = a few short cracks, 2 = they grow and branch.
    stage: CrackStage;
    seed?: number;
    // The impact point inside the box; absent = somewhere in its upper middle.
    origin?: readonly [number, number];
    // No draw-in: the cracks are simply there.
    reducedMotion?: boolean;
}

const LIGHT = 1.2;

// The first point as a share of the crack's box: a transform origin that holds whatever transforms the skin's SVG has.
function growFrom(points: readonly (readonly [number, number])[]): string {
    const xs = points.map(p => p[0]);
    const ys = points.map(p => p[1]);
    const [x0, y0] = [Math.min(...xs), Math.min(...ys)];
    const w = Math.max(...xs) + LIGHT - x0 || 1;
    const h = Math.max(...ys) + LIGHT - y0 || 1;
    return `${((points[0][0] - x0) / w) * 100}% ${((points[0][1] - y0) / h) * 100}%`;
}

/** Cracks as an SVG group, for a block or a cell inside a skin's own SVG. */
export function CrackLines({ x = 0, y = 0, width, height, stage, seed = 5, origin, reducedMotion = false }: CrackLinesProps) {
    const segs = useMemo(() => crackLines(width, height, seed, origin), [width, height, seed, origin]);
    if (stage === 0) return null;
    return (
        <g className={`spel-cracks is-stage-${stage}${reducedMotion ? ' is-still' : ''}`} transform={x || y ? `translate(${x} ${y})` : undefined} aria-hidden>
            {segs.filter(s => s.stage <= stage).map(s => (
                // Grows out of its own first point (only the newly added pieces play it).
                <g key={s.key} className="spel-crack" style={{ transformOrigin: growFrom(s.points) }}>
                    {/* A light edge beside the dark line: the crack reads as a dent in the surface. */}
                    <path className="spel-crack-light" d={s.d} transform={`translate(${LIGHT} ${LIGHT})`} />
                    <path className="spel-crack-ink" d={s.d} />
                </g>
            ))}
        </g>
    );
}

export interface CracksProps {
    stage: CrackStage;
    seed?: number;
    // Width ÷ height of the thing it covers, so the cracks are not stretched.
    aspect?: number;
    // The outline the cracks stay inside.
    shape?: 'rect' | 'ellipse';
    // rect corners, % of the width.
    radius?: number;
    origin?: readonly [number, number];
    reducedMotion?: boolean;
    className?: string;
}

/** Cracks over an HTML element: put it inside the (positioned) element; it fills it and never catches taps. */
export default function Cracks({ stage, seed = 5, aspect = 1, shape = 'rect', radius = 8, origin, reducedMotion = false, className }: CracksProps) {
    const clip = `spel-crack-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
    if (stage === 0) return null;
    const w = 100;
    const h = 100 / aspect;
    return (
        <svg className={`spel-cracks-over${className ? ` ${className}` : ''}`} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden>
            <defs>
                <clipPath id={clip}>
                    {shape === 'ellipse' ? <ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} /> : <rect width={w} height={h} rx={radius} />}
                </clipPath>
            </defs>
            <g clipPath={`url(#${clip})`}>
                <CrackLines width={w} height={h} stage={stage} seed={seed} origin={origin} reducedMotion={reducedMotion} />
            </g>
        </svg>
    );
}
