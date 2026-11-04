import type { MathBlock, MabExercise, MabStyle, MabScaffolding } from '../../services/math/types';
import { MabKioskTrayGlyph, MabPlaceColumn, type MabPlace } from './MabBlocksSVG';
import { kioskCellBox } from './mabKioskLayout';
import { builtCount, useViewerInteraction, type InteractionState } from './ViewerInteractionContext';
import type { KioskPiece } from '../../services/oefenen/types';
import FragmentableGrid from './FragmentableGrid';
import { fitCols, useBlockWidth, useShowScaffold, useSheetSizePx } from './BlockWidthContext';
import type { MabConstraints } from '../../services/math/constraintTypes';
import { SOL, solutionText } from './solutionStyle';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

// Printed digit/mono sizes below are factors of --sheet-size-math (empty-state chrome
// stays fixed px).
// SYNC: same two lines as MabBlocksSVG.tsx (they cannot be exported from a file that also
// exports a component). 13pt = 17.33px, so em over this divisor is today's px at the default.
const PX_PER_EM_AT_DEFAULT = 17.33;
const em = (px: number): string => `${px / PX_PER_EM_AT_DEFAULT}em`;

const fmt = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

interface ColDef { key: string; place: MabPlace; }

// Every place-value column is the SAME width — a positietabel whose E column is narrower
// than its H column stops reading as a table of equal places.
//
// The width comes from the widest single glyph the column must hold, not from the share of
// the block it happens to get. The hundreds set it: a hundred plate (or a tens rod) is ten
// cells wide, and ten of them stack vertically rather than side by side. Up to 1000 a
// duizendtal column only ever holds ONE cube — its own width is enough.
// SYNC: these are the glyph sizes in MabBlocksSVG.tsx — CELL 6, CELL_THOUSANDS 7, +4 offset.
// They are px at the 13pt default and are emitted as em, so column and glyph scale together.
const THOUSAND_GLYPH_PX = 7 * 10 + 4;    // RealisticThousands: S + OFFSET
const HUNDRED_GLYPH_PX = 6 * 10;         // 10 cells wide (also the tens rod)
// 4px: four duizendtal columns plus the box's own borders have to clear a half-width
// cell (338px). 8 put them 13px over, 5 left 1px over.
const MAB_COL_PAD = 4;

// Square pattern (herkennen, and every sheet above 1000): each place lays its pieces in 2 rows,
// squares of four 3px apart, so the column is as wide as the fullest digit its max allows.
// SYNC: PATTERN_GLYPH / PATTERN_GROUP_GAP in MabBlocksSVG.tsx — piece w, h, column gap, row gap.
const PATTERN_GROUP_GAP = 3;
const PATTERN_GLYPH: Record<'symbolic' | 'mab', Record<MabPlace, { w: number; h: number; colGap: number; rowGap: number }>> = {
    symbolic: {
        units:     { w: 7, h: 7, colGap: 2, rowGap: 5 },
        tens:      { w: 3.5, h: 28, colGap: 4, rowGap: 6 },
        hundreds:  { w: 12, h: 12, colGap: 2, rowGap: 2 },
        thousands: { w: 26, h: 26, colGap: 4, rowGap: 4 },
    },
    mab: {
        units:     { w: 6, h: 6, colGap: 2, rowGap: 5 },
        tens:      { w: 5, h: 30, colGap: 2, rowGap: 6 },
        hundreds:  { w: 12, h: 12, colGap: 2, rowGap: 2 },
        thousands: { w: 34, h: 34, colGap: 4, rowGap: 4 },
    },
};
// The pattern's cells keep 2px padding (not 6) and 1px air beyond it: 9 hundreds (74) make an 80px
// column, so the 1000 table (4 x 80 + 4) still fits a half-width cell and two per full row.
const PATTERN_CELL_PAD = 2;
const PATTERN_COL_PAD = 2 * PATTERN_CELL_PAD + 2;
const PLACE_VALUE: Record<MabPlace, number> = { thousands: 1000, hundreds: 100, tens: 10, units: 1 };
// The fullest digit a place can show under this max (at 1000 the D column holds one cube).
const maxDigit = (place: MabPlace, maxNumber: number) => Math.min(9, Math.floor(maxNumber / PLACE_VALUE[place]));
function patternBox(place: MabPlace, style: MabStyle, maxNumber: number): { w: number; h: number } {
    const g = PATTERN_GLYPH[style === 'symbolic' ? 'symbolic' : 'mab'][place];
    const n = Math.max(1, maxDigit(place, maxNumber));
    // Squares of four, bottom pair first: two columns per full square, then the next pair.
    const cols = 2 * Math.floor(n / 4) + Math.min(n % 4, 2);
    return {
        w: cols * g.w + (cols - 1) * g.colGap + Math.floor((cols - 1) / 2) * PATTERN_GROUP_GAP,
        h: n > 2 ? 2 * g.h + g.rowGap : g.h,
    };
}
const usesSquarePattern = (mode: 'herkennen' | 'tekenen', maxNumber: number) => mode === 'herkennen' || maxNumber > 1000;

