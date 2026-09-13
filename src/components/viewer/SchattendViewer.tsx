import type { MathBlock, SchattendExercise } from '../../services/math/types';
import { formatMathNumber } from '../../services/math/formatters';
import { targetsFor, roundTo } from '../../services/afronden/afrondenGenerator';
import FragmentableGrid from './FragmentableGrid';
import { fitCols, useBlockWidth } from './BlockWidthContext';
import { OP_GLYPH } from '../../services/math/formatters';
import type { SchattendConstraints } from '../../services/math/constraintTypes';
import { solutionText } from './solutionStyle';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

const mono = "'Azeret Mono', monospace";
// Sizes below are factors of the sheet tokens (--sheet-size-math / --sheet-size-text) so print scales with the docSettings sliders.

// Every exercise is the same CSS grid with the same explicit column widths, so ≈, the
// operator and the blanks line up down the block. It is per exercise rather than one grid
// over the block because a single grid does not fragment across pages (viewer rule 4);
// sharing the template string gives the same alignment without breaking that.
const chOf = (n: number) => `${n}ch`;

export default function SchattendViewer({ block, showSolutions }: Props) {
    const availableWidth = useBlockWidth();
    const exercises: SchattendExercise[] = block.schattendExercises || [];
    const c = block.constraints as SchattendConstraints;
    const numberType: string = c.numberType ?? 'natural';
    const scaffolding: string = c.scaffolding ?? 'tussenstappen';
    // 'lang' gives the estimate a write-line that runs to the end of the row — room for a
    // pupil who writes big; 'kort' keeps the compact blank that fits two exercises abreast.
    const answerLine: string = c.answerLine ?? 'kort';
    const gap = block.verticalSpacing || 14;
    const all = targetsFor(numberType);

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Nog geen oefeningen — klik Genereer)</div>;
    }

    const withSteps = scaffolding === 'tussenstappen';

    // Everything the row prints, computed once: the column widths below are the widest of
    // each of these across the block, so the settings decide the layout, not the roll.
    const rows = exercises.map(ex => {
        const t = all.find(x => x.key === ex.targetKey) ?? all[0];
        const ra = roundTo(ex.a, t.weight);
        // ×/: keep the small factor as-is; +/− round both operands.
        const roundsB = ex.operator === '+' || ex.operator === '-';
        const rb = roundsB ? roundTo(ex.b, t.weight) : ex.b;
        const estimate = ex.operator === '+' ? ra + rb
            : ex.operator === '-' ? ra - rb
            : ex.operator === 'x' ? Number((ra * rb).toFixed(6))
            : Number((ra / rb).toFixed(6));
        return {
            ex, t, ra, rb, roundsB, estimate,
            expr: `${formatMathNumber(ex.a)} ${OP_GLYPH[ex.operator]} ${formatMathNumber(ex.b)}`,
        };
    });

    const widest = (f: (r: typeof rows[number]) => string) => Math.max(...rows.map(r => f(r).length));
    // +2 for the brackets around the target key, +1 so a blank is never tighter than what
    // the solution overlay prints in it.
    const targetCh = widest(r => r.t.key) + 2;
    const exprCh = widest(r => r.expr);
    const raCh = widest(r => formatMathNumber(r.ra)) + 1;
    const rbCh = widest(r => formatMathNumber(r.rb)) + 1;
    const estCh = widest(r => formatMathNumber(r.estimate)) + 1;

    const template = [
        chOf(targetCh), chOf(exprCh), 'auto',
        ...(withSteps ? [chOf(raCh), 'auto', chOf(rbCh), 'auto'] : []),
        answerLine === 'lang' ? '1fr' : chOf(estCh),
    ].join(' ');

    // The grid cell already carries the width, so the line simply fills it.
    const blank = (val: number) => showSolutions
        ? <span style={{ ...solutionText, textAlign: 'center' }}>{formatMathNumber(val)}</span>
        : <span style={{ borderBottom: '1.5px solid #000', height: '1.2em', display: 'inline-block', width: '100%' }} />;

    return (
        <FragmentableGrid
            cols={withSteps || answerLine === 'lang' ? 1 : fitCols(availableWidth, 250, 2)}
            columnGap={24}
            rowGap={gap}
            items={rows.map(({ ex, t, ra, rb, roundsB, estimate, expr }) => (
                <div key={ex.id} className="print-exercise" style={{
                    // justifyContent start: an `auto` track is STRETCHED by the default
                    // `normal` when the row is wider than its content, which blew the ≈ and
                    // the operator columns across the whole page.
                    display: 'grid', gridTemplateColumns: template, alignItems: 'baseline', gap: '8px',
                    justifyContent: 'start',
                    fontFamily: mono, fontSize: 'calc(var(--sheet-size-math) * 0.92)',
                }}>
                    <span style={{ fontSize: 'calc(var(--sheet-size-math) * 0.7)', color: '#555' }}>({t.key})</span>
                    <span style={{ textAlign: 'right' }}>{expr}</span>
                    <span>≈</span>
                    {withSteps && (
                        <>
                            {blank(ra)}
                            <span style={{ textAlign: 'center' }}>{OP_GLYPH[ex.operator]}</span>
                            {roundsB ? blank(rb) : <span style={{ textAlign: 'center' }}>{formatMathNumber(ex.b)}</span>}
                            <span>≈</span>
                        </>
                    )}
                    {blank(estimate)}
                </div>
            ))}
        />
    );
}
