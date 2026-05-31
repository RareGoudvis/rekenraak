import type { MathBlock, AfrondenExercise } from '../../services/math/types';
import { formatMathNumber } from '../../services/math/formatters';
import { targetsFor, roundTo } from '../../services/afronden/afrondenGenerator';
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
    const targetKeys: string[] = block.constraints.roundTargets ?? (numberType === 'decimal' ? ['E', 't'] : ['T', 'H']);
    const gap = block.verticalSpacing || 14;

    const all = targetsFor(numberType);
    const cols = all.filter(t => targetKeys.includes(t.key) && (numberType === 'decimal' || t.weight < maxGetal));
    const targets = cols.length ? cols : [all[0]];

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Genereer oefeningen via het rechterpaneel)</div>;
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
                            <span style={{ minWidth: '78px', textAlign: 'right' }}>{formatMathNumber(ex.number ?? 0)}</span>
                            <span>≈</span>
                            {showSolutions
                                ? <span style={{ color: SOL, minWidth: '70px' }}>{formatMathNumber(roundTo(ex.number ?? 0, t.weight))}</span>
                                : <span style={{ borderBottom: '1.5px solid #000', minWidth: '70px', height: '15px', display: 'inline-block' }} />}
                            <span style={{ fontSize: '12px', color: '#555' }}>(op {t.label})</span>
                        </div>
                    );
                })}
            />
        );
    }

    // ── ROOSTER: one rooster per exercise (numbers × round-to columns), 2-up ───
    const grid = `${numberType === 'decimal' ? '90px' : '110px'} ${targets.map(() => '104px').join(' ')}`;
    const cell: React.CSSProperties = {
        border: '1px solid #000', height: '32px', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontFamily: mono, fontSize: '14px', boxSizing: 'border-box',
    };
    return (
        <FragmentableGrid
            cols={2}
            columnGap={20}
            rowGap={gap + 6}
            alignItems="flex-start"
            items={exercises.map(ex => (
                <div key={ex.id} className="print-exercise" style={{ width: 'fit-content' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: grid }}>
                        <div style={{ ...cell, backgroundColor: SALMON, fontWeight: 'bold' }}>afronden</div>
                        {targets.map(t => <div key={t.key} style={{ ...cell, backgroundColor: SALMON, fontWeight: 'bold', fontSize: '11px' }}>op {t.label}</div>)}
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
