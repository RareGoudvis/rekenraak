import type { MathBlock, DeelbaarheidKleurExercise } from '../../services/math/types';
import { formatMathNumber } from '../../services/math/formatters';
import FragmentableGrid from './FragmentableGrid';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

const mono = "'Azeret Mono', monospace";
const FILL = '#93c5fd';
const SOL = '#e11d48';

export default function DeelbaarheidKleurViewer({ block, showSolutions }: Props) {
    const exercises: DeelbaarheidKleurExercise[] = block.deelbaarheidKleurExercises || [];
    const viewMode: string = block.constraints.viewMode ?? 'strip';
    const showRest: boolean = (block.constraints.showRest ?? false) && viewMode !== 'raster';
    const perRow: number = block.constraints.perRow ?? 10;
    const gap = block.verticalSpacing || 14;

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Genereer oefeningen via het rechterpaneel)</div>;
    }

    const restLine = (n: number, divisor: number) => (
        <span style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'flex-end', gap: '2px', marginTop: '2px' }}>
            r={showSolutions ? <span style={{ color: SOL }}>{n % divisor}</span> : <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '20px', height: '12px' }} />}
        </span>
    );

    return (
        <FragmentableGrid
            cols={1}
            rowGap={gap + 6}
            items={exercises.map(ex => {
                const isMul = (n: number) => n % ex.divisor === 0;

                // ── RASTER: consecutive grid, colour all multiples ──
                if (viewMode === 'raster') {
                    const cols = ex.cols ?? 10;
                    return (
                        <div key={ex.id} className="print-exercise" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontFamily: mono, fontSize: '14px' }}>Kleur de veelvouden van {ex.divisor}:</span>
                            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 42px)`, width: 'fit-content' }}>
                                {ex.numbers.map((num, i) => (
                                    <div key={i} style={{
                                        width: 42, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        border: '1px solid #000', boxSizing: 'border-box', fontFamily: mono, fontSize: '12px',
                                        marginLeft: i % cols === 0 ? 0 : -1, marginTop: i >= cols ? -1 : 0,
                                        backgroundColor: showSolutions && isMul(num) ? FILL : 'white',
                                    }}>{formatMathNumber(num)}</div>
                                ))}
                            </div>
                        </div>
                    );
                }

                // ── MARKEREN: circle the multiples in a row ──
                if (viewMode === 'markeren') {
                    return (
                        <div key={ex.id} className="print-exercise" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontFamily: mono, fontSize: '14px' }}>Omcirkel de veelvouden van {ex.divisor}:</span>
                            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${perRow}, minmax(0, 1fr))`, rowGap: '10px', columnGap: '6px', fontFamily: mono, fontSize: '17px' }}>
                                {ex.numbers.map((num, i) => {
                                    const ring = showSolutions && isMul(num);
                                    return (
                                        <span key={i} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
                                            <span style={{ padding: '2px 8px', borderRadius: '50%', border: ring ? `2px solid ${SOL}` : '2px solid transparent', color: ring ? SOL : 'inherit' }}>{formatMathNumber(num)}</span>
                                            {showRest && restLine(num, ex.divisor)}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    );
                }

                // ── STRIP: colour the multiples in a labelled number strip ──
                const cellW = 46, cellH = 34;
                return (
                    <div key={ex.id} className="print-exercise" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontFamily: mono, fontSize: '14px' }}>Kleur de veelvouden van {ex.divisor}:</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: showRest ? '4px' : '0', alignItems: 'flex-start' }}>
                            {ex.numbers.map((num, i) => (
                                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginLeft: showRest || i === 0 ? 0 : -1 }}>
                                    <div style={{
                                        width: cellW, height: cellH, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        border: '1px solid #000', boxSizing: 'border-box', fontFamily: mono, fontSize: '14px',
                                        backgroundColor: showSolutions && isMul(num) ? FILL : 'white',
                                    }}>{formatMathNumber(num)}</div>
                                    {showRest && restLine(num, ex.divisor)}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        />
    );
}
