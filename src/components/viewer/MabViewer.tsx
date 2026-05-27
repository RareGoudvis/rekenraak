import type { MathBlock, MabExercise, MabStyle, MabScaffolding } from '../../services/math/types';
import { MabPlaceColumn, type MabPlace } from './MabBlocksSVG';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
    mode: 'herkennen' | 'tekenen';
}

const fmt = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

interface ColDef { key: string; place: MabPlace; }

export default function MabViewer({ block, showSolutions, mode }: Props) {
    const exercises: MabExercise[] = block.mabExercises || [];
    if (exercises.length === 0) {
        return (
            <div className="no-print" style={{ padding: '8px 0', fontStyle: 'italic', color: '#999', fontSize: '14px' }}>
                (Genereer oefeningen via het rechterpaneel)
            </div>
        );
    }

    const c = block.constraints;
    // Back-compat: blocks saved before the rename used 'realistic'.
    const style: MabStyle = (c.mabStyle === 'realistic' ? 'mab-bw' : c.mabStyle) || 'symbolic';
    const maxNumber: number = c.maxNumber || 100;
    const perRow: number = c.exercisesPerRow || 3;
    // Back-compat: blocks saved before the rename used `showBox: boolean`.
    const scaffolding: MabScaffolding = c.scaffolding ?? (c.showBox === false ? 'geen' : 'positietabel');
    const boxHeight: number = c.boxHeight || 60;
    const answerHeight: number = c.answerHeight || 36;
    const gap = block.verticalSpacing || 14;

    // Columns left → right in place-value order (largest place first).
    const cols: ColDef[] = [];
    if (maxNumber >= 1000) cols.push({ key: 'D', place: 'thousands' });
    if (maxNumber >= 100)  cols.push({ key: 'H', place: 'hundreds' });
    if (maxNumber >= 20)   cols.push({ key: 'T', place: 'tens' });
    cols.push({ key: 'E', place: 'units' });

    return (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${perRow}, 1fr)`, gap: `${gap}px`, width: '100%' }}>
            {exercises.map(ex => (
                <MabItem
                    key={ex.id}
                    ex={ex}
                    style={style}
                    cols={cols}
                    scaffolding={scaffolding}
                    boxHeight={boxHeight}
                    answerHeight={answerHeight}
                    showSolutions={showSolutions}
                    mode={mode}
                />
            ))}
        </div>
    );
}

interface ItemProps {
    ex: MabExercise;
    style: MabStyle;
    cols: ColDef[];
    scaffolding: MabScaffolding;
    boxHeight: number;
    answerHeight: number;
    showSolutions: boolean;
    mode: 'herkennen' | 'tekenen';
}

function MabItem({ ex, style, cols, scaffolding, boxHeight, answerHeight, showSolutions, mode }: ItemProps) {
    const digits: Record<MabPlace, number> = {
        thousands: ex.thousands,
        hundreds: ex.hundreds,
        tens: ex.tens,
        units: ex.units,
    };
    const gridCols = `repeat(${cols.length}, 1fr)`;
    const hasBorder = scaffolding === 'positietabel' || scaffolding === 'kader';
    const hasHeader = scaffolding === 'positietabel';
    const hasDividers = scaffolding === 'positietabel';
    // In tekenen mode the student draws — only render glyphs when showing solutions.
    const showGlyphs = mode === 'herkennen' || showSolutions;
    // In tekenen mode the number is printed on the answer line by default; in
    // herkennen mode the line stays empty unless solutions are shown.
    const showNumberOnLine = mode === 'tekenen' || showSolutions;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: "'Azeret Mono', monospace" }}>
            {/* BOX = optional outer border + optional H/T/E header row + drawing area */}
            <div style={{
                width: '100%',
                border: hasBorder ? '1.5px solid #000' : 'none',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: hasBorder ? '4px' : 0,
                overflow: 'hidden',
            }}>
                {hasHeader && (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: gridCols,
                        borderBottom: '1.5px solid #000',
                        background: '#f3f4f6',
                    }}>
                        {cols.map((col, i) => (
                            <div key={col.key} style={{
                                textAlign: 'center',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                padding: '4px 0',
                                borderRight: i < cols.length - 1 ? '1.5px solid #000' : 'none',
                            }}>
                                {col.key}
                            </div>
                        ))}
                    </div>
                )}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: gridCols,
                    height: `${boxHeight}px`,
                }}>
                    {cols.map((col, i) => (
                        <div key={col.key} style={{
                            display: 'flex',
                            alignItems: 'flex-end',
                            justifyContent: 'center',
                            padding: '6px',
                            borderRight: hasDividers && i < cols.length - 1 ? '1.5px solid #000' : 'none',
                            overflow: 'hidden',
                            boxSizing: 'border-box',
                        }}>
                            <MabPlaceColumn
                                count={showGlyphs ? digits[col.place] : 0}
                                place={col.place}
                                style={style}
                                color={mode === 'tekenen' && showSolutions ? '#e11d48' : '#000'}
                            />
                        </div>
                    ))}
                </div>
            </div>
            {/* ANSWER LINE — always shown */}
            <div style={{
                width: '100%',
                height: `${answerHeight}px`,
                marginTop: '8px',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                paddingBottom: '4px',
                boxSizing: 'border-box',
            }}>
                {showNumberOnLine
                    ? <span style={{ color: showSolutions && mode === 'herkennen' ? '#e11d48' : '#000', fontWeight: 'bold', fontSize: '16px' }}>{fmt(ex.value)}</span>
                    : <div style={{ width: '70%', borderBottom: '1.5px solid #000' }} />
                }
            </div>
        </div>
    );
}
