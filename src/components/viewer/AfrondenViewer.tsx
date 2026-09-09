import type { MathBlock, AfrondenExercise } from '../../services/math/types';
import { formatMathNumber } from '../../services/math/formatters';
import { targetsFor, roundTo, usableTargets } from '../../services/afronden/afrondenGenerator';
import FragmentableGrid from './FragmentableGrid';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

const mono = "'Azeret Mono', monospace";
const SOL = '#e11d48';
const SALMON = '#f4cbb8';

export default function AfrondenViewer({ block, showSolutions }: Props) {
    const exercises: AfrondenExercise[] = block.afrondenExercises || [];
    const subType: string = block.constraints.subType ?? 'rooster';
    const numberType: string = block.constraints.numberType ?? 'natural';
    const maxGetal: number = block.constraints.maxGetal ?? (numberType === 'decimal' ? 100 : 1000);
    const decimalPlaces: number = block.constraints.decimalPlaces ?? 2;
    const targetKeys: string[] = block.constraints.roundTargets ?? (numberType === 'decimal' ? ['E', 't'] : ['T', 'H']);
    const gap = block.verticalSpacing || 14;

    const all = targetsFor(numberType);
    // SYNC with the generator: only targets that actually change the number.
    const cols = usableTargets(numberType, maxGetal, decimalPlaces, targetKeys);
    const targets = cols.length ? cols : [all[0]];

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Genereer oefeningen via het paneel links)</div>;
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
                        <div key={ex.id} className="print-exercise" style={{ display: 'flex', alignItems: 'baseline', gap: '8px', fontFamily: mono, fontSize: '16px' }}>
                            <span style={{ minWidth: '60px', textAlign: 'right' }}>{formatMathNumber(ex.number ?? 0)}</span>
                            <span>≈</span>
                            {showSolutions
                                ? <span style={{ color: SOL, minWidth: '58px' }}>{formatMathNumber(roundTo(ex.number ?? 0, t.weight))}</span>
                                : <span style={{ borderBottom: '1.5px solid #000', minWidth: '58px', height: '15px', display: 'inline-block' }} />}
                            {/* nowrap + trimmed min-widths so the long 'tienduizendtal' hint doesn't wrap the 2-up row */}
                            <span style={{ fontSize: '12px', color: '#555', whiteSpace: 'nowrap' }}>(op {t.label})</span>
                        </div>
                    );
                })}
            />
        );
    }

    // ── ROOSTER: one rooster per exercise (numbers × round-to columns) ─────────
    // Drop to 1-up when two roosters + gap can't fit the printable width, else the
    // right rooster clips/overlaps in print (fixed-px inner grid can't shrink to a 1fr track).
    const A4_CONTENT_PX = 625;
    const ROOSTER_GAP = 20;
    const numberColPx = numberType === 'decimal' ? 90 : 104;
    // 96px target columns at ≤ 2 targets keep the common T+H rooster 2-up (2×296+20 ≤ 625);
    // 3+ targets get the roomier 104px and fall back to 1-up.
    const targetColPx = targets.length <= 2 ? 96 : 104;
    const roosterW = numberColPx + targets.length * targetColPx;
    const roosterCols = roosterW * 2 + ROOSTER_GAP <= A4_CONTENT_PX ? 2 : 1;
    const grid = `${numberColPx}px ${targets.map(() => `${targetColPx}px`).join(' ')}`;
    // Long headers like "op tienduizendtal" shrink to stay inside their column.
    const maxLabelLen = Math.max(...targets.map(t => t.label.length)) + 3;
    const headerFs = Math.max(9, Math.min(11, Math.floor(targetColPx / (maxLabelLen * 0.62))));
    const cell: React.CSSProperties = {
        border: '1px solid #000', height: '32px', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontFamily: mono, fontSize: '14px', boxSizing: 'border-box',
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
                        {/* Long headers ("op tienduizendtal") may wrap to 2 lines inside the 32px cell */}
                        {targets.map(t => <div key={t.key} style={{ ...cell, backgroundColor: SALMON, fontWeight: 'bold', fontSize: `${headerFs}px`, textAlign: 'center', lineHeight: 1.15 }}>op {t.label}</div>)}
                    </div>
                    {(ex.numbers || []).map((num, i) => (
                        <div key={i} style={{ display: 'grid', gridTemplateColumns: grid }}>
                            <div style={{ ...cell, backgroundColor: SALMON, fontWeight: 'bold' }}>{formatMathNumber(num)}</div>
                            {targets.map(t => (
                                <div key={t.key} style={{ ...cell, color: SOL }}>
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
