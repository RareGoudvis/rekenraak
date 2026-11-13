import type { ClockExercise } from '../../../services/math/types';
import { parseCountMark } from '../../../services/steps/klokSteps';
import type { StepsVisualProps } from '../stepsVisual';
import './KlokBloemblaadjes.css';

// A clock face that follows the klok breukvragen: the kleine wijzer stands out once it is asked about, the
// grote wijzer next, and the counted minutes grow as "bloemblaadjes" (petals) around the rim: one per 5
// minutes (one cijfer), then one dot per single minute, clockwise or back from the 12 or the 6.
// SYNC: hand geometry as in AnalogClockSVG (not imported: the face here needs room for the petals).

const C = 130;        // centre of the 260 × 260 viewBox
const R = 84;         // face radius
const PETAL = 34;     // how far a 5-minute petal reaches beyond the rim

const rad = (deg: number) => (deg * Math.PI) / 180;
const at = (deg: number, r: number) => ({ x: C + Math.sin(rad(deg)) * r, y: C - Math.cos(rad(deg)) * r });
const pt = (p: { x: number; y: number }) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`;

// An almond from the rim at minute a to the rim at minute b, bulging outward.
function petalPath(a: number, b: number, reach: number): string {
    const da = a * 6, db = b * 6;
    const tip = at((da + db) / 2, R + reach);
    return `M ${pt(at(da, R + 1))} Q ${pt(at(da, R + reach * 0.85))} ${pt(tip)} Q ${pt(at(db, R + reach * 0.85))} ${pt(at(db, R + 1))} Z`;
}

export default function KlokBloemblaadjes({ data: ex, lines, revealed }: StepsVisualProps<ClockExercise>) {
    if (!ex || !Number.isInteger(ex.hours) || !Number.isInteger(ex.minutes)) return null;
    const idxOf = (pred: (mark: unknown) => boolean) => lines.findIndex(l => pred(l.mark));
    const hIdx = idxOf(mk => mk === 'h');
    const mIdx = idxOf(mk => mk === 'm');
    const tIdx = idxOf(mk => parseCountMark(mk) !== null);
    if (hIdx < 0) return null;
    // Lezen / omzetten on an analoge klok: the hands are printed, so the face shows them from the start.
    const given = (ex.clockType ?? 'analoog') === 'analoog' && (ex.exerciseMode ?? 'lezen') !== 'tekenen';
    const reached = (i: number) => i >= 0 && i <= revealed;
    const answered = (i: number) => i >= 0 && i < revealed;
    const showKleine = given || answered(hIdx);
    const showGrote = given || answered(mIdx) || answered(tIdx);
    const hotKleine = given ? reached(hIdx) : showKleine;
    const hotGrote = given ? reached(mIdx) || reached(tIdx) : showGrote;
    const count = answered(tIdx) ? parseCountMark(lines[tIdx].mark) : null;

    const petals: { d: string; label: { x: number; y: number; text: string } }[] = [];
    const dots: { x: number; y: number; label?: { x: number; y: number; text: string } }[] = [];
    if (count) {
        const fives = Math.floor(count.n / 5);
        for (let k = 0; k < fives; k++) {
            const a = count.start + count.dir * 5 * k, b = count.start + count.dir * 5 * (k + 1);
            petals.push({ d: petalPath(Math.min(a, b), Math.max(a, b), PETAL), label: { ...at(((a + b) / 2) * 6, R + PETAL * 0.5), text: String(5 * (k + 1)) } });
        }
        // A single minute is a dot on the tick it reaches; the last one carries the total, where the grote wijzer stands.
        for (let j = 1; j <= count.n % 5; j++) {
            const minute = count.start + count.dir * (5 * fives + j);
            const last = j === count.n % 5;
            dots.push({ ...at(minute * 6, R + 9), label: last ? { ...at(minute * 6, R + 26), text: String(count.n) } : undefined });
        }
    }

    const hourAngle = (ex.hours % 12) * 30 + ex.minutes / 2;
    const hourEnd = at(hourAngle, R * 0.52);
    const minuteEnd = at(ex.minutes * 6, R * 0.8);
    return (
        <svg className="klok-bb" viewBox="0 0 260 260" role="img" aria-label="klok">
            {petals.map((p, i) => <path key={`p${i}`} d={p.d} className="klok-bb-petal" />)}
            {dots.map((d, i) => <circle key={`d${i}`} cx={d.x} cy={d.y} r={4.5} className="klok-bb-dot" />)}
            <circle cx={C} cy={C} r={R} className="klok-bb-face" />
            {Array.from({ length: 60 }, (_, i) => {
                const outer = at(i * 6, R - 2), inner = at(i * 6, R - (i % 5 === 0 ? 10 : 5));
                return <line key={`t${i}`} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} className={i % 5 === 0 ? 'klok-bb-tick is-hour' : 'klok-bb-tick'} />;
            })}
            {Array.from({ length: 12 }, (_, i) => {
                const p = at(i * 30, R * 0.74);
                const q = at(i * 30, R * 0.5);
                return (
                    <g key={`n${i}`}>
                        <text x={p.x} y={p.y} className="klok-bb-num">{i || 12}</text>
                        {ex.is24hour && <text x={q.x} y={q.y} className="klok-bb-num is-24">{(i || 12) + 12}</text>}
                    </g>
                );
            })}
            {[...petals, ...dots].map((p, i) => p.label && <text key={`l${i}`} x={p.label.x} y={p.label.y} className="klok-bb-count">{p.label.text}</text>)}
            {showKleine && <line x1={C} y1={C} x2={hourEnd.x} y2={hourEnd.y} className={`klok-bb-hand is-kleine${hotKleine ? ' is-hot' : ''}`} />}
            {showGrote && <line x1={C} y1={C} x2={minuteEnd.x} y2={minuteEnd.y} className={`klok-bb-hand is-grote${hotGrote ? ' is-hot' : ''}`} />}
            <circle cx={C} cy={C} r={4} className="klok-bb-pin" />
        </svg>
    );
}
