import React, { useState } from 'react';
import { useWorksheetStore } from '../../store/useWorksheetStore';
import type { MathBlock, CijferExercise, CijferConstraints } from '../../services/math/types';
import { useBlockWidth, useShowScaffold, useSheetSizePx, FULL_BLOCK_WIDTH_PX } from './BlockWidthContext';
import { cellPxOf } from './cijferGrid';
import { opGlyph } from '../../services/math/formatters';
import { PLACE_VALUES } from '../../services/math/mathEngine';
import { SOL, solutionText } from './solutionStyle';
import { monoTextPx } from '../../services/layout/blockLayout';
import { divideToDecimals } from '../../services/cijferen/cijferGenerator';
import { addSubMaxInt, cijferDp as dpOf, computeAddCarries, getDigitCols, intLen, mulLayout, ppDigitCols } from '../../services/cijferen/cijferLayout';
import { cijferKioskGrid, kioskMulRows, type CijferCell } from '../../services/cijferen/cijferCells';
import { borrowedProps, useViewerInteraction } from './ViewerInteractionContext';
import KioskCell from './KioskCell';

// Printed sheet text (equation header, estimation/controle/QR rows) is a factor of
// --sheet-size-math; the digit-grid overlay scales off the per-block gridCellSize instead
// (its own system, not the sheet-wide token), and manual-edit affordances stay screen px.
const GRID_COLOR = '#aaaaaa';
// Units first, so index = columns left of the E column; derived so TM / HM / Mrd grids get headers.
const PLACE_ABBREVS = PLACE_VALUES.filter(p => p.weight >= 1).map(p => p.key).reverse();
const DEC_ABBREVS = ['t', 'h', 'd'];
const NBSP = String.fromCharCode(0xa0);

const ROW_GAP_PX = 12;
// The header row ("1 234 + 567 =") is Azeret Mono at 0.64 of the math token, inside 8px
// of padding either side and a 0.5px border. SYNC: the header cell's fontSize below.
const HEADER_FONT = 0.64;
const HEADER_PAD_PX = 18;

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDisplay(n: number, dp: number): string {
    const s = dp > 0 ? Math.abs(n).toFixed(dp) : String(Math.abs(Math.round(n)));
    const [intP, decP] = s.split('.');
    const intFmt = intP.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return dp > 0 ? `${intFmt},${decP}` : intFmt;
}

function computeEstimation(ex: CijferExercise): string {
    const roundSig = (n: number): number => {
        if (n === 0) return 0;
        const mag = Math.pow(10, Math.floor(Math.log10(Math.abs(n))) - 1);
        return Math.round(n / mag) * mag;
    };
    // Same space thousands separator as the header line (was '.'), but non-breaking: this row
    // wraps inside its box at 1e9, and "≈ 1 / 000 000 000" split a number across two lines.
    const fmtR = (n: number) => (Math.round(n) < 0 ? '-' : '') + fmtDisplay(n, 0).replace(/ /g, NBSP);
    const opStr = ex.operator === 'x' ? '×' : ex.operator === ':' ? '÷' : ex.operator;
    const rounded = ex.operands.map(o => roundSig(parseFloat(o.toFixed(0))));
    let est = rounded[0];
    for (let i = 1; i < rounded.length; i++) {
        if (ex.operator === '+') est += rounded[i];
        else if (ex.operator === '-') est -= rounded[i];
        else if (ex.operator === 'x') est *= rounded[i];
        else if (ex.operator === ':') est = Math.round(est / rounded[i]);
    }
    return rounded.map(fmtR).join(` ${opStr} `) + ` ≈ ${fmtR(est)}`;
}

// The clickable "1 234 + 567 =" line above the grid. Module level because the width
// estimate needs it too — the header can be wider than the grid for small operands.
function headerTextOf(ex: CijferExercise, dp: number): string {
    const opStr = ex.operator === 'x' ? '×' : ex.operator;
    return ex.operands.map((o, i) => {
        // divisor and multiplier are normally integers; use dp only when they are decimal
        if ((ex.operator === ':' && i === 1) || (ex.operator === 'x' && i > 0)) {
            return fmtDisplay(o, Number.isInteger(o) ? 0 : dp);
        }
        return fmtDisplay(o, dp);
    }).join(` ${opStr} `) + ' =';
}

// Grid col = digit col + 1 (operator at col 0).
const toGridCol = (digitCol: number) => digitCol + 1;

// Place label for grid col. No comma column — decimal cols start at maxInt+1.
function placeLabel(gridCol: number, maxInt: number, dp: number): string | null {
    if (gridCol === 0) return null;
    if (gridCol >= 1 && gridCol <= maxInt) return PLACE_ABBREVS[maxInt - gridCol] ?? null;
    if (dp > 0 && gridCol > maxInt) return DEC_ABBREVS[gridCol - maxInt - 1] ?? null;
    return null;
}

