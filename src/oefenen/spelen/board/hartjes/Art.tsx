import { useId } from 'react';
import type { CardLook } from './hearts';

// The card art of Hartjes koppelen, one 100 × 94 viewBox per card: a heart (broken in two halves after a
// logged mistake, a plaster over the crack once paired) or a football (flat after a mistake, plastered and
// round again once paired). Flat fills under the --spel-ink outline (hartjes.css).

export const HEART = 'M50 90 C22 70 4 54 4 32 C4 15 16 4 30 4 C40 4 46 10 50 19 C54 10 60 4 70 4 C84 4 96 15 96 32 C96 54 78 70 50 90 Z';
// The jagged crack from the notch to the tip, and the two halves it cuts the heart into.
const CRACK = 'M50 15 L45 28 L55 40 L46 52 L54 63 L47 75 L50 93';
const CRACK_PTS = 'L50 15 L45 28 L55 40 L46 52 L54 63 L47 75 L50 93 L50 110';
const HALF_L = `M-10 -10 L50 -10 ${CRACK_PTS} L-10 110 Z`;
const HALF_R = `M110 -10 L50 -10 ${CRACK_PTS} L110 110 Z`;

// A football: a centre pentagon, five half-hidden ones at the rim, the seams between them.
const BALL = { cx: 50, cy: 47, r: 43 };
const at = (deg: number, r: number): [number, number] => [BALL.cx + r * Math.cos((deg * Math.PI) / 180), BALL.cy + r * Math.sin((deg * Math.PI) / 180)];
const poly = (pts: [number, number][]) => `M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L')} Z`;
const pentagon = (cx: number, cy: number, r: number, turn: number): [number, number][] =>
    Array.from({ length: 5 }, (_, m) => [cx + r * Math.cos(((turn + 72 * m) * Math.PI) / 180), cy + r * Math.sin(((turn + 72 * m) * Math.PI) / 180)]);
const CENTRE = pentagon(BALL.cx, BALL.cy, 13, -90);
// A rim pentagon sits out from each centre corner, pointing in; the white hexagons lie between them.
const RIM = CENTRE.map((_, k) => { const a = -90 + 72 * k; const [x, y] = at(a, 40); return pentagon(x, y, 12, a + 180); });
// The seams from each centre corner out to its rim pentagon (the hexagons run on to the rim).
const SEAMS = RIM.map((p, k) => `M${CENTRE[k][0].toFixed(1)} ${CENTRE[k][1].toFixed(1)} L${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`).join(' ');
const CENTRE_PATH = poly(CENTRE);
const RIM_PATH = RIM.map(poly).join(' ');

/** A sticking plaster: a rounded band with a pad in the middle and little air holes. */
function Plaster({ x, y, turn, length = 40 }: { x: number; y: number; turn: number; length?: number }) {
    const h = length / 2;
    return (
        <g transform={`translate(${x} ${y}) rotate(${turn})`}>
            <g className="hj-plaster">
                <rect className="hj-plaster-band" x={-h} y={-7} width={length} height={14} rx={7} />
                <rect className="hj-plaster-pad" x={-6.5} y={-5} width={13} height={10} rx={2} />
                {[h - 5, h - 9.5].flatMap(d => [-d, d]).flatMap(dx => [-2.6, 2.6].map(dy => <circle key={`${dx} ${dy}`} className="hj-plaster-dot" cx={dx} cy={dy} r={1} />))}
            </g>
        </g>
    );
}

export function HeartArt({ side, look }: { side: 'back' | 'front'; look: CardLook }) {
    const id = useId();
    const body = (
        <>
            <path className={side === 'back' ? 'hj-heart-back' : 'hj-heart-front'} d={HEART} />
            {side === 'back' && <path className="hj-heart-mini" transform="translate(32 28) scale(.36)" d={HEART} />}
        </>
    );
    if (look === 'whole') return <svg className="hj-heart" viewBox="0 0 100 94">{body}</svg>;
    return (
        <svg className={`hj-heart is-${look}`} viewBox="0 0 100 94">
            <defs>
                <clipPath id={`${id}l`}><path d={HALF_L} /></clipPath>
                <clipPath id={`${id}r`}><path d={HALF_R} /></clipPath>
                <clipPath id={`${id}h`}><path d={HEART} /></clipPath>
            </defs>
            {(['l', 'r'] as const).map(h => (
                <g key={h} className={`hj-half is-${h}`}>
                    <g clipPath={`url(#${id}${h})`}>
                        {body}
                        <path className="hj-crack-edge" d={CRACK} clipPath={`url(#${id}h)`} />
                    </g>
                </g>
            ))}
            {look === 'patched' && <Plaster x={51} y={68} turn={-32} />}
        </svg>
    );
}

export function BallArt({ side, look }: { side: 'back' | 'front'; look: CardLook }) {
    const id = useId();
    return (
        <svg className={`hj-heart hj-ball is-${look}`} viewBox="0 0 100 94">
            <defs><clipPath id={`${id}c`}><circle cx={BALL.cx} cy={BALL.cy} r={BALL.r} /></clipPath></defs>
            <g className="hj-ball-body">
                <circle className={side === 'back' ? 'hj-ball-back' : 'hj-ball-front'} cx={BALL.cx} cy={BALL.cy} r={BALL.r} />
                <g clipPath={`url(#${id}c)`}>
                    <path className="hj-ball-patch" d={side === 'back' ? `${CENTRE_PATH} ${RIM_PATH}` : RIM_PATH} />
                    {side === 'back' && <path className="hj-ball-seam" d={SEAMS} />}
                </g>
                <circle className="hj-ball-rim" cx={BALL.cx} cy={BALL.cy} r={BALL.r} />
                {look === 'broken' && <path className="hj-ball-crease" d="M28 14 Q50 30 72 14" />}
            </g>
            {look === 'patched' && <Plaster x={70} y={70} turn={-35} length={34} />}
        </svg>
    );
}

/** The small pair counter above the board: a heart or a ball per pair. */
export function CountMark({ ball, on }: { ball: boolean; on: boolean }) {
    return ball
        ? <svg className={`hj-dot is-ball${on ? ' is-on' : ''}`} viewBox="0 0 100 94" aria-hidden><circle cx={BALL.cx} cy={BALL.cy} r={BALL.r} /><path className="hj-dot-patch" d={CENTRE_PATH} /></svg>
        : <svg className={`hj-dot${on ? ' is-on' : ''}`} viewBox="0 0 100 94" aria-hidden><path d={HEART} /></svg>;
}
