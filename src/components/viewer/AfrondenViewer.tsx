import type { MathBlock, AfrondenExercise } from '../../services/math/types';
import { formatMathNumber } from '../../services/math/formatters';
import { targetsFor, roundTo, usableTargets, targetHeading } from '../../services/afronden/afrondenGenerator';
import FragmentableGrid from './FragmentableGrid';
import { useBlockWidth, useSheetSizePx, fitCols, ANSWER_LINE_H, ANSWER_ROW_H } from './BlockWidthContext';
import { grownColumn, splitColumns } from '../../services/layout/blockLayout';
import type { AfrondenConstraints } from '../../services/math/constraintTypes';
import { solutionText } from './solutionStyle';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

const mono = "'Azeret Mono', monospace";
const SALMON = '#f4cbb8';
// Sizes below are factors of the sheet tokens (--sheet-size-math / --sheet-size-text) so print scales with the docSettings sliders.

export default function AfrondenViewer({ block, showSolutions }: Props) {
    const A4_CONTENT_PX = useBlockWidth();
    const mathPx = useSheetSizePx('math');
    const exercises: AfrondenExercise[] = block.afrondenExercises || [];
    const c = block.constraints as AfrondenConstraints;
    const subType: string = c.subType ?? 'rooster';
    const numberType: string = c.numberType ?? 'natural';
    const maxGetal: number = c.maxGetal ?? (numberType === 'decimal' ? 100 : 1000);
    const decimalPlaces: number = c.decimalPlaces ?? 2;
    const targetKeys: string[] = c.roundTargets ?? (numberType === 'decimal' ? ['E', 't'] : ['T', 'H']);
    const gap = block.verticalSpacing || 14;

    const all = targetsFor(numberType);
    // SYNC with the generator: only targets that actually change the number.
    const cols = usableTargets(numberType, maxGetal, decimalPlaces, targetKeys);
    const targets = cols.length ? cols : [all[0]];

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Nog geen oefeningen — klik Genereer)</div>;
    }

    // ── SIMPEL: getal ≈ ____ (op <plaats>) — aligned column ───────────────────
    if (subType === 'simpel') {
        // Both columns keep their tuned minimum and grow to the block's widest value, so "≈"
        // stays aligned down the column once numbers outgrow 60px.
        const nums = exercises.map(ex => ex.number ?? 0);
        const targetOf = (ex: AfrondenExercise) => all.find(x => x.key === ex.targetKey) ?? all[0];
        const numCol = grownColumn(60, Math.max(0, ...nums.map(n => formatMathNumber(n).length)), 0.92, mathPx, 0);
        const ansCol = grownColumn(58, Math.max(0, ...exercises.map(ex => formatMathNumber(roundTo(ex.number ?? 0, targetOf(ex).weight)).length)), 0.92, mathPx, 0);
        return (
            <FragmentableGrid
                cols={2}
                columnGap={24}
                rowGap={gap}
                items={exercises.map(ex => {
                    const t = targetOf(ex);
                    return (
                        <div key={ex.id} className="print-exercise" style={{ display: 'flex', alignItems: 'baseline', gap: '8px', fontFamily: mono, fontSize: 'calc(var(--sheet-size-math) * 0.92)' }}>
                            <span style={{ minWidth: numCol.css, textAlign: 'right', whiteSpace: 'nowrap' }}>{formatMathNumber(ex.number ?? 0)}</span>
                            <span>≈</span>
                            {showSolutions
                                ? <span style={{ ...solutionText, minWidth: ansCol.css, whiteSpace: 'nowrap' }}>{formatMathNumber(roundTo(ex.number ?? 0, t.weight))}</span>
                                : <span style={{ borderBottom: '1.5px solid #000', minWidth: ansCol.css, height: ANSWER_LINE_H, display: 'inline-block' }} />}
                            {/* t.key ('T', 'H', 'E', 't', ... or 1M/10M/100M/1MLD) instead of the full Dutch label — short
                                enough to never wrap the 2-up row on its own, so the nowrap trick that
                                held 'tienduizendtal' is no longer needed. */}
                            <span style={{ fontSize: 'calc(var(--sheet-size-text) * 0.6)', color: '#555' }}>({targetHeading(t)})</span>
                        </div>
                    );
                })}
            />
        );
    }

    // ── ROOSTER: one rooster per exercise (numbers × round-to columns) ─────────
    // Drop to 1-up when two roosters + gap can't fit the printable width, else the
    // right rooster clips/overlaps in print (fixed-px inner grid can't shrink to a 1fr track).
    const ROOSTER_GAP = 20;
    const CELL_FONT = 0.81;
    // Cell border + 3px breathing room either side of the widest number: keeps a 1e9 T+H rooster 2-up.
    const CELL_PAD_PX = 8;
    // 96px target columns at ≤ 2 targets keep the common T+H rooster 2-up (2×296+20 ≤ 625);
    // 3+ targets get the roomier 104px and fall back to 1-up. Both grow past a million, where
    // "1 000 000 000" no longer fits them (a centred cell hides that spill from the width probe).
    const allNumbers = exercises.flatMap(ex => ex.numbers || []);
    const widest = (texts: string[]) => Math.max(0, ...texts.map(t => t.length));
    const numberCol = grownColumn(numberType === 'decimal' ? 90 : 104, widest(allNumbers.map(n => formatMathNumber(n))), CELL_FONT, mathPx, CELL_PAD_PX);
    // Sized from every rounded answer whether or not solutions show, so toggling them never reflows.
    const targetCol = grownColumn(targets.length <= 2 ? 96 : 104, widest(allNumbers.flatMap(n => targets.map(t => formatMathNumber(roundTo(n, t.weight))))), CELL_FONT, mathPx, CELL_PAD_PX);
    // A rooster wider than the cell repeats its number column over stacked tables of fewer targets.
    const groups = splitColumns(targets.length, numberCol.px, targetCol.px, A4_CONTENT_PX);
    const targetGroups: (typeof targets)[] = [];
    for (let start = 0, g = 0; g < groups.length; start += groups[g], g++) targetGroups.push(targets.slice(start, start + groups[g]));
    const roosterW = numberCol.px + groups[0] * targetCol.px;
    const roosterCols = fitCols(A4_CONTENT_PX, roosterW, 2, ROOSTER_GAP);
    const gridFor = (ts: typeof targets) => `${numberCol.css} ${ts.map(() => targetCol.css).join(' ')}`;
    const cell: React.CSSProperties = {
        border: '1px solid #000', height: ANSWER_ROW_H, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontFamily: mono, fontSize: `calc(var(--sheet-size-math) * ${CELL_FONT})`, boxSizing: 'border-box', whiteSpace: 'nowrap',
    };
    const table = (ex: AfrondenExercise, ts: typeof targets) => {
        const grid = gridFor(ts);
        return (
            <>
                <div style={{ display: 'grid', gridTemplateColumns: grid }}>
                    <div style={{ ...cell, backgroundColor: SALMON, fontWeight: 'bold' }}>afronden</div>
                    {/* t.key ('T', 'H', 'E', 't', ... or 1M/10M/100M/1MLD) instead of "op <label>" — short enough that
                        it never needs its own shrink-to-fit, unlike the old "op tienduizendtal". */}
                    {ts.map(t => <div key={t.key} style={{ ...cell, backgroundColor: SALMON, fontWeight: 'bold' }}>{targetHeading(t)}</div>)}
                </div>
                {(ex.numbers || []).map((num, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: grid }}>
                        <div style={{ ...cell, backgroundColor: SALMON, fontWeight: 'bold' }}>{formatMathNumber(num)}</div>
                        {ts.map(t => (
                            <div key={t.key} style={{ ...cell, ...solutionText }}>
                                {showSolutions ? formatMathNumber(roundTo(num, t.weight)) : ''}
                            </div>
                        ))}
                    </div>
                ))}
            </>
        );
    };
    return (
        <FragmentableGrid
            cols={roosterCols}
            columnGap={ROOSTER_GAP}
            rowGap={gap + 6}
            alignItems="flex-start"
            items={exercises.map(ex => (
                <div key={ex.id} className="print-exercise" style={{ width: 'fit-content' }}>
                    {targetGroups.length === 1
                        ? table(ex, targetGroups[0])
                        : targetGroups.map((ts, g) => <div key={g} style={{ marginTop: g > 0 ? '6px' : undefined }}>{table(ex, ts)}</div>)}
                </div>
            ))}
        />
    );
}
