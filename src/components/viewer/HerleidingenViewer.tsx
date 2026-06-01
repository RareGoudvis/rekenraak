import type { MathBlock, HerleidingExercise, HerleidingPart } from '../../services/math/types';
import { formatMathNumber } from '../../services/math/formatters';
import { ladderFor } from '../../services/herleidingen/herleidingenGenerator';
import FragmentableGrid from './FragmentableGrid';

interface Props { block: MathBlock; showSolutions: boolean; }

const mono = "'Azeret Mono', monospace";
const SOL = '#e11d48';
const SALMON = '#f4cbb8';

const numLine = () => <span style={{ borderBottom: '1.5px solid #000', minWidth: '60px', height: '16px', display: 'inline-block' }} />;
const unitLine = () => <span style={{ borderBottom: '1.5px solid #000', minWidth: '34px', height: '16px', display: 'inline-block' }} />;

export default function HerleidingenViewer({ block, showSolutions }: Props) {
    const exercises: HerleidingExercise[] = block.herleidingExercises || [];
    const measure: string = block.constraints.measure ?? 'lengte';
    const scaffolding: string = block.constraints.scaffolding ?? 'geen';
    const writeUnits: boolean = !!block.constraints.writeUnits;
    const gap = block.verticalSpacing || 14;

    if (exercises.length === 0) {
        return <div className="no-print" style={{ padding: '8px 0', fontStyle: 'italic', color: '#999', fontSize: '14px' }}>(Genereer oefeningen via het rechterpaneel)</div>;
    }

    // The left (from) part rendered as "v u  v u", right-aligned in a fixed box so every '=' aligns.
    const fromStr = (parts: HerleidingPart[]) => parts.map(p => `${formatMathNumber(p.value)} ${p.key}`).join('  ');

    const renderTo = (ex: HerleidingExercise) => ex.toParts.map((p, i) => {
        const numBlank = ex.blank === 'number';
        const unitBlank = ex.blank === 'unit' || (writeUnits && ex.blank === 'number');
        return (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'baseline', gap: '5px' }}>
                {numBlank
                    ? (showSolutions ? <span style={{ color: SOL }}>{formatMathNumber(p.value)}</span> : numLine())
                    : <span>{formatMathNumber(p.value)}</span>}
                {unitBlank
                    ? (showSolutions ? <span style={{ color: SOL }}>{p.key}</span> : unitLine())
                    : <span>{p.key}</span>}
            </span>
        );
    });

    const exerciseGrid = (
        <FragmentableGrid
            cols={2}
            columnGap={28}
            rowGap={gap + 2}
            items={exercises.map(ex => (
                <div key={ex.id} className="print-exercise" style={{ display: 'flex', alignItems: 'baseline', gap: '8px', fontFamily: mono, fontSize: '16px' }}>
                    <span style={{ width: '140px', textAlign: 'right', whiteSpace: 'nowrap', flexShrink: 0 }}>{fromStr(ex.fromParts)}</span>
                    <span>=</span>
                    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '10px' }}>{renderTo(ex)}</span>
                </div>
            ))}
        />
    );

    // Optional conversion-table scaffold ABOVE the exercises: columns = enabled units, then one
    // blank row per exercise. "tabel-blanco" leaves the header cells empty (kids write the units).
    let table = null;
    if (scaffolding === 'tabel-headers' || scaffolding === 'tabel-blanco') {
        const units = ladderFor(measure).filter(u => (block.constraints.units ?? []).includes(u.key));
        const cols = units.map(() => '60px').join(' ');
        const cell: React.CSSProperties = { border: '1px solid #000', height: '30px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: mono, fontSize: '13px' };
        const showHeaders = scaffolding === 'tabel-headers';
        table = (
            <div style={{ marginBottom: `${gap + 6}px`, width: 'fit-content' }}>
                <div className="print-row" style={{ display: 'grid', gridTemplateColumns: cols }}>
                    {units.map(u => <div key={u.key} style={{ ...cell, backgroundColor: SALMON, fontWeight: 'bold' }}>{showHeaders ? u.key : ''}</div>)}
                </div>
                {exercises.map(ex => (
                    <div key={ex.id} className="print-row" style={{ display: 'grid', gridTemplateColumns: cols }}>
                        {units.map(u => <div key={u.key} style={cell} />)}
                    </div>
                ))}
            </div>
        );
    }

    return <div>{table}{exerciseGrid}</div>;
}