// ── How many columns each grid draws ─────────────────────────────────────────
// SYNC: the three grid components below call these, and so does the width estimate. They
// used to be two separate calculations — the estimate guessed from maxRange, which
// over-stated a block of small numbers by a whole column and cost it an exercise per row.

function addSubGridCols(ex: CijferExercise, dp: number, extraCols: number): number {
    const maxInt = addSubMaxInt(ex);
    return 1 + maxInt + dp + extraCols;
}

function mulGridCols(ex: CijferExercise, dp: number, extraCols: number): number {
    return 1 + mulLayout(ex, dp).digitCols + extraCols;
}

function divGridCols(ex: CijferExercise, dp: number, extraCols: number): number {
    // The working area always keeps at least 3 decimal columns so a pupil can work past dp.
    const workingDecCols = dp > 0 ? Math.max(dp, 3) : 0;
    const leftCols = intLen(ex.operands[0]) + workingDecCols;
    const rightCols = Math.max(intLen(ex.operands[1]), intLen(ex.operands[0]) + dp);
    return leftCols + rightCols + extraCols;
}

function gridColsOf(ex: CijferExercise, dp: number, extraCols: number): number {
    return ex.operator === ':' ? divGridCols(ex, dp, extraCols)
        : ex.operator === 'x' ? mulGridCols(ex, dp, extraCols)
        : addSubGridCols(ex, dp, extraCols);
}

// The exercise box is as wide as the WIDER of its grid and its clickable header line.
function exWidthPx(ex: CijferExercise, c: CijferConstraints, CELL: number, sheetPx: number): number {
    const dp = dpOf(ex, c);
    const grid = gridColsOf(ex, dp, c.extraCols || 0) * CELL;
    const header = monoTextPx(headerTextOf(ex, dp).length, HEADER_FONT, sheetPx) + HEADER_PAD_PX;
    return Math.max(grid, header);
}

// Exercises per row, from the exercises themselves, and never so many that the row runs off
// its column: the boxes sit in a nowrap flex row, so a miscount overflows horizontally
// rather than wrapping. Capped at 4 — a fifth columned sum across a full-width block would
// leave no writing room between boxes, which is the whole point of squared paper.
const MAX_EX_PER_ROW = 4;

// A per-exercise box is narrow enough that raw division would still cram 3 across a
// half-width column — readable arithmetically, but too tight for the writing room squared
// paper exists for. So the row count is capped per WIDTH TIER (full/half/quarter), not just
// by whatever the pixels allow: full → 4, half → 2, quarter → 1, still never more than fits.
function tierCapFor(availableWidth: number): number {
    const ratio = availableWidth / FULL_BLOCK_WIDTH_PX;
    if (ratio >= 0.85) return 4;
    if (ratio >= 0.40) return 2;
    return 1;
}

function computeExPerRow(exercises: CijferExercise[], c: CijferConstraints, CELL: number, sheetPx: number, availableWidth: number): number {
    const w = Math.max(...exercises.map(ex => exWidthPx(ex, c, CELL, sheetPx)));
    const fits = Math.floor((availableWidth + ROW_GAP_PX) / (w + ROW_GAP_PX));
    return Math.max(1, Math.min(MAX_EX_PER_ROW, tierCapFor(availableWidth), fits));
}

// ── Digit overlay ─────────────────────────────────────────────────────────────

// attrs: kiosk-only data attributes (a struck top digit after Lenen); empty on the sheet.
interface DCProps { col: number; row: number; char: string; CELL: number; rowH?: number; color?: string; small?: boolean; attrs?: Record<string, string>; }

function DC({ col, row, char, CELL, rowH, color = '#000', small = false, attrs }: DCProps) {
    const H = rowH ?? CELL;
    return (
        <div {...attrs} style={{
            position: 'absolute',
            left: col * CELL, top: row * H,
            width: CELL, height: H,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            // Multipliers chosen so the main digit lands at 17 px at the default CELL=25,
            // matching MathBlockRenderer's font size and avoiding the "cijferen looks
            // smaller than mental math" regression.
            fontSize: small ? CELL * 0.48 : CELL * 0.68,
            fontFamily: 'Azeret Mono, monospace',
            fontWeight: 'normal',
            color, userSelect: 'none', boxSizing: 'border-box', pointerEvents: 'none',
        }}>{char}</div>
    );
}

// Small comma rendered at the right edge of the E column (no dedicated column).
function CommaEdge({ afterGridCol, row, CELL, rowH }: { afterGridCol: number; row: number; CELL: number; rowH?: number }) {
    return (
        <div style={{
            position: 'absolute',
            left: (afterGridCol + 1) * CELL - CELL * 0.28,
            top: row * (rowH ?? CELL),
            width: CELL * 0.32,
            height: rowH ?? CELL,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            paddingBottom: CELL * 0.04,
            fontSize: CELL * 0.60,
            fontFamily: 'Azeret Mono, monospace',
            color: '#888888',
            userSelect: 'none', pointerEvents: 'none',
        }}>,</div>
    );
}

