import type { MathBlock, VerbandExercise, VerbandRep } from '../../services/math/types';
import { formatMathNumber } from '../../services/math/formatters';
import { fractionToDecimal, fractionToPercent } from '../../services/verbanden/verbandenGenerator';
import VerticalFraction from './VerticalFraction';
import FragmentableGrid from './FragmentableGrid';
import type { VerbandenConstraints } from '../../services/math/constraintTypes';
import { SOL } from './solutionStyle';
import { ANSWER_LINE_H, ANSWER_ROW_H } from './BlockWidthContext';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

const mono = "'Azeret Mono', monospace";
const SALMON = '#f4cbb8';
// Sizes below are factors of the sheet tokens (--sheet-size-math / --sheet-size-text) so print scales with the docSettings sliders.
const REP_LABEL: Record<VerbandRep, string> = { breuk: 'breuk', decimaal: 'kommagetal', procent: 'procent' };

export default function VerbandenViewer({ block, showSolutions }: Props) {
    const exercises: VerbandExercise[] = block.verbandExercises || [];
    const c = block.constraints as VerbandenConstraints;
    const subType: string = c.subType ?? 'tabel';
    const reps: VerbandRep[] = c.reps ?? ['breuk', 'decimaal', 'procent'];
    const gap = block.verticalSpacing || 14;

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Nog geen oefeningen — klik Genereer)</div>;
    }

    const renderRep = (ex: VerbandExercise, rep: VerbandRep, solution: boolean) => {
        const color = solution ? SOL : undefined;
        if (rep === 'breuk') return <VerticalFraction value={ex.fraction} color={color} fontSize={13} mono />;
        if (rep === 'decimaal') return <span style={{ color }}>{formatMathNumber(fractionToDecimal(ex.fraction))}</span>;
        return <span style={{ color }}>{formatMathNumber(fractionToPercent(ex.fraction))} %</span>;
    };

    // ── PAREN: "3/4 = ___ %" aligned lines ─────────────────────────────────────
    if (subType === 'paren') {
        return (
            <FragmentableGrid
                cols={2}
                columnGap={24}
                rowGap={gap}
                items={exercises.map(ex => {
                    const target = ex.target ?? reps.find(r => r !== ex.given) ?? 'decimaal';
                    return (
                        <div key={ex.id} className="print-exercise" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: mono, fontSize: 'calc(var(--sheet-size-math) * 0.87)' }}>
                            <span style={{ minWidth: '64px', display: 'inline-flex', justifyContent: 'flex-end' }}>{renderRep(ex, ex.given, false)}</span>
                            <span>=</span>
                            {showSolutions
                                ? renderRep(ex, target, true)
                                : <span style={{ borderBottom: '1.5px solid #000', minWidth: '64px', height: ANSWER_LINE_H, display: 'inline-block' }} />}
                            {!showSolutions && <span style={{ fontSize: 'calc(var(--sheet-size-text) * 0.55)', color: '#555' }}>({REP_LABEL[target]})</span>}
                        </div>
                    );
                })}
            />
        );
    }

    // ── TABEL: rooster breuk | kommagetal | procent, one cell given per row ────
    const cell: React.CSSProperties = {
        border: '1px solid #000', minHeight: ANSWER_ROW_H, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontFamily: mono, fontSize: 'calc(var(--sheet-size-math) * 0.81)', boxSizing: 'border-box', padding: '2px 6px',
    };
    // Column width in `ch` (mono, so exact) off the widest value THIS rep actually prints,
    // not a fixed 220px split evenly — that let a 3-column breuk·decimaal·procent table
    // overflow a ½ column even though every value in it is a few characters wide.
    const charsFor = (rep: VerbandRep, ex: VerbandExercise): number => {
        if (rep === 'breuk') {
            const parts = [String(ex.fraction.n), String(ex.fraction.d)];
            return Math.max(...parts.map(s => s.length)) + (ex.fraction.whole ? String(ex.fraction.whole).length + 1 : 0);
        }
        if (rep === 'decimaal') return String(formatMathNumber(fractionToDecimal(ex.fraction))).length;
        return String(formatMathNumber(fractionToPercent(ex.fraction))).length + 2; // + ' %'
    };
    const grid = reps.map(rep => {
        // The header label (e.g. "kommagetal") prints in a smaller font than the values, so
        // its own char count is a generous — never tight — floor against the smaller values.
        const chars = Math.max(2, REP_LABEL[rep].length, ...exercises.map(ex => charsFor(rep, ex)));
        return `${Math.min(14, chars + 2)}ch`; // +2ch padding, capped so it never sprawls
    }).join(' ');
    // `ch` in gridTemplateColumns resolves against the GRID CONTAINER's own font, not the
    // cells inside it — without this, the tracks were sized off the page's default font
    // and clipped the (mono) header labels ("kommagetal") that are wider than the values.
    const gridFont: React.CSSProperties = { fontFamily: mono, fontSize: 'calc(var(--sheet-size-math) * 0.81)' };
    return (
        <div className="print-exercise" style={{ width: 'fit-content' }}>
            <div style={{ display: 'grid', gridTemplateColumns: grid, ...gridFont }}>
                {reps.map(rep => <div key={rep} style={{ ...cell, backgroundColor: SALMON, fontWeight: 'bold', fontSize: 'calc(var(--sheet-size-text) * 0.6)' }}>{REP_LABEL[rep]}</div>)}
            </div>
            {exercises.map(ex => (
                <div key={ex.id} style={{ display: 'grid', gridTemplateColumns: grid, ...gridFont }}>
                    {reps.map(rep => (
                        <div key={rep} style={cell}>
                            {rep === ex.given ? renderRep(ex, rep, false) : showSolutions ? renderRep(ex, rep, true) : ''}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}
