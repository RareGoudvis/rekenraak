import type { AfrondenExercise } from '../../../services/math/types';
import { formatMathNumber } from '../../../services/math/formatters';
import { afrondenParts, afrondenTarget, decimalsOfWeight, placeExp } from '../../../services/steps/afrondenSteps';
import type { StepsVisualProps } from '../stepsVisual';
import { arrowHead } from './svgArrow';
import './afronden.css';

// SVG user units; the picture scales to its box.
const W = 320, X0 = 34, X1 = 286, AXIS_Y = 62;

// The number with each digit's power of ten, so a place can be marked ("347": 3 → 2, 4 → 1, 7 → 0).
function digitsWithPlace(text: string): { ch: string; exp: number | null }[] {
    const comma = text.indexOf(',');
    const intEnd = comma < 0 ? text.length : comma;
    let intDigitsRight = [...text.slice(0, intEnd)].filter(ch => /\d/.test(ch)).length;
    let decimals = 0;
    return [...text].map((ch, i) => {
        if (!/\d/.test(ch)) return { ch, exp: null };
        if (i < intEnd) return { ch, exp: --intDigitsRight };
        return { ch, exp: -++decimals };
    });
}

// The number with the target's place underlined (after question 1) and the deciding digit marked (after 2),
// above a number line between the two round neighbours that fills in with the answers.
export default function AfrondenLine({ data: ex, lines, revealed }: StepsVisualProps<AfrondenExercise>) {
    const n = ex?.number;
    const first = lines[0];
    if (typeof n !== 'number' || !first || !String(first.kind).startsWith('afronden.')) return null;
    const t = afrondenTarget({ targetKey: typeof first.mark === 'string' ? first.mark : ex.targetKey });
    const exp = placeExp(t.weight);
    const text = formatMathNumber(n, ex.decimalPlaces);
    const number = (
        <div className="sv-afr-number" aria-hidden="true">
            {digitsWithPlace(text).map((d, i) => (
                <span key={i} className={`${revealed >= 1 && d.exp === exp ? ' is-place' : ''}${revealed >= 2 && d.exp === exp - 1 ? ' is-decider' : ''}`.trim() || undefined}>{d.ch}</span>
            ))}
        </div>
    );
    if (first.kind === 'afronden.al') return <div className="sv-afr">{number}</div>;

    const { lower, upper, rounded } = afrondenParts(n, t);
    const td = decimalsOfWeight(t.weight);
    const label = (v: number) => formatMathNumber(v, td || undefined);
    const x = X0 + ((n - lower) / t.weight) * (X1 - X0);
    const known = revealed >= 1;
    const done = revealed >= 3;
    const toX = rounded === upper ? X1 : X0;
    return (
        <div className="sv-afr">
            {number}
            <svg className="sv-afr-line" viewBox={`0 0 ${W} 104`} role="img" aria-label={known ? `${text} ligt tussen ${label(lower)} en ${label(upper)}` : `${text} op een getallenlijn`}>
                <line x1={X0 - 16} y1={AXIS_Y} x2={X1 + 16} y2={AXIS_Y} className="sv-afr-axis" />
                {[X0, X1].map((tx, i) => (
                    <g key={tx}>
                        <line x1={tx} y1={AXIS_Y - 10} x2={tx} y2={AXIS_Y + 10} className="sv-afr-axis" />
                        <text x={tx} y={AXIS_Y + 30} textAnchor="middle" className={`sv-afr-end${done && tx === toX ? ' is-chosen' : ''}`}>{known ? label(i ? upper : lower) : '?'}</text>
                    </g>
                ))}
                <line x1={(X0 + X1) / 2} y1={AXIS_Y - 6} x2={(X0 + X1) / 2} y2={AXIS_Y + 6} className="sv-afr-axis" />
                {known && <text x={(X0 + X1) / 2} y={AXIS_Y + 26} textAnchor="middle" className="sv-afr-mid">{formatMathNumber(Number((lower + t.weight / 2).toFixed(6)))}</text>}
                {known && (
                    <g>
                        {/* The way to the rounded value, along the line: readable even when the number sits near that end. */}
                        {done && <path d={`M${x},${AXIS_Y} L${toX},${AXIS_Y} ${arrowHead(x, AXIS_Y, toX, AXIS_Y, 10)}`} className="sv-afr-jump" />}
                        <circle cx={x} cy={AXIS_Y} r={6} className="sv-afr-dot" />
                        <text x={x} y={AXIS_Y - 16} textAnchor="middle" className="sv-afr-n">{done ? '' : text}</text>
                    </g>
                )}
            </svg>
        </div>
    );
}
