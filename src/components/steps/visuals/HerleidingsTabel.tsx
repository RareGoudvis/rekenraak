import type { HerleidingExercise } from '../../../services/math/types';
import { herleidTabel } from '../../../services/steps/herleidingSteps';
import type { StepsVisualProps } from '../stepsVisual';
import './herleidingsTabel.css';

// The herleidingstabel, filled in as the pupil answers: the given parts land in their columns, arrows
// count the steps to the asked unit, the empty boxes get their 0 and the answer's boxes light up.
export default function HerleidingsTabel({ data: ex, lines, revealed }: StepsVisualProps<HerleidingExercise>) {
    const t = lines.length ? herleidTabel(ex) : null;
    if (!t) return null;
    const shown = new Set(lines.slice(0, revealed).map(l => String(l.mark)));
    const placed = (part: number) => shown.has(`plaats:${part}`);
    const reading = shown.has('lees') || shown.has('klaar');
    const stepping = shown.has('stappen');
    const colIdx = (key: string) => t.cols.findIndex(c => c.key === key || c.alias === key);
    const from = colIdx(ex.fromParts[0].key), to = colIdx(ex.toParts[0].key);
    const readOf = (pos: number) => t.reads.findIndex((r, k) => (pos >= r.lo && pos <= r.hi) || (k === t.reads.length - 1 && t.fracLo !== undefined && pos < r.lo && pos >= t.fracLo));
    const last = t.reads[t.reads.length - 1];
    return (
        <div className="steps-herl" aria-hidden="true">
            <table>
                <thead>
                    <tr>
                        {t.cols.map(c => (
                            <th key={c.key} colSpan={t.width} className={(stepping || reading) && t.target.includes(c.key) ? 'is-target' : undefined}>
                                {c.key}{c.alias && <small>{c.alias}</small>}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        {t.cells.map(cell => {
                            const visible = cell.zero ? shown.has('nullen') : cell.part !== undefined && placed(cell.part);
                            const read = reading && visible ? readOf(cell.pos) : -1;
                            const cls = [
                                t.width > 1 && cell.pos % t.width === 1 ? 'is-inner' : '',
                                cell.zero ? 'is-zero' : '',
                                read >= 0 ? 'is-read' : '',
                                reading && t.fracLo !== undefined && cell.pos === last.lo ? 'is-comma' : '',
                            ].filter(Boolean).join(' ');
                            return <td key={cell.pos} className={cls || undefined} data-read={read >= 0 ? read % 3 : undefined}>{visible ? cell.digit : ''}</td>;
                        })}
                    </tr>
                    {stepping && from >= 0 && to >= 0 && from !== to && (
                        <tr className="steps-herl-arrows">
                            {t.cols.map((c, i) => (
                                <td key={c.key} colSpan={t.width}>{to > from ? (i > from && i <= to ? '→' : '') : (i >= to && i < from ? '←' : '')}</td>
                            ))}
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