function mabColWidth(cols: ColDef[], mode: 'herkennen' | 'tekenen', maxNumber: number, style: MabStyle): number {
    if (usesSquarePattern(mode, maxNumber)) {
        return Math.max(...cols.map(c => patternBox(c.place, style, maxNumber).w)) + PATTERN_COL_PAD;
    }
    const hasThousands = cols.some(c => c.key === 'D');
    const glyph = Math.max(HUNDRED_GLYPH_PX, hasThousands ? THOUSAND_GLYPH_PX : 0);
    return glyph + MAB_COL_PAD;
}
// The drawing area must hold the tallest pattern (nine upright rods, two rows of cubes).
const patternBoxFloor = (cols: ColDef[], style: MabStyle, maxNumber: number) =>
    Math.max(...cols.map(c => patternBox(c.place, style, maxNumber).h)) + 2 * PATTERN_CELL_PAD;

export default function MabViewer({ block, showSolutions }: Props) {
    const availableWidth = useBlockWidth();
    const ia = useViewerInteraction();
    // Oefenmodus build: the blocks the pupil laid from the kiosk tray, keyed by column (D H T E).
    const laid = ia?.kind === 'build' ? ia.state : null;
    // herkennen = read drawn blocks → write number; tekenen = reverse (draw blocks).
    const mode: 'herkennen' | 'tekenen' = block.typeId === 'mab-tekenen' ? 'tekenen' : 'herkennen';
    // mab-tekenen has no glyph/numeral pairing to keep legible (unlike herkennen, which
    // floors at a half for exactly that reason — C1 step 0), so it is the one MAB mode
    // allowed at a quarter. A quarter cell (~163px) is tight even at figureFontPx's normal
    // fit-to-column cap, so tekenen gets one further explicit step down there (0.75).
    const narrowTekenen = mode === 'tekenen' && availableWidth < 200;
    // The positietabel is drawn in em, so its real px width is the glyph geometry times the
    // teacher's Lettergrootte setting; the column count has to use the same factor.
    const sheetSizePx = useSheetSizePx('math');
    const fontScale = sheetSizePx / PX_PER_EM_AT_DEFAULT;
    // The item carries its own 1.5px borders and the grid a 14px gap, so three tracks can
    // land exactly on the boundary and tip over. Under-filling a row is harmless; clipping
    // in print is not, so the fit keeps a small margin.
    const c = block.constraints as MabConstraints;
    // Back-compat: blocks saved before the rename used 'realistic'.
    const style: MabStyle = (c.mabStyle === 'realistic' ? 'mab-bw' : c.mabStyle) || 'symbolic';
    const maxNumber: number = c.maxNumber || 100;
    const colW = (cols: ColDef[]) => mabColWidth(cols, mode, maxNumber, style);
    const mabPerRow = (cols: ColDef[], want: number, gap: number) =>
        fitCols(availableWidth - 12, (cols.length * colW(cols) + 4) * fontScale, want, gap);
    // A four-place positietabel is 300 glyph-px wide (nine duizendtallen: ~750), so above
    // ~15pt it no longer fits a half-width cell however few per row: the figure's own font-size
    // is therefore the sheet size capped at what the cell can hold. It stops growing instead
    // of clipping in print.
    const figureFontPx = (cols: ColDef[]) => Math.min(
        sheetSizePx,
        ((availableWidth - 12) / (cols.length * colW(cols) + 4)) * PX_PER_EM_AT_DEFAULT,
    ) * (narrowTekenen ? 0.75 : 1);
    const exercises: MabExercise[] = block.mabExercises || [];
    if (exercises.length === 0) {
        return (
            <div className="no-print" style={{ padding: '8px 0', fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px' }}>
                (Nog geen oefeningen — klik Genereer)
            </div>
        );
    }

    const perRow: number = c.exercisesPerRow || 3;
    // Back-compat: blocks saved before the rename used `showBox: boolean`.
    const scaffolding: MabScaffolding = c.scaffolding ?? (c.showBox === false ? 'geen' : 'positietabel');
    const squarePattern = usesSquarePattern(mode, maxNumber);
    const answerHeight: number = c.answerHeight || 36;
    const gap = block.verticalSpacing || 14;

    // Columns left → right in place-value order (largest place first).
    const cols: ColDef[] = [];
    if (maxNumber >= 1000) cols.push({ key: 'D', place: 'thousands' });
    if (maxNumber >= 100)  cols.push({ key: 'H', place: 'hundreds' });
    // >= 10 (not 20): at maxNumber=10 the value 10 itself needs a tens column, else it renders as zero blocks
    if (maxNumber >= 10)   cols.push({ key: 'T', place: 'tens' });
    cols.push({ key: 'E', place: 'units' });
    const boxHeight: number = squarePattern ? Math.max(c.boxHeight || 70, patternBoxFloor(cols, style, maxNumber)) : c.boxHeight || 70;

    return (
        <FragmentableGrid
            cols={mabPerRow(cols, perRow, gap)}
            shrinks={mode === 'tekenen' && !narrowTekenen}
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
                    figureFontPx={figureFontPx(cols)}
                    showSolutions={showSolutions}
                    mode={mode}
                    laid={laid}
                    cardW={availableWidth}
                    colWidth={colW(cols)}
                    squarePattern={squarePattern}
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
    figureFontPx: number;
    showSolutions: boolean;
    mode: 'herkennen' | 'tekenen';
    laid: InteractionState | null;
    cardW: number;
    colWidth: number;
    squarePattern: boolean;
}

function MabItem({ ex, style, cols, scaffolding, boxHeight, answerHeight, figureFontPx, showSolutions, mode, laid, cardW, colWidth, squarePattern }: ItemProps) {
    const digits: Record<MabPlace, number> = {
        thousands: ex.thousands,
        hundreds: ex.hundreds,
        tens: ex.tens,
        units: ex.units,
    };
    const countOf = (col: ColDef) => (laid ? builtCount(laid, col.key) : digits[col.place]);
    // The Dienes glyphs are fixed-size on purpose (a tens rod IS ten unit cubes wide), so
    // plain 1fr columns squeeze them the moment the block is narrower than full width and
    // the place-value reading breaks. Each column therefore gets an explicit minimum equal
    // to its own glyph, and shares only the leftover slack.
    //
    // The columns are a FIXED em width, not minmax(...,1fr): the header row and the drawing row are
    // separate grids, and any flexible track resolves differently in each, so the H/T/E
    // labels drift out of line with the blocks underneath them. Fixed also means the
    // exercise never resizes — a narrow block simply fits fewer per row (as the clocks do).
    const scaffold = useShowScaffold();
    // Oefenmodus card: the cells fill the card's width and the pieces scale from the cell's box.
    const cell = scaffold ? null : kioskCellBox(cardW, cols.length);
    const gridCols = `repeat(${cols.length}, ${cell ? `${cell.w}px` : em(colWidth)})`;
    const hasBorder = scaffolding === 'positietabel' || scaffolding === 'kader';
    const hasHeader = scaffolding === 'positietabel';
    const hasDividers = scaffolding === 'positietabel';
    // In tekenen mode the student draws — only render glyphs when showing solutions.
    const showGlyphs = mode === 'herkennen' || showSolutions || laid !== null;
    // In tekenen mode the number is printed on the answer line by default; in
    // herkennen mode the line stays empty unless solutions are shown.
    const showNumberOnLine = mode === 'tekenen' || showSolutions;
    // Oefenmodus card (no scaffold): herkennen's number is typed in the kiosk panel, so its
    // write-on line goes, and a duizendtal gets its labelled kiosk cube.
    const answerLine = showNumberOnLine || scaffold;

    return (
        <div className="print-exercise" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: 'var(--font-sheet-math)', fontSize: `${figureFontPx}px` }}>
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
                                fontSize: 'calc(var(--sheet-size-math) * 0.81)',
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
                    // em, not px: the drawing area has to grow with the glyphs it holds,
                    // otherwise a bigger font clips them against `overflow: hidden`.
                    // Kiosk (build tray or card): nine rods, grouped in fives with a gap, outgrow the sheet's box, so it grows instead.
                    ...(cell ? { height: cell.h } : laid || !scaffold ? { minHeight: em(boxHeight) } : { height: em(boxHeight) }),
                }}>
                    {cols.map((col, i) => (
                        <div key={col.key} style={{
                            display: 'flex',
                            alignItems: 'flex-end',
                            justifyContent: 'center',
                            padding: cell ? 0 : em(squarePattern ? PATTERN_CELL_PAD : 6),
                            borderRight: hasDividers && i < cols.length - 1 ? '1.5px solid #000' : 'none',
                            overflow: 'hidden',
                            boxSizing: 'border-box',
                        }}>
                            <MabPlaceColumn
                                count={showGlyphs ? countOf(col) : 0}
                                place={col.place}
                                style={style}
                                color={mode === 'tekenen' && showSolutions ? SOL : '#000'}
                                kiosk={!scaffold}
                                cell={cell ?? undefined}
                                squarePattern={squarePattern}
                            />
                        </div>
                    ))}
                </div>
            </div>
            {/* ANSWER LINE — always on the sheet */}
            {answerLine && <div style={{
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
                    ? <span style={{ ...(showSolutions && mode === 'herkennen' ? solutionText : { color: 'inherit' }), fontSize: 'calc(var(--sheet-size-math) * 0.92)' }}>{fmt(ex.value)}</span>
                    : <div style={{ width: '70%', borderBottom: '1.5px solid #000' }} />
                }
            </div>}
        </div>
    );
}

