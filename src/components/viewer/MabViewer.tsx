import type { MathBlock, MabExercise, MabStyle, MabScaffolding } from '../../services/math/types';
import { MabPlaceColumn, type MabPlace } from './MabBlocksSVG';
import FragmentableGrid from './FragmentableGrid';
import { fitCols, useBlockWidth } from './BlockWidthContext';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

const fmt = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

interface ColDef { key: string; place: MabPlace; }

// Every place-value column is the SAME width — a positietabel whose E column is narrower
// than its H column stops reading as a table of equal places.
//
// The width comes from the widest single glyph the column must hold, not from the share of
// the block it happens to get. The hundreds set it: a hundred plate (or a tens rod) is ten
// cells wide, and ten of them stack vertically rather than side by side. This type tops out
// at 1000, so a duizendtal column only ever holds ONE cube — its own width is enough.
// SYNC: these are the glyph sizes in MabBlocksSVG.tsx — CELL 6, CELL_THOUSANDS 7, +4 offset.
const THOUSAND_GLYPH_PX = 7 * 10 + 4;    // RealisticThousands: S + OFFSET
const HUNDRED_GLYPH_PX = 6 * 10;         // 10 cells wide (also the tens rod)
// 4px: four duizendtal columns plus the box's own borders have to clear a half-width
// cell (338px). 8 put them 13px over, 5 left 1px over.
const MAB_COL_PAD = 4;
function mabColWidth(cols: Array<{ key: string }>): number {
    const hasThousands = cols.some(c => c.key === 'D');
    const glyph = Math.max(HUNDRED_GLYPH_PX, hasThousands ? THOUSAND_GLYPH_PX : 0);
    return glyph + MAB_COL_PAD;
}

export default function MabViewer({ block, showSolutions }: Props) {
    const availableWidth = useBlockWidth();
    // The item carries its own 1.5px borders and the grid a 14px gap, so three tracks can
    // land exactly on the boundary and tip over. Under-filling a row is harmless; clipping
    // in print is not, so the fit keeps a small margin.
    const mabPerRow = (cols: Array<{ key: string }>, want: number, gap: number) =>
        fitCols(availableWidth - 12, cols.length * mabColWidth(cols) + 4, want, gap);
    // herkennen = read drawn blocks → write number; tekenen = reverse (draw blocks).
    const mode: 'herkennen' | 'tekenen' = block.typeId === 'mab-tekenen' ? 'tekenen' : 'herkennen';
    const exercises: MabExercise[] = block.mabExercises || [];
    if (exercises.length === 0) {
        return (
            <div className="no-print" style={{ padding: '8px 0', fontStyle: 'italic', color: '#999', fontSize: '14px' }}>
                (Nog geen oefeningen — klik Genereer)
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
    const boxHeight: number = c.boxHeight || 70;
    const answerHeight: number = c.answerHeight || 36;
    const gap = block.verticalSpacing || 14;

    // Columns left → right in place-value order (largest place first).
    const cols: ColDef[] = [];
    if (maxNumber >= 1000) cols.push({ key: 'D', place: 'thousands' });
    if (maxNumber >= 100)  cols.push({ key: 'H', place: 'hundreds' });
    // >= 10 (not 20): at maxNumber=10 the value 10 itself needs a tens column, else it renders as zero blocks
    if (maxNumber >= 10)   cols.push({ key: 'T', place: 'tens' });
    cols.push({ key: 'E', place: 'units' });

    return (
        <FragmentableGrid
            cols={mabPerRow(cols, perRow, gap)}
            columnGap={gap}
            rowGap={gap}
            items={exercises.map(ex => (
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
        />
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
    // The Dienes glyphs are fixed-size on purpose (a tens rod IS ten unit cubes wide), so
    // plain 1fr columns squeeze them the moment the block is narrower than full width and
    // the place-value reading breaks. Each column therefore gets an explicit minimum equal
    // to its own glyph, and shares only the leftover slack.
    //
    // The columns are FIXED px, not minmax(...,1fr): the header row and the drawing row are
    // separate grids, and any flexible track resolves differently in each, so the H/T/E
    // labels drift out of line with the blocks underneath them. Fixed also means the
    // exercise never resizes — a narrow block simply fits fewer per row (as the clocks do).
    const gridCols = `repeat(${cols.length}, ${mabColWidth(cols)}px)`;
    const hasBorder = scaffolding === 'positietabel' || scaffolding === 'kader';
    const hasHeader = scaffolding === 'positietabel';
    const hasDividers = scaffolding === 'positietabel';
    // In tekenen mode the student draws — only render glyphs when showing solutions.
    const showGlyphs = mode === 'herkennen' || showSolutions;
    // In tekenen mode the number is printed on the answer line by default; in
    // herkennen mode the line stays empty unless solutions are shown.
    const showNumberOnLine = mode === 'tekenen' || showSolutions;

    return (
        <div className="print-exercise" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: "'Azeret Mono', monospace" }}>
            {/* BOX = optional outer border + optional H/T/E header row + drawing area */}
            <div style={{
                width: 'max-content',
                maxWidth: '100%',
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
                    ? <span style={{ color: showSolutions && mode === 'herkennen' ? '#e11d48' : '#000', fontSize: '16px' }}>{fmt(ex.value)}</span>
                    : <div style={{ width: '70%', borderBottom: '1.5px solid #000' }} />
                }
            </div>
        </div>
    );
}