// Oefenmodus: a ruitje the pupil fills on the kiosk card (only drawn under a fill-cells context).
function GridCell({ cell, CELL, rowH }: { cell: CijferCell; CELL: number; rowH?: number }) {
    const H = rowH ?? CELL;
    const scratch = cell.role === 'carry' || cell.role === 'borrow';
    return (
        <KioskCell cellKey={cell.key} variant={scratch ? 'is-grid is-scratch' : 'is-grid'} style={{
            position: 'absolute', left: cell.col * CELL, top: cell.row * H, width: CELL, height: H,
            // SYNC: DC's digit and small sizes.
            fontSize: scratch ? CELL * 0.48 : CELL * 0.68,
        }} />
    );
}

// ── Add/Sub grid ──────────────────────────────────────────────────────────────

// cells: the kiosk card's fill-in grid (operands printed, every answer ruitje and carry a cell).
interface GridProps { ex: CijferExercise; CELL: number; dp: number; scaffolding: number; showSolutions: boolean; extraCols: number; extraRows: number; cells?: boolean; }

function AddSubGrid({ ex, CELL, dp, scaffolding, showSolutions, extraCols, extraRows, cells }: GridProps) {
    const ctx = useViewerInteraction();
    const numTerms = ex.operands.length;
    const maxInt = addSubMaxInt(ex);
    const decCols = dp;  // no dedicated comma column

    const gridCols = addSubGridCols(ex, dp, extraCols);
    // SYNC: cijferCells KIOSK_CARRY_ROW: the card keeps one exchange row above a subtraction.
    const freeRows = ex.operator === '-' && !cells ? 2 : 1;
    const firstOperandRow = 1 + freeRows;
    const lastOperandRow = firstOperandRow + numTerms - 1;
    const lineRow = lastOperandRow + 1;
    const answerRow = lineRow;        // answer sits right below the thick line (no gap row)
    const totalRows = answerRow + 1 + extraRows;

    const gridW = gridCols * CELL;
    const gridH = totalRows * CELL;

    // E column grid index (units digit)
    const eGridCol = maxInt;

    return (
        <div style={{ position: 'relative', width: gridW, height: gridH, flexShrink: 0, marginTop: cells ? 0 : 4 }}>
            {/* One px wider and taller than the grid, and every line offset half a stroke:
                a line drawn exactly at gridW/gridH sits half outside the viewport and is
                clipped away on screen (it survives at print DPI, so the sheet and the paper
                disagreed about the closing line of every grid). */}
            <svg width={gridW + 1} height={gridH + 1} shapeRendering="crispEdges" style={{ position: 'absolute', top: 0, left: 0 }}>
                {Array.from({ length: totalRows + 1 }, (_, r) => (
                    <line key={`h${r}`} x1={0} y1={r * CELL + 0.5} x2={gridW} y2={r * CELL + 0.5} stroke={GRID_COLOR} strokeWidth={0.5} />
                ))}
                {Array.from({ length: gridCols + 1 }, (_, c) => (
                    <line key={`v${c}`} x1={c * CELL + 0.5} y1={0} x2={c * CELL + 0.5} y2={gridH} stroke={GRID_COLOR} strokeWidth={0.5} />
                ))}
                {scaffolding <= 2 && (
                    <>
                        <line x1={0} y1={1 * CELL} x2={gridW} y2={1 * CELL} stroke="#ccc" strokeWidth={1} />
                        <line x1={0} y1={lineRow * CELL} x2={gridW} y2={lineRow * CELL} stroke="#222" strokeWidth={2} />
                    </>
                )}
            </svg>

            {/* Place value headers */}
            {scaffolding <= 2 && Array.from({ length: gridCols }, (_, c) => {
                const label = placeLabel(c, maxInt, dp);
                if (!label) return null;
                return (
                    <div key={`pv${c}`} style={{
                        position: 'absolute', left: c * CELL, top: 0,
                        width: CELL, height: CELL,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: CELL * 0.44, fontFamily: 'Azeret Mono, monospace',
                        color: '#888', userSelect: 'none', pointerEvents: 'none',
                    }}>{label}</div>
                );
            })}

            {/* Operator sign */}
            {scaffolding <= 2 && (
                <DC col={0} row={lastOperandRow} char={opGlyph(ex.operator)} CELL={CELL} />
            )}

            {/* Level 1: pre-filled operands */}
            {scaffolding <= 1 && ex.operands.map((op, opIdx) => {
                const row = firstOperandRow + opIdx;
                return getDigitCols(op, dp, maxInt)
                    .map((d, i) => <DC key={`op${opIdx}_${i}`} col={toGridCol(d.col)} row={row} char={d.char} CELL={CELL}
                        attrs={opIdx === 0 ? borrowedProps(ctx, `b${d.col}`) : undefined} />);
            })}

            {/* Comma overlay after E col for each operand row (scaffolding=1, decimal) */}
            {scaffolding <= 1 && dp > 0 && Array.from({ length: numTerms }, (_, opIdx) => (
                <CommaEdge key={`cop${opIdx}`} afterGridCol={eGridCol} row={firstOperandRow + opIdx} CELL={CELL} />
            ))}

            {/* Level 1 + solutions: answer */}
            {scaffolding <= 1 && showSolutions &&
                getDigitCols(ex.answer, dp, maxInt)
                    .map((d, i) => <DC key={`ans${i}`} col={toGridCol(d.col)} row={answerRow} char={d.char} CELL={CELL} color={SOL} />)
            }
            {scaffolding <= 1 && showSolutions && dp > 0 && (
                <CommaEdge afterGridCol={eGridCol} row={answerRow} CELL={CELL} />
            )}

            {/* Level 1 + solutions: carry row */}
            {scaffolding <= 1 && showSolutions && ex.operator === '+' &&
                computeAddCarries(ex.operands, dp, maxInt)
                    .filter(c => c.col >= 0 && c.col < maxInt + decCols)
                    .map((c, i) => <DC key={`carry${i}`} col={toGridCol(c.col)} row={freeRows} char={String(c.carry)} CELL={CELL} color={SOL} small />)
            }

            {cells && cijferKioskGrid(ex, dp).cells.map(cell => <GridCell key={cell.key} cell={cell} CELL={CELL} />)}
            {cells && dp > 0 && <CommaEdge afterGridCol={eGridCol} row={answerRow} CELL={CELL} />}
        </div>
    );
}