// Kiosk tray: each place's block drawn like the card's (upright rod, flat with its grid) at a long
// side that shows the places' relative size and still fits a tile. px at the 13pt em base.
const TRAY_GLYPH_PX: Record<string, { place: MabPlace; px: number }> = {
    D: { place: 'thousands', px: 34 },
    H: { place: 'hundreds', px: 22 },
    T: { place: 'tens', px: 34 },
    E: { place: 'units', px: 12 },
};

/** A tray tile's picture (EXERCISE_UI TrayPiece): the place letter over one block of that place. */
export function MabTrayPiece({ piece, constraints }: { piece: KioskPiece; constraints: Record<string, unknown> }) {
    const row = TRAY_GLYPH_PX[piece.key];
    if (!row) return <>{piece.key}</>;
    const c = constraints as Partial<MabConstraints>;
    const style: MabStyle = (c.mabStyle === 'realistic' ? 'mab-bw' : c.mabStyle) || 'symbolic';
    return (
        <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '0.15em' }}>
            <span style={{ fontWeight: 700, lineHeight: 1, fontSize: 'calc(var(--sheet-size-math) * 1.2)' }}>{piece.key}</span>
            <span style={{ display: 'inline-flex', fontSize: 'var(--sheet-size-math)' }}>
                <MabKioskTrayGlyph place={row.place} style={style} px={row.px} />
            </span>
        </span>
    );
}
