import type { ReactNode } from 'react';
import {
    breukAriaLabel, clampBreuk, reepLayout, spotsIn, strookCells, wedgePath, wedgesOf, BOX, CENTER,
    type BreukKind, type Wedge,
} from './breukGeometry';
import './breukPicture.css';

export interface BreukPictureProps {
    // Coloured parts, 0..d (the first n, clockwise from 12 o'clock or row by row).
    n: number;
    // Equal parts, 2..12.
    d: number;
    kind: BreukKind;
    // Width and height in px (the picture is square); default 160.
    size?: number;
    className?: string;
}

// Radii of the round kinds (user units in a 100 box).
const PIZZA_R = 46, SAUCE_R = 39, CHEESE_R = 36;
const PLATE_R = 48.5, CAKE_R = 43;
const PIE_R = 46;

// The outline of every part sits on top of all fills, so each cut is one crisp ink line;
// data-part / data-on let the tests count the parts and the coloured ones.
const outline = (key: number, on: boolean, shape: ReactNode) => (
    <g key={`o${key}`} className="bp-cut" data-part={key} data-on={on ? 'true' : 'false'}>{shape}</g>
);

function Pizza({ n, d }: { n: number; d: number }) {
    const ws = wedgesOf(d);
    return (
        <>
            {ws.map((w, i) => <path key={`b${i}`} className={i < n ? 'bp-crust' : 'bp-dough'} d={wedgePath(PIZZA_R, w)} />)}
            {ws.map((w, i) => i < n && (
                <g key={`t${i}`}>
                    <path className="bp-sauce" d={wedgePath(SAUCE_R, w)} />
                    <path className="bp-cheese" d={wedgePath(CHEESE_R, w)} />
                    {spotsIn(w, [26, 13], 17, 5.5, 4.2).map((s, k) => (
                        <g key={k}>
                            <circle className="bp-salami" cx={s.x} cy={s.y} r={s.r} />
                            <circle className="bp-salami-dot" cx={s.x - s.r * 0.3} cy={s.y - s.r * 0.25} r={s.r * 0.22} />
                        </g>
                    ))}
                </g>
            ))}
            {ws.map((w, i) => outline(i, i < n, <path d={wedgePath(PIZZA_R, w)} />))}
            <circle className="bp-rim" cx={CENTER} cy={CENTER} r={PIZZA_R} />
        </>
    );
}

function Taart({ n, d }: { n: number; d: number }) {
    const ws = wedgesOf(d);
    const cherry = (w: Wedge) => spotsIn(w, [29], 40, 5.5, 2.5);
    return (
        <>
            <circle className="bp-plate" cx={CENTER} cy={CENTER} r={PLATE_R} />
            {ws.map((w, i) => <path key={`b${i}`} className={i < n ? 'bp-icing' : 'bp-sponge'} d={wedgePath(CAKE_R, w)} />)}
            {ws.map((w, i) => i < n && (
                <g key={`t${i}`}>
                    {spotsIn(w, [38.5], 11, 2.8, 1.8).map((s, k) => <circle key={`c${k}`} className="bp-cream" cx={s.x} cy={s.y} r={s.r} />)}
                    {cherry(w).map((s, k) => (
                        <g key={`h${k}`}>
                            <circle className="bp-cherry" cx={s.x} cy={s.y} r={s.r} />
                            <circle className="bp-shine" cx={s.x - s.r * 0.35} cy={s.y - s.r * 0.35} r={s.r * 0.28} />
                        </g>
                    ))}
                </g>
            ))}
            {ws.map((w, i) => outline(i, i < n, <path d={wedgePath(CAKE_R, w)} />))}
            <circle className="bp-rim" cx={CENTER} cy={CENTER} r={CAKE_R} />
        </>
    );
}

function Cirkel({ n, d }: { n: number; d: number }) {
    const ws = wedgesOf(d);
    return (
        <>
            {ws.map((w, i) => <path key={`b${i}`} className={i < n ? 'bp-pie-on' : 'bp-pie-off'} d={wedgePath(PIE_R, w)} />)}
            {ws.map((w, i) => outline(i, i < n, <path d={wedgePath(PIE_R, w)} />))}
            <circle className="bp-rim" cx={CENTER} cy={CENTER} r={PIE_R} />
        </>
    );
}

function Reep({ n, d }: { n: number; d: number }) {
    const { frame, pieces } = reepLayout(d);
    return (
        <>
            <rect className="bp-bar" x={frame.x} y={frame.y} width={frame.w} height={frame.h} rx={4} />
            {pieces.map((p, i) => {
                const on = i < n, inset = Math.min(p.w, p.h) * 0.2;
                return (
                    <g key={i}>
                        <rect className={on ? 'bp-choc' : 'bp-white'} x={p.x} y={p.y} width={p.w} height={p.h} rx={2} />
                        <rect className={on ? 'bp-choc-top' : 'bp-white-top'} x={p.x + inset} y={p.y + inset} width={p.w - 2 * inset} height={p.h - 2 * inset} rx={1.5} />
                        {outline(i, on, <rect x={p.x} y={p.y} width={p.w} height={p.h} rx={2} />)}
                    </g>
                );
            })}
            <rect className="bp-rim" x={frame.x} y={frame.y} width={frame.w} height={frame.h} rx={4} />
        </>
    );
}

function Strook({ n, d }: { n: number; d: number }) {
    const cells = strookCells(d);
    const first = cells[0], last = cells[cells.length - 1];
    return (
        <>
            {cells.map((c, i) => <rect key={`b${i}`} className={i < n ? 'bp-strip-on' : 'bp-strip-off'} x={c.x} y={c.y} width={c.w} height={c.h} />)}
            {cells.map((c, i) => outline(i, i < n, <rect x={c.x} y={c.y} width={c.w} height={c.h} />))}
            <rect className="bp-rim" x={first.x} y={first.y} width={last.x + last.w - first.x} height={first.h} rx={1} />
        </>
    );
}

const DRAW: Readonly<Record<BreukKind, (p: { n: number; d: number }) => ReactNode>> = {
    pizza: Pizza, taart: Taart, reep: Reep, strook: Strook, cirkel: Cirkel,
};

/** A breuk as a friendly picture: d visibly equal parts, n of them coloured. No text inside. */
export default function BreukPicture({ n: rawN, d: rawD, kind, size = 160, className = '' }: BreukPictureProps) {
    const { n, d } = clampBreuk(rawN, rawD);
    return (
        <svg
            className={`breuk-pic breuk-pic-${kind}${className ? ` ${className}` : ''}`}
            width={size} height={size} viewBox={`0 0 ${BOX} ${BOX}`}
            role="img" aria-label={breukAriaLabel(kind, n, d)} data-kind={kind} data-n={n} data-d={d}
        >
            {DRAW[kind]({ n, d })}
        </svg>
    );
}
