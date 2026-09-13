import type { MathBlock, AfrondenExercise } from '../../services/math/types';
import { formatMathNumber } from '../../services/math/formatters';
import { targetsFor, roundTo, usableTargets } from '../../services/afronden/afrondenGenerator';
import FragmentableGrid from './FragmentableGrid';
import { useBlockWidth, ANSWER_LINE_H, ANSWER_ROW_H } from './BlockWidthContext';
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
        return (
            <FragmentableGrid
                cols={2}
                columnGap={24}
                rowGap={gap}
                items={exercises.map(ex => {
                    const t = all.find(x => x.key === ex.targetKey) ?? all[0];
                    return (
                        <div key={ex.id} className="print-exercise" style={{ display: 'flex', alignItems: 'baseline', gap: '8px', fontFamily: mono, fontSize: 'calc(var(--sheet-size-math) * 0.92)' }}>
                            <span style={{ minWidth: '60px', textAlign: 'right' }}>{formatMathNumber(ex.number ?? 0)}</span>
                            <span>≈</span>
                            {showSolutions
                                ? <span style={{ ...solutionText, minWidth: '58px' }}>{formatMathNumber(roundTo(ex.number ?? 0, t.weight))}</span>
                                : <span style={{ borderBottom: '1.5px solid #000', minWidth: '58px', height: ANSWER_LINE_H, display: 'inline-block' }} />}
                            {/* t.key ('T', 'H', 'E', 't', ...) instead of the full Dutch label — short
                                enough to never wrap the 2-up row on its own, so the nowrap trick that
                                held 'tienduizendtal' is no longer needed. */}
                            <span style={{ fontSize: 'calc(var(--sheet-size-text) * 0.6)', color: '#555' }}>({t.key})</span>
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
    const numberColPx = numberType === 'decimal' ? 90 : 104;
    // 96px target columns at ≤ 2 targets keep the common T+H rooster 2-up (2×296+20 ≤ 625);
    // 3+ targets get the roomier 104px and fall back to 1-up.
    const targetColPx = targets.length <= 2 ? 96 : 104;
    const roosterW = numberColPx + targets.length * targetColPx;
    const roosterCols = roosterW * 2 + ROOSTER_GAP <= A4_CONTENT_PX ? 2 : 1;
    const grid = `${numberColPx}px ${targets.map(() => `${targetColPx}px`).join(' ')}`;
    const cell: React.CSSProperties = {
        border: '1px solid #000', height: ANSWER_ROW_H, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontFamily: mono, fontSize: 'calc(var(--sheet-size-math) * 0.81)', boxSizing: 'border-box',
    };
    return (
        <FragmentableGrid
            cols={roosterCols}
            columnGap={ROOSTER_GAP}
            rowGap={gap + 6}
            alignItems="flex-start"
            items={exercises.map(ex => (
                <div key={ex.id} className="print-exercise" style={{ width: 'fit-content' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: grid }}>
                        <div style={{ ...cell, backgroundColor: SALMON, fontWeight: 'bold' }}>afronden</div>
                        {/* t.key ('T', 'H', 'E', 't', ...) instead of "op <label>" — short enough that
                            it never needs its own shrink-to-fit, unlike the old "op tienduizendtal". */}
                        {targets.map(t => <div key={t.key} style={{ ...cell, backgroundColor: SALMON, fontWeight: 'bold' }}>{t.key}</div>)}
                    </div>
                    {(ex.numbers || []).map((num, i) => (
                        <div key={i} style={{ display: 'grid', gridTemplateColumns: grid }}>
                            <div style={{ ...cell, backgroundColor: SALMON, fontWeight: 'bold' }}>{formatMathNumber(num)}</div>
                            {targets.map(t => (
                                <div key={t.key} style={{ ...cell, ...solutionText }}>
                                    {showSolutions ? formatMathNumber(roundTo(num, t.weight)) : ''}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            ))}
        />
    );
}
