import type { MathBlock } from '../../services/math/types';
import FragmentableGrid from './FragmentableGrid';
import { useBlockWidth, ANSWER_LINE_H, ANSWER_ROW_H } from './BlockWidthContext';
import type { DeelbaarheidConstraints } from '../../services/math/constraintTypes';
import { solutionText } from './solutionStyle';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

const mono = "'Azeret Mono', monospace";
const SALMON = '#f4cbb8';
// Sizes below are factors of the sheet tokens (--sheet-size-math / --sheet-size-text) so print scales with the docSettings sliders.

export default function DeelbaarheidViewer({ block, showSolutions }: Props) {
    const A4_CONTENT_PX = useBlockWidth();
    const exercises = block.deelbaarheidExercises || [];
    const c = block.constraints as DeelbaarheidConstraints;
    const layout = c.layout || 'tabel';
    const divisors: number[] = c.divisors || [2, 5, 10];
    const gap = block.verticalSpacing || 14;

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Nog geen oefeningen — klik Genereer)</div>;
    }

    // ── Veelvouden: a fill-in multiples row per exercise ──────────────────────
    if (layout === 'veelvouden') {
        // A wrapped sequence looks like a mistake ("why did the row break there?"), so cap
        // how many terms are PRINTED to what the column actually holds (~56px per term
        // including its gap and dash) instead of letting it wrap. "– (enz.)" always closes
        // the row, so trimming reads as "and so on" rather than as a cut-off answer.
        const maxTerms = Math.max(3, Math.floor((A4_CONTENT_PX - 60) / 56));
        return (
            <FragmentableGrid
                cols={1}
                rowGap={gap + 4}
                items={exercises.map((ex) => {
                    const seq = (ex.sequence || []).slice(0, maxTerms);
                    const given = ex.givenCount ?? 2;
                    return (
                        <div key={ex.id} className="print-exercise" style={{ fontFamily: mono }}>
                            <div style={{ marginBottom: '8px', fontSize: 'calc(var(--sheet-size-text) * 0.8)' }}>Vul de rij veelvouden van <strong>{ex.base}</strong> aan:</div>
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', flexWrap: 'nowrap', fontSize: 'calc(var(--sheet-size-math) * 0.92)' }}>
                                {seq.map((v, i) => (
                                    <span key={i} style={{ display: 'inline-flex', alignItems: 'flex-end', gap: '6px' }}>
                                        {i > 0 && <span>–</span>}
                                        {i < given
                                            ? <span>{v}</span>
                                            : (showSolutions
                                                ? <span style={solutionText}>{v}</span>
                                                : <span style={{ borderBottom: '1.5px solid #000', minWidth: '40px', height: ANSWER_LINE_H, display: 'inline-block' }} />)}
                                    </span>
                                ))}
                                <span>– (enz.)</span>
                            </div>
                        </div>
                    );
                })}
            />
        );
    }

    // ── Tabel, tight: one card per number with the divisors as chips ──────────
    // A shared header row plus a 150px number column needs ~400px; a quarter-width cell is
    // 163px. Below 200px the table becomes one small card per number and the "deelbaar
    // door" question moves into each chip, so the chips can wrap two to a line.
    if (A4_CONTENT_PX < 200) {
        const chip: React.CSSProperties = {
            display: 'flex', alignItems: 'stretch', border: '1px solid #000',
            fontFamily: mono, fontSize: 'calc(var(--sheet-size-math) * 0.75)', height: '26px', boxSizing: 'border-box',
        };
        return (
            <FragmentableGrid
                cols={1}
                rowGap={gap + 4}
                items={exercises.map((ex) => (
                    <div key={ex.id} className="print-exercise" style={{ fontFamily: mono, fontSize: 'calc(var(--sheet-size-math) * 0.92)' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{ex.number}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {divisors.map(d => (
                                <div key={d} style={chip}>
                                    <span style={{ backgroundColor: SALMON, fontWeight: 'bold', padding: '0 4px', display: 'flex', alignItems: 'center' }}>{d}?</span>
                                    <span style={{ width: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', ...solutionText }}>
                                        {showSolutions ? ((ex.number ?? 0) % d === 0 ? '✓' : '✗') : ''}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            />
        );
    }

    // ── Tabel: shared header + one tick-row per number ────────────────────────
    // Size columns to the printable width: the number column is as wide as the widest
    // number actually in the block (in `ch`, the monospace font makes that exact) rather
    // than a fixed 150px that only existed to hold the "deelbaar door:" label — dropped
    // below, since the divisor headers already say what the columns mean. Tick columns
    // share the rest (capped so few-divisor tables don't look stretched, shrunk so
    // 7-10 divisors never overflow and clip in print).
    const numberChars = Math.max(2, ...exercises.map(ex => String(ex.number ?? '').length));
    const numberColCh = numberChars + 2;
    const numberColPx = numberColCh * 8.5; // ~0.85em/ch at this font, for the tick-column budget below
    const tickColPx = Math.min(100, Math.floor((A4_CONTENT_PX - numberColPx) / divisors.length));
    const cols = `${numberColCh}ch ${divisors.map(() => `${tickColPx}px`).join(' ')}`;
    const cell: React.CSSProperties = {
        border: '1px solid #000', height: ANSWER_ROW_H, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontFamily: mono, fontSize: 'calc(var(--sheet-size-math) * 0.87)', boxSizing: 'border-box',
    };

    return (
        <div>
            {/* header: the number column has no label — the divisor headers say what the ticks mean */}
            <div className="print-row" style={{ display: 'grid', gridTemplateColumns: cols }}>
                <div style={{ ...cell, backgroundColor: SALMON }} />
                {divisors.map(d => (
                    <div key={d} style={{ ...cell, backgroundColor: SALMON, fontWeight: 'bold' }}>{d}?</div>
                ))}
            </div>
            {/* rows */}
            {exercises.map((ex) => (
                <div key={ex.id} className="print-row print-exercise" style={{ display: 'grid', gridTemplateColumns: cols }}>
                    <div style={{ ...cell, backgroundColor: SALMON, fontWeight: 'bold' }}>{ex.number}</div>
                    {divisors.map(d => (
                        <div key={d} style={{ ...cell, ...solutionText }}>
                            {showSolutions ? ((ex.number ?? 0) % d === 0 ? '✓' : '✗') : ''}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}