// ── Multiplication grid ───────────────────────────────────────────────────────

function MultiplicationGrid({ ex, CELL, dp, scaffolding, showSolutions, extraCols, extraRows, cells }: GridProps) {
    const multiplicand = ex.operands[0];
    const multiplier = ex.operands[1];

    const { mdp, tdp, partialProducts, digitCols, n } = mulLayout(ex, dp);
    // Whole-number rows are right-aligned over digitCols; each row's comma sits after its own integer part
    const maxInt = digitCols - tdp;
    const mcInt = digitCols - dp;
    const mlInt = digitCols - mdp;
    // SYNC: cijferCells kioskMulRows — the card keeps only the rows the pupil fills.
    const kiosk = cells ? kioskMulRows(n) : null;
    const multiplicandRow = kiosk?.multiplicand ?? 2;
    const multiplierRow = kiosk?.multiplier ?? 3;
    const lineRow1 = kiosk?.ppStart ?? 4;
    const ppStartRow = lineRow1;      // partial products start immediately below first thick line
    const ppRows = kiosk?.ppRows ?? n;
    const lineRow2 = ppStartRow + ppRows;
    const answerRow = lineRow2;       // answer sits right below the second thick line (no gap row)
    const totalRows = answerRow + 1 + extraRows;

    const gridCols = mulGridCols(ex, dp, extraCols);
    const gridW = gridCols * CELL;
    const gridH = totalRows * CELL;

    return (
        <div style={{ position: 'relative', width: gridW, height: gridH, flexShrink: 0, marginTop: cells ? 0 : 4 }}>
            {/* One px wider and taller than the grid, and every line offset half a stroke:
                a line drawn exactly at gridW/gridH sits half outside the viewport and is
                clipped away on screen (it survives at print DPI, so the sheet and the paper
                disagreed about the closing line of every grid). */}
            <svg width={gridW + 1} height={gridH + 1} shapeRendering="crispEdges" style={{ position: 'absolute', top: 0, left: 0 }}>
                {Array.from({ length: totalRows + 1 }, (_, r) => (
                    <line key={`h${r}`} x1={0} y1={r * CELL + 0.5} x2={gridW} y2={r * CELL + 0.5} stroke={GRID_COLOR} strokeWidth={0.5} />
                ))}
                {Array.from({ length: gridCols + 1 }, (_, c) => (
                    <line key={`v${c}`} x1={c * CELL + 0.5} y1={0} x2={c * CELL + 0.5} y2={gridH} stroke={GRID_COLOR} strokeWidth={0.5} />
                ))}
                {scaffolding <= 2 && (
                    <>
                        <line x1={0} y1={1 * CELL} x2={gridW} y2={1 * CELL} stroke="#ccc" strokeWidth={1} />
                        <line x1={0} y1={lineRow1 * CELL} x2={gridW} y2={lineRow1 * CELL} stroke="#222" strokeWidth={2} />
                        <line x1={0} y1={lineRow2 * CELL} x2={gridW} y2={lineRow2 * CELL} stroke="#222" strokeWidth={2} />
                    </>
                )}
            </svg>

            {/* Place value headers */}
            {scaffolding <= 2 && Array.from({ length: gridCols }, (_, c) => {
                const label = placeLabel(c, maxInt, tdp);
                if (!label) return null;
                return (
                    <div key={`pv${c}`} style={{
                        position: 'absolute', left: c * CELL, top: 0,
                        width: CELL, height: CELL,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: CELL * 0.44, fontFamily: 'Azeret Mono, monospace',
                        color: '#888', userSelect: 'none', pointerEvents: 'none',
                    }}>{label}</div>
                );
            })}

            {/* Operator signs */}
            {scaffolding <= 2 && (
                <>
                    <DC col={0} row={multiplierRow} char="×" CELL={CELL} />
                    {ppRows > 0 && <DC col={0} row={ppStartRow + n - 1} char="+" CELL={CELL} />}
                </>
            )}

            {/* Level 1: multiplicand */}
            {scaffolding <= 1 &&
                getDigitCols(multiplicand, dp, mcInt)
                    .map((d, i) => <DC key={`mc${i}`} col={toGridCol(d.col)} row={multiplicandRow} char={d.char} CELL={CELL} />)
            }
            {scaffolding <= 1 && dp > 0 && (
                <CommaEdge afterGridCol={mcInt} row={multiplicandRow} CELL={CELL} />
            )}

            {/* Level 1: multiplier */}
            {scaffolding <= 1 &&
                getDigitCols(multiplier, mdp, mlInt)
                    .map((d, i) => <DC key={`ml${i}`} col={toGridCol(d.col)} row={multiplierRow} char={d.char} CELL={CELL} />)
            }
            {scaffolding <= 1 && mdp > 0 && (
                <CommaEdge afterGridCol={mlInt} row={multiplierRow} CELL={CELL} />
            )}

            {/* Partial products — student fills these in; shown as solutions only */}
            {scaffolding <= 1 && showSolutions && partialProducts.map((pp, ppIdx) => {
                const row = ppStartRow + (n - 1 - ppIdx);
                return ppDigitCols(pp, digitCols).map((d, i) => (
                    <DC key={`pp${ppIdx}_${i}`} col={toGridCol(d.col)} row={row} char={d.char} CELL={CELL} color={SOL} />
                ));
            })}

            {/* Level 1 + solutions: answer */}
            {scaffolding <= 1 && showSolutions &&
                getDigitCols(ex.answer, tdp, maxInt)
                    .map((d, i) => <DC key={`ans${i}`} col={toGridCol(d.col)} row={answerRow} char={d.char} CELL={CELL} color={SOL} />)
            }
            {scaffolding <= 1 && showSolutions && tdp > 0 && (
                <CommaEdge afterGridCol={maxInt} row={answerRow} CELL={CELL} />
            )}

            {cells && cijferKioskGrid(ex, dp).cells.map(cell => <GridCell key={cell.key} cell={cell} CELL={CELL} />)}
            {cells && tdp > 0 && <CommaEdge afterGridCol={maxInt} row={answerRow} CELL={CELL} />}
        </div>
    );
}

