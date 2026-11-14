import type { ReactNode } from 'react';
import { F } from './palette';

// Shared bits for the Verborgen prent pictures: the palette (prent.css --pf-* tokens) and a few face parts.
// Every picture is a PRENT_W × PRENT_H scene (palette.ts): <Prent> sets the outline style, the animal draws inside it.

/** A tube: an outlined thick line (a tentacle, an arm), drawn as an ink stroke under a coloured one. */
export function Tube({ d, w, color }: { d: string; w: number; color: string }) {
    return (
        <>
            <path d={d} className="ns" style={{ fill: 'none', stroke: 'var(--pf-ink)', strokeWidth: w + 8 }} />
            <path d={d} className="ns" style={{ fill: 'none', stroke: `var(--pf-${color})`, strokeWidth: w }} />
        </>
    );
}

/** A friendly eye: white, a big pupil looking (dx, dy), a highlight. */
export function Eye({ x, y, r = 13, dx = 0, dy = 1 }: { x: number; y: number; r?: number; dx?: number; dy?: number }) {
    return (
        <g>
            <circle cx={x} cy={y} r={r} style={F.white} />
            <circle className="ns" cx={x + dx} cy={y + dy} r={r * 0.55} style={F.ink} />
            <circle className="ns" cx={x + dx + r * 0.22} cy={y + dy - r * 0.25} r={r * 0.2} style={F.white} />
        </g>
    );
}

/** A closed happy eye (a sleeping sloth, a laughing frog). */
export function HappyEye({ x, y, r = 9 }: { x: number; y: number; r?: number }) {
    return <path d={`M${x - r} ${y + 2} Q${x} ${y - r} ${x + r} ${y + 2}`} style={F.none} />;
}

export function Cheek({ x, y, rx = 10, ry = 6 }: { x: number; y: number; rx?: number; ry?: number }) {
    return <ellipse className="ns" cx={x} cy={y} rx={rx} ry={ry} style={F.cheek} />;
}

export function Cloud({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
    return (
        <path transform={`translate(${x} ${y}) scale(${s})`} style={F.white}
            d="M0 20 Q-12 20 -10 9 Q-8 0 4 2 Q6 -12 22 -10 Q32 -20 44 -12 Q58 -16 60 -2 Q74 -2 74 10 Q75 20 62 20 Z" />
    );
}

export function Sun({ x, y, r = 26 }: { x: number; y: number; r?: number }) {
    return <circle cx={x} cy={y} r={r} style={F.sun} />;
}

/** The picture's frame of style: thick dark outlines, round joins; children draw the scene. */
export function Prent({ children, label }: { children: ReactNode; label: string }) {
    return (
        <g className="prent-art" data-prent={label}>
            {children}
        </g>
    );
}