// ── Division grid ─────────────────────────────────────────────────────────────
// Dutch staartdeling: dividend left, divisor top-right (in box), quotient below horizontal line.

function DivisionGrid({ ex, CELL, dp, scaffolding, showSolutions, extraCols, extraRows, cells }: GridProps) {
    const dividend = ex.operands[0];
    const divisor = ex.operands[1];
    const quotient = ex.answer;

    const dividendIntCols = intLen(dividend);
    const divisorCols = intLen(divisor);
    // always same width as dividend — student must determine how many digits the quotient needs
    const quotientIntCols = dividendIntCols;

    // Working area always has at least 3 decimal cols so students can work past dp if needed
    const workingDecCols = dp > 0 ? Math.max(dp, 3) : 0;
    const dividendDecStr = dp > 0 ? (dividend.toFixed(dp).split('.')[1] || '') : '';
    const leftCols = dividendIntCols + workingDecCols;
    const rightContentCols = Math.max(divisorCols, quotientIntCols + dp);
    const rightCols = rightContentCols;
    const totalCols = leftCols + rightCols + extraCols;

    // The card keeps one working row: the pupil cannot write the subtractions on a screen.
    const workingRows = cells ? 1 : leftCols * 2 + 1;
    const totalRows = 1 + workingRows + extraRows;

    // A staartdeling's working rows carry a subtraction written UNDER the digits above it,
    // so a square ruitje is the one place on the sheet where the cell is the writing room
    // rather than a guide. 10% taller is what makes the row writable without turning the
    // column guides into rectangles anyone would notice.
    const ROW_H = CELL * 1.1;

    const gridW = totalCols * CELL;
    const gridH = totalRows * ROW_H;

    return (
        <div style={{ position: 'relative', width: gridW, height: gridH, flexShrink: 0, marginTop: cells ? 0 : 4 }}>
            {/* One px wider and taller than the grid, and every line offset half a stroke:
                a line drawn exactly at gridW/gridH sits half outside the viewport and is
                clipped away on screen (it survives at print DPI, so the sheet and the paper
                disagreed about the closing line of every grid). */}
            <svg width={gridW + 1} height={gridH + 1} shapeRendering="crispEdges" style={{ position: 'absolute', top: 0, left: 0 }}>
                {Array.from({ length: totalRows + 1 }, (_, r) => (
                    <line key={`h${r}`} x1={0} y1={r * ROW_H + 0.5} x2={gridW} y2={r * ROW_H + 0.5} stroke={GRID_COLOR} strokeWidth={0.5} />
                ))}
                {Array.from({ length: totalCols + 1 }, (_, c) => (
                    <line key={`v${c}`} x1={c * CELL + 0.5} y1={0} x2={c * CELL + 0.5} y2={gridH} stroke={GRID_COLOR} strokeWidth={0.5} />
                ))}
                {scaffolding <= 2 && (
                    <>
                        {/* Vertical separator: left section | right section (full height) */}
                        <line x1={leftCols * CELL} y1={0} x2={leftCols * CELL} y2={gridH} stroke="#222" strokeWidth={2} />
                        {/* Divisor box top (right section only) */}
                        <line x1={leftCols * CELL} y1={1} x2={gridW} y2={1} stroke="#222" strokeWidth={2} />
                        {/* Divisor box bottom = quotient separator */}
                        <line x1={leftCols * CELL} y1={ROW_H} x2={gridW} y2={ROW_H} stroke="#222" strokeWidth={2} />
                    </>
                )}
            </svg>

            {/* Dividend integer digits (left, row 0) */}
            {scaffolding <= 1 && getDigitCols(dividend, 0, dividendIntCols).map((d, i) => (
                <DC key={`dv${i}`} col={d.col} row={0} char={d.char} CELL={CELL} rowH={ROW_H} />
            ))}
            {/* Decimal digits of dividend (actual digits if dividend is decimal, else "0") */}
            {scaffolding <= 1 && workingDecCols > 0 && Array.from({ length: dp }, (_, i) => (
                <DC key={`dvd${i}`} col={dividendIntCols + i} row={0} char={dividendDecStr[i] || '0'} CELL={CELL} rowH={ROW_H} />
            ))}
            {/* Comma after dividend units column */}
            {scaffolding <= 1 && workingDecCols > 0 && (
                <CommaEdge afterGridCol={dividendIntCols - 1} row={0} CELL={CELL} rowH={ROW_H} />
            )}

            {/* Divisor digits (right section, row 0) */}
            {scaffolding <= 1 && getDigitCols(divisor, 0, divisorCols).map((d, i) => (
                <DC key={`dr${i}`} col={leftCols + d.col} row={0} char={d.char} CELL={CELL} rowH={ROW_H} />
            ))}

            {/* Quotient digits (right section, row 1 — below horizontal line) */}
            {scaffolding <= 1 && showSolutions && (
                getDigitCols(quotient, dp, quotientIntCols)
                    .map((d, i) => <DC key={`qt${i}`} col={leftCols + d.col} row={1} char={d.char} CELL={CELL} rowH={ROW_H} color={SOL} />)
            )}
            {scaffolding <= 1 && showSolutions && dp > 0 && (
                <CommaEdge afterGridCol={leftCols + quotientIntCols - 1} row={1} CELL={CELL} rowH={ROW_H} />
            )}

            {cells && cijferKioskGrid(ex, dp).cells.filter(cell => cell.role === 'quotient')
                .map(cell => <GridCell key={cell.key} cell={cell} CELL={CELL} rowH={ROW_H} />)}
            {cells && dp > 0 && <CommaEdge afterGridCol={leftCols + quotientIntCols - 1} row={1} CELL={CELL} rowH={ROW_H} />}
        </div>
    );
}

// ── Exercise box ──────────────────────────────────────────────────────────────

interface ExProps { ex: CijferExercise; c: CijferConstraints; CELL: number; showSolutions: boolean; blockId: string; }

function CijferExercisePreview({ ex, c, CELL, showSolutions, blockId }: ExProps) {
    const updateCijferExercise = useWorksheetStore((s) => s.updateCijferExercise);
    const [editing, setEditing] = useState(false);
    const [editValues, setEditValues] = useState<string[]>([]);
    const scaffold = useShowScaffold();
    // Oefenmodus: the pupil fills the grid on the card, so it is drawn there with the operands in.
    const cells = useViewerInteraction()?.kind === 'fill-cells';

    const dp = dpOf(ex, c);
    const scaffolding = cells ? 1 : c.scaffolding || 3;
    const isDivision = ex.operator === ':';
    const isMultiplication = ex.operator === 'x';
    const extraCols = cells ? 0 : c.extraCols || 0;
    const extraRows = cells ? 0 : c.extraRows || 0;

    const opStr = ex.operator === 'x' ? '×' : ex.operator;
    const headerText = headerTextOf(ex, dp);

    const confirmEdit = () => {
        const operands = editValues.map(v => parseFloat(v.replace(',', '.')));
        if (operands.some(isNaN) || operands.some(v => v < 0)) { setEditing(false); return; }
        let answer: number;
        let remainder = 0;
        if (ex.operator === '+') answer = parseFloat(operands.reduce((a, b) => a + b, 0).toFixed(dp));
        else if (ex.operator === '-') answer = parseFloat((operands[0] - operands[1]).toFixed(dp));
        else if (ex.operator === 'x') answer = parseFloat((operands[0] * operands[1]).toFixed(2 * dp));
        else if (dp > 0) {
            // Same helper as the generator, so an edited exercise gets the same true q and r.
            ({ quotient: answer, remainder } = divideToDecimals(operands[0], operands[1], dp));
        }
        else { answer = Math.floor(operands[0] / operands[1]); remainder = operands[0] % operands[1]; }
        updateCijferExercise(blockId, ex.id, { operands, answer, remainder, isManuallyEdited: true });
        setEditing(false);
    };

    return (
        <div className="print-exercise" style={{ marginBottom: cells ? 0 : 6, display: 'inline-flex', flexDirection: 'column' }}>
            {/* The fill-in card writes the operands in the grid, and a pupil must not open the teacher's edit form. */}
            {cells ? null : editing ? (
                <div style={{ border: '0.5px solid #4a90d9', padding: '4px 8px', backgroundColor: '#f0f8ff', display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {ex.operands.map((_, i) => (
                        <React.Fragment key={i}>
                            {i > 0 && <span style={{ fontSize: 11, fontFamily: 'Azeret Mono, monospace' }}>{opStr}</span>}
                            <input
                                type="number"
                                value={editValues[i] ?? ''}
                                onChange={e => setEditValues(prev => { const next = [...prev]; next[i] = e.target.value; return next; })}
                                onKeyDown={e => { if (e.key === 'Enter') confirmEdit(); if (e.key === 'Escape') setEditing(false); }}
                                style={{ width: 70, fontSize: 11, fontFamily: 'Azeret Mono, monospace', textAlign: 'right', border: '1px solid #4a90d9', borderRadius: 3, padding: '1px 4px' }}
                            />
                        </React.Fragment>
                    ))}
                    <span style={{ fontSize: 11, fontFamily: 'Azeret Mono, monospace' }}>=</span>
                    <button onClick={confirmEdit} style={{ fontSize: 11, padding: '1px 6px', cursor: 'pointer', border: '1px solid #aaa', borderRadius: 3 }}>✓</button>
                    <button onClick={() => setEditing(false)} style={{ fontSize: 11, padding: '1px 6px', cursor: 'pointer', border: '1px solid #aaa', borderRadius: 3 }}>✗</button>
                </div>
            ) : (
                <div
                    onClick={() => { setEditValues(ex.operands.map(o => String(o))); setEditing(true); }}
                    title="Klik om te bewerken"
                    style={{ border: '0.5px solid #aaa', padding: '4px 8px', textAlign: 'center', fontSize: 'calc(var(--sheet-size-math) * 0.64)', fontFamily: 'Azeret Mono, monospace', backgroundColor: '#fff', cursor: 'pointer', userSelect: 'none' }}
                >
                    {headerText}
                </div>
            )}
            {c.withEstimation && scaffold && (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', padding: '2px 8px 4px', borderBottom: '0.5px solid #aaa', fontFamily: 'Azeret Mono, monospace', fontSize: 'calc(var(--sheet-size-math) * 0.64)' }}>
                    <span>≈</span>
                    {showSolutions
                        ? <span style={{ ...solutionText, marginLeft: '4px' }}>{computeEstimation(ex)}</span>
                        : <div style={{ flex: 1, borderBottom: '1px solid #aaa', height: '13px', marginLeft: '2px' }} />
                    }
                </div>
            )}
            {/* A display-only oefenmodus card shows the sum alone; a fill-cells card the grid to fill. */}
            {!scaffold && !cells ? null : isDivision
                ? <DivisionGrid ex={ex} CELL={CELL} dp={dp} scaffolding={scaffolding} showSolutions={showSolutions} extraCols={extraCols} extraRows={extraRows} cells={cells} />
                : isMultiplication
                ? <MultiplicationGrid ex={ex} CELL={CELL} dp={dp} scaffolding={scaffolding} showSolutions={showSolutions} extraCols={extraCols} extraRows={extraRows} cells={cells} />
                : <AddSubGrid ex={ex} CELL={CELL} dp={dp} scaffolding={scaffolding} showSolutions={showSolutions} extraCols={extraCols} extraRows={extraRows} cells={cells} />
            }
            {isDivision && cells && (
                <div style={{ display: 'flex', alignItems: 'center', gap: CELL * 0.3, marginTop: CELL * 0.3, fontFamily: 'Azeret Mono, monospace', fontSize: CELL * 0.68 }}>
                    <span>r</span>
                    <KioskCell cellKey="r" variant="is-grid is-rest" style={{ position: 'relative', width: CELL * 3, height: CELL, fontSize: CELL * 0.68 }} />
                </div>
            )}
            {/* Controle via de omgekeerde bewerking (add/sub only): write-line under the sum. */}
            {!isDivision && !isMultiplication && scaffold && !!(c as { omgekeerdeControle?: boolean }).omgekeerdeControle && (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', padding: '4px 8px', borderTop: '0.5px solid #aaa', fontFamily: 'Azeret Mono, monospace', fontSize: 'calc(var(--sheet-size-math) * 0.64)' }}>
                    <span style={{ flexShrink: 0 }}>controle:</span>
                    {showSolutions
                        ? <span style={{ ...solutionText, marginLeft: '4px' }}>
                            {/* Inverse check over ALL terms: a+b+c=S → S−b−c=a; a−b−c=R → R+b+c=a */}
                            {(() => {
                                const invOp = ex.operator === '+' ? '−' : '+';
                                const rest = ex.operands.slice(1).map(o => `${invOp} ${fmtDisplay(o, dp)}`).join(' ');
                                return `${fmtDisplay(ex.answer, dp)} ${rest} = ${fmtDisplay(ex.operands[0], dp)}`;
                            })()}
                        </span>
                        : <div style={{ flex: 1, borderBottom: '1px solid #aaa', height: '13px', marginLeft: '2px' }} />}
                </div>
            )}
            {isDivision && scaffold && (c.showQR !== false) && (
                <div style={{ border: '0.5px solid #aaa', backgroundColor: '#e8e8e8', padding: '4px 8px', marginTop: 8, fontFamily: 'Azeret Mono, monospace', fontSize: 'calc(var(--sheet-size-math) * 0.58)', display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {showSolutions ? (
                        <>
                            <span>q  <span style={solutionText}>{fmtDisplay(ex.answer, dp)}</span></span>
                            <span>r  <span style={solutionText}>{ex.remainder > 0 ? fmtDisplay(ex.remainder, dp) : '0'}</span></span>
                        </>
                    ) : (
                        <>
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
                                <span style={{ flexShrink: 0 }}>q</span>
                                <div style={{ flex: 1, borderBottom: '1px solid #555', minHeight: 14 }} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
                                <span style={{ flexShrink: 0 }}>r</span>
                                <div style={{ flex: 1, borderBottom: '1px solid #555', minHeight: 14 }} />
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Main export ───────────────────────────────────────────────────────────────

interface Props { block: MathBlock; showSolutions: boolean; }

export default function CijferViewer({ block, showSolutions }: Props) {
    const availableWidth = useBlockWidth();
    const sheetPx = useSheetSizePx('math');
    const c = block.constraints as CijferConstraints;
    const exercises = (block.cijferExercises || []) as CijferExercise[];
    // The ruitje is a multiplier of the 25px nominal times the math token, so the squared
    // paper grows with the Lettergrootte slider like the digits written on it (they were
    // raw px, so at 16pt the header and estimation rows grew and the grid did not).
    const CELL = cellPxOf(c.gridCellSize, sheetPx);

    if (exercises.length === 0) {
        return <div style={{ padding: '8px 0', fontStyle: 'italic', color: '#999', fontSize: '14px' }}>(Nog geen oefeningen — klik Genereer)</div>;
    }

    const exPerRow = computeExPerRow(exercises, c, CELL, sheetPx, availableWidth);

    const groups: CijferExercise[][] = [];
    exercises.forEach((ex, i) => {
        if (i % exPerRow === 0) groups.push([ex]);
        else groups[groups.length - 1].push(ex);
    });

    if (exPerRow === 1) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
                {exercises.map(ex => <CijferExercisePreview key={ex.id} ex={ex} c={c} CELL={CELL} showSolutions={showSolutions} blockId={block.id} />)}
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {groups.map((group, i) => (
                <div key={i} className="print-exercise" style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start' }}>
                    {group.map(ex => <CijferExercisePreview key={ex.id} ex={ex} c={c} CELL={CELL} showSolutions={showSolutions} blockId={block.id} />)}
                </div>
            ))}
        </div>
    );
}
