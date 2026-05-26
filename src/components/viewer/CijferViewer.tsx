import React, { useState } from 'react';
import { useWorksheetStore } from '../../store/useWorksheetStore';
import type { MathBlock, CijferExercise, CijferConstraints } from '../../services/math/types';

const GRID_COLOR = '#aaaaaa';
const SOL_COLOR = '#e11d48';
const PLACE_ABBREVS = ['E', 'T', 'H', 'D', 'TD', 'HD', 'M'];
const DEC_ABBREVS = ['t', 'h', 'd'];

// A4 content width in px: 793px (210mm@96dpi) - 2×68px (18mm margins) - 2×16px (block padding)
const A4_CONTENT_PX = 625;
const ROW_GAP_PX = 12;

// ── Helpers ───────────────────────────────────────────────────────────────────

function intLen(n: number): number {
    const abs = Math.abs(Math.floor(n));
    return abs === 0 ? 1 : String(abs).length;
}

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
    const fmtR = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
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

// Decimal cols at intCols+i (no comma column).
function getDigitCols(num: number, dp: number, intCols: number): { col: number; char: string }[] {
    const s = dp > 0 ? Math.abs(num).toFixed(dp) : String(Math.abs(Math.round(num)));
    const [intPart = '0', decPart = ''] = s.split('.');
    const result: { col: number; char: string }[] = [];
    const padded = intPart.padStart(intCols, '0');
    let found = false;
    for (let i = 0; i < intCols; i++) {
        if (padded[i] !== '0') found = true;
        if (found) result.push({ col: i, char: padded[i] });
    }
    if (!found) result.push({ col: intCols - 1, char: '0' });
    if (dp > 0) {
        const padDec = decPart.padEnd(dp, '0');
        for (let i = 0; i < dp; i++) result.push({ col: intCols + i, char: padDec[i] });
    }
    return result;
}

function ppDigitCols(value: number, intCols: number): { col: number; char: string }[] {
    if (value === 0) return [{ col: intCols - 1, char: '0' }];
    const s = String(Math.round(value));
    const offset = intCols - s.length;
    const result: { col: number; char: string }[] = [];
    let found = false;
    for (let i = 0; i < s.length; i++) {
        if (s[i] !== '0') found = true;
        if (found) result.push({ col: offset + i, char: s[i] });
    }
    return result;
}

function computeAddCarries(operands: number[], dp: number, intCols: number): { col: number; carry: number }[] {
    const totalPositions = intCols + dp;
    const carries: { col: number; carry: number }[] = [];
    let carry = 0;
    for (let pos = 0; pos < totalPositions + 1; pos++) {
        let sum = carry;
        for (const op of operands) {
            const scaled = Math.round(Math.abs(op) * Math.pow(10, dp));
            sum += Math.floor(scaled / Math.pow(10, pos)) % 10;
        }
        carry = Math.floor(sum / 10);
        if (carry > 0) {
            const correctedCol = pos < dp
                ? intCols + (dp - 1 - pos)     // decimal positions (no comma col offset)
                : intCols - 1 - (pos - dp);     // integer positions
            carries.push({ col: correctedCol, carry });
        }
    }
    return carries;
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

// Estimates exercise grid width from constraints (for layout).
function estimateExWidth(c: CijferConstraints): number {
    const CELL = c.gridCellSize || 25;
    const dp = c.numberType === 'decimal' ? (c.decimalPlaces || 2) : 0;
    const maxRange = c.maxRange || 1000;
    const maxInt = String(Math.round(maxRange)).length;
    const extra = c.extraCols || 0;
    if (c.operator === ':') {
        const divisorLen = maxRange <= 100 ? 1 : maxRange <= 10_000 ? 2 : 3;
        const dividendLen = String(Math.max(1, Math.round(maxRange) - 1)).length;
        const quotientLen = String(Math.max(1, Math.round(maxRange / 2))).length;
        const workingDecCols = dp > 0 ? Math.max(dp, 3) : 0;
        const leftCols = dividendLen + workingDecCols;
        const rightCols = Math.max(divisorLen, quotientLen + dp) + 2;
        return (leftCols + rightCols + extra) * CELL;
    }
    return (1 + maxInt + dp + extra) * CELL;
}

function computeExPerRow(c: CijferConstraints): number {
    const w = estimateExWidth(c);
    return Math.max(1, Math.min(4, Math.floor((A4_CONTENT_PX + ROW_GAP_PX) / (w + ROW_GAP_PX))));
}

// ── Digit overlay ─────────────────────────────────────────────────────────────

interface DCProps { col: number; row: number; char: string; CELL: number; color?: string; small?: boolean; }

function DC({ col, row, char, CELL, color = '#000', small = false }: DCProps) {
    return (
        <div style={{
            position: 'absolute',
            left: col * CELL, top: row * CELL,
            width: CELL, height: CELL,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: small ? CELL * 0.42 : CELL * 0.60,
            fontFamily: 'Azeret Mono, monospace',
            fontWeight: 'normal',
            color, userSelect: 'none', boxSizing: 'border-box', pointerEvents: 'none',
        }}>{char}</div>
    );
}

// Small comma rendered at the right edge of the E column (no dedicated column).
function CommaEdge({ afterGridCol, row, CELL }: { afterGridCol: number; row: number; CELL: number }) {
    return (
        <div style={{
            position: 'absolute',
            left: (afterGridCol + 1) * CELL - CELL * 0.28,
            top: row * CELL,
            width: CELL * 0.32,
            height: CELL,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            paddingBottom: CELL * 0.04,
            fontSize: CELL * 0.52,
            fontFamily: 'Azeret Mono, monospace',
            color: '#888888',
            userSelect: 'none', pointerEvents: 'none',
        }}>,</div>
    );
}

// ── Add/Sub grid ──────────────────────────────────────────────────────────────

interface GridProps { ex: CijferExercise; CELL: number; dp: number; scaffolding: number; showSolutions: boolean; extraCols: number; extraRows: number; }

function AddSubGrid({ ex, CELL, dp, scaffolding, showSolutions, extraCols, extraRows }: GridProps) {
    const numTerms = ex.operands.length;
    const allNums = [...ex.operands, ex.answer];
    const maxInt = Math.max(...allNums.map(n => intLen(n)));
    const decCols = dp;  // no dedicated comma column

    const gridCols = 1 + maxInt + decCols + extraCols;
    const freeRows = ex.operator === '-' ? 2 : 1;
    const firstOperandRow = 1 + freeRows;
    const lastOperandRow = firstOperandRow + numTerms - 1;
    const lineRow = lastOperandRow + 1;
    const answerRow = lineRow + 1;
    const totalRows = answerRow + 1 + extraRows;

    const gridW = gridCols * CELL;
    const gridH = totalRows * CELL;

    // E column grid index (units digit)
    const eGridCol = maxInt;

    return (
        <div style={{ position: 'relative', width: gridW, height: gridH, flexShrink: 0, marginTop: 4 }}>
            <svg width={gridW} height={gridH} style={{ position: 'absolute', top: 0, left: 0 }}>
                {Array.from({ length: totalRows + 1 }, (_, r) => (
                    <line key={`h${r}`} x1={0} y1={r * CELL} x2={gridW} y2={r * CELL} stroke={GRID_COLOR} strokeWidth={0.5} />
                ))}
                {Array.from({ length: gridCols + 1 }, (_, c) => (
                    <line key={`v${c}`} x1={c * CELL} y1={0} x2={c * CELL} y2={gridH} stroke={GRID_COLOR} strokeWidth={0.5} />
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
                        fontSize: CELL * 0.38, fontFamily: 'Azeret Mono, monospace',
                        color: '#888', userSelect: 'none', pointerEvents: 'none',
                    }}>{label}</div>
                );
            })}

            {/* Operator sign */}
            {scaffolding <= 2 && (
                <DC col={0} row={lastOperandRow} char={ex.operator} CELL={CELL} />
            )}

            {/* Level 1: pre-filled operands */}
            {scaffolding <= 1 && ex.operands.map((op, opIdx) => {
                const row = firstOperandRow + opIdx;
                return getDigitCols(op, dp, maxInt)
                    .map((d, i) => <DC key={`op${opIdx}_${i}`} col={toGridCol(d.col)} row={row} char={d.char} CELL={CELL} />);
            })}

            {/* Comma overlay after E col for each operand row (scaffolding=1, decimal) */}
            {scaffolding <= 1 && dp > 0 && Array.from({ length: numTerms }, (_, opIdx) => (
                <CommaEdge key={`cop${opIdx}`} afterGridCol={eGridCol} row={firstOperandRow + opIdx} CELL={CELL} />
            ))}

            {/* Level 1 + solutions: answer */}
            {scaffolding <= 1 && showSolutions &&
                getDigitCols(ex.answer, dp, maxInt)
                    .map((d, i) => <DC key={`ans${i}`} col={toGridCol(d.col)} row={answerRow} char={d.char} CELL={CELL} color={SOL_COLOR} />)
            }
            {scaffolding <= 1 && showSolutions && dp > 0 && (
                <CommaEdge afterGridCol={eGridCol} row={answerRow} CELL={CELL} />
            )}

            {/* Level 1 + solutions: carry row */}
            {scaffolding <= 1 && showSolutions && ex.operator === '+' &&
                computeAddCarries(ex.operands, dp, maxInt)
                    .filter(c => c.col >= 0 && c.col < maxInt + decCols)
                    .map((c, i) => <DC key={`carry${i}`} col={toGridCol(c.col)} row={freeRows} char={String(c.carry)} CELL={CELL} color={SOL_COLOR} small />)
            }
        </div>
    );
}

// ── Multiplication grid ───────────────────────────────────────────────────────

function MultiplicationGrid({ ex, CELL, dp, scaffolding, showSolutions, extraCols, extraRows }: GridProps) {
    const multiplicand = ex.operands[0];
    const multiplier = Math.round(ex.operands[1]);
    const s = Math.pow(10, dp);

    const scaledMultiplicand = Math.round(multiplicand * s);
    const mulDigits = String(multiplier).split('').reverse();
    const partialProducts = mulDigits.map((d, shift) => scaledMultiplicand * Number(d) * Math.pow(10, shift));

    const answerIntLen = intLen(ex.answer);
    const maxPPLen = Math.max(...partialProducts.map(pp => pp === 0 ? 1 : String(Math.round(pp)).length));
    const maxInt = Math.max(answerIntLen, maxPPLen);
    const decCols = dp;  // no dedicated comma column

    const n = mulDigits.length;
    const multiplicandRow = 2;
    const multiplierRow = 3;
    const lineRow1 = 4;
    const ppStartRow = 5;
    const lineRow2 = ppStartRow + n;
    const answerRow = lineRow2 + 1;
    const totalRows = answerRow + 1 + extraRows;

    const gridCols = 1 + maxInt + decCols + extraCols;
    const gridW = gridCols * CELL;
    const gridH = totalRows * CELL;

    const eGridCol = maxInt;

    return (
        <div style={{ position: 'relative', width: gridW, height: gridH, flexShrink: 0, marginTop: 4 }}>
            <svg width={gridW} height={gridH} style={{ position: 'absolute', top: 0, left: 0 }}>
                {Array.from({ length: totalRows + 1 }, (_, r) => (
                    <line key={`h${r}`} x1={0} y1={r * CELL} x2={gridW} y2={r * CELL} stroke={GRID_COLOR} strokeWidth={0.5} />
                ))}
                {Array.from({ length: gridCols + 1 }, (_, c) => (
                    <line key={`v${c}`} x1={c * CELL} y1={0} x2={c * CELL} y2={gridH} stroke={GRID_COLOR} strokeWidth={0.5} />
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
                const label = placeLabel(c, maxInt, dp);
                if (!label) return null;
                return (
                    <div key={`pv${c}`} style={{
                        position: 'absolute', left: c * CELL, top: 0,
                        width: CELL, height: CELL,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: CELL * 0.38, fontFamily: 'Azeret Mono, monospace',
                        color: '#888', userSelect: 'none', pointerEvents: 'none',
                    }}>{label}</div>
                );
            })}

            {/* Operator signs */}
            {scaffolding <= 2 && (
                <>
                    <DC col={0} row={multiplierRow} char="×" CELL={CELL} />
                    <DC col={0} row={ppStartRow + n - 1} char="+" CELL={CELL} />
                </>
            )}

            {/* Level 1: multiplicand */}
            {scaffolding <= 1 &&
                getDigitCols(multiplicand, dp, maxInt)
                    .map((d, i) => <DC key={`mc${i}`} col={toGridCol(d.col)} row={multiplicandRow} char={d.char} CELL={CELL} />)
            }
            {scaffolding <= 1 && dp > 0 && (
                <CommaEdge afterGridCol={eGridCol} row={multiplicandRow} CELL={CELL} />
            )}

            {/* Level 1: multiplier */}
            {scaffolding <= 1 &&
                getDigitCols(multiplier, 0, maxInt)
                    .map((d, i) => <DC key={`ml${i}`} col={toGridCol(d.col)} row={multiplierRow} char={d.char} CELL={CELL} />)
            }

            {/* Level 1: partial products */}
            {scaffolding <= 1 && partialProducts.map((pp, ppIdx) => {
                const row = ppStartRow + (n - 1 - ppIdx);
                return ppDigitCols(pp, maxInt).map((d, i) => (
                    <DC key={`pp${ppIdx}_${i}`} col={toGridCol(d.col)} row={row} char={d.char} CELL={CELL} />
                ));
            })}

            {/* Level 1 + solutions: answer */}
            {scaffolding <= 1 && showSolutions &&
                getDigitCols(ex.answer, dp, maxInt)
                    .map((d, i) => <DC key={`ans${i}`} col={toGridCol(d.col)} row={answerRow} char={d.char} CELL={CELL} color={SOL_COLOR} />)
            }
            {scaffolding <= 1 && showSolutions && dp > 0 && (
                <CommaEdge afterGridCol={eGridCol} row={answerRow} CELL={CELL} />
            )}
        </div>
    );
}

// ── Division grid ─────────────────────────────────────────────────────────────
// Dutch staartdeling: dividend left, divisor top-right (in box), quotient below horizontal line.

function DivisionGrid({ ex, CELL, dp, scaffolding, showSolutions, extraCols, extraRows }: GridProps) {
    const dividend = ex.operands[0];
    const divisor = ex.operands[1];
    const quotient = ex.answer;

    const dividendIntCols = intLen(dividend);
    const divisorCols = intLen(divisor);
    const quotientIntCols = intLen(quotient);

    // Working area always has at least 3 decimal cols so students can work past dp if needed
    const workingDecCols = dp > 0 ? Math.max(dp, 3) : 0;
    const dividendDecStr = dp > 0 ? (dividend.toFixed(dp).split('.')[1] || '') : '';
    const leftCols = dividendIntCols + workingDecCols;
    const rightContentCols = Math.max(divisorCols, quotientIntCols + dp);
    const rightCols = rightContentCols + 1; // +1 right-side padding
    const totalCols = leftCols + rightCols + extraCols;

    const workingRows = leftCols * 2 + 1;
    const totalRows = 1 + workingRows + extraRows;

    const gridW = totalCols * CELL;
    const gridH = totalRows * CELL;

    return (
        <div style={{ position: 'relative', width: gridW, height: gridH, flexShrink: 0, marginTop: 4 }}>
            <svg width={gridW} height={gridH} style={{ position: 'absolute', top: 0, left: 0 }}>
                {Array.from({ length: totalRows + 1 }, (_, r) => (
                    <line key={`h${r}`} x1={0} y1={r * CELL} x2={gridW} y2={r * CELL} stroke={GRID_COLOR} strokeWidth={0.5} />
                ))}
                {Array.from({ length: totalCols + 1 }, (_, c) => (
                    <line key={`v${c}`} x1={c * CELL} y1={0} x2={c * CELL} y2={gridH} stroke={GRID_COLOR} strokeWidth={0.5} />
                ))}
                {scaffolding <= 2 && (
                    <>
                        {/* Vertical separator: left section | right section (full height) */}
                        <line x1={leftCols * CELL} y1={0} x2={leftCols * CELL} y2={gridH} stroke="#222" strokeWidth={2} />
                        {/* Divisor box top (right section only) */}
                        <line x1={leftCols * CELL} y1={0} x2={gridW} y2={0} stroke="#222" strokeWidth={2} />
                        {/* Divisor box bottom = quotient separator */}
                        <line x1={leftCols * CELL} y1={CELL} x2={gridW} y2={CELL} stroke="#222" strokeWidth={2} />
                    </>
                )}
            </svg>

            {/* Dividend integer digits (left, row 0) */}
            {scaffolding <= 1 && getDigitCols(dividend, 0, dividendIntCols).map((d, i) => (
                <DC key={`dv${i}`} col={d.col} row={0} char={d.char} CELL={CELL} />
            ))}
            {/* Decimal digits of dividend (actual digits if dividend is decimal, else "0") */}
            {scaffolding <= 1 && workingDecCols > 0 && Array.from({ length: dp }, (_, i) => (
                <DC key={`dvd${i}`} col={dividendIntCols + i} row={0} char={dividendDecStr[i] || '0'} CELL={CELL} />
            ))}
            {/* Comma after dividend units column */}
            {scaffolding <= 1 && workingDecCols > 0 && (
                <CommaEdge afterGridCol={dividendIntCols - 1} row={0} CELL={CELL} />
            )}

            {/* Divisor digits (right section, row 0) */}
            {scaffolding <= 1 && getDigitCols(divisor, 0, divisorCols).map((d, i) => (
                <DC key={`dr${i}`} col={leftCols + d.col} row={0} char={d.char} CELL={CELL} />
            ))}

            {/* Quotient digits (right section, row 1 — below horizontal line) */}
            {scaffolding <= 1 && showSolutions && (
                getDigitCols(quotient, dp, quotientIntCols)
                    .map((d, i) => <DC key={`qt${i}`} col={leftCols + d.col} row={1} char={d.char} CELL={CELL} color={SOL_COLOR} />)
            )}
            {scaffolding <= 1 && showSolutions && dp > 0 && (
                <CommaEdge afterGridCol={leftCols + quotientIntCols - 1} row={1} CELL={CELL} />
            )}
        </div>
    );
}

// ── Exercise box ──────────────────────────────────────────────────────────────

interface ExProps { ex: CijferExercise; c: CijferConstraints; showSolutions: boolean; blockId: string; }

function CijferExercisePreview({ ex, c, showSolutions, blockId }: ExProps) {
    const updateCijferExercise = useWorksheetStore((s) => s.updateCijferExercise);
    const [editing, setEditing] = useState(false);
    const [editValues, setEditValues] = useState<string[]>([]);

    const CELL = c.gridCellSize || 25;
    const dp = c.numberType === 'decimal' ? (c.decimalPlaces || 2) : 0;
    const scaffolding = c.scaffolding || 3;
    const isDivision = ex.operator === ':';
    const isMultiplication = ex.operator === 'x';
    const extraCols = c.extraCols || 0;
    const extraRows = c.extraRows || 0;

    const opStr = ex.operator === 'x' ? '×' : ex.operator;
    const headerText = ex.operands.map((o, i) => fmtDisplay(o, (isDivision && i === 1) ? 0 : (isMultiplication && i > 0) ? 0 : dp)).join(` ${opStr} `) + ' =';

    const confirmEdit = () => {
        const operands = editValues.map(v => parseFloat(v.replace(',', '.')));
        if (operands.some(isNaN) || operands.some(v => v < 0)) { setEditing(false); return; }
        let answer: number;
        let remainder = 0;
        if (ex.operator === '+') answer = parseFloat(operands.reduce((a, b) => a + b, 0).toFixed(dp));
        else if (ex.operator === '-') answer = parseFloat((operands[0] - operands[1]).toFixed(dp));
        else if (ex.operator === 'x') answer = parseFloat((operands[0] * operands[1]).toFixed(dp));
        else { answer = Math.floor(operands[0] / operands[1]); remainder = operands[0] % operands[1]; }
        updateCijferExercise(blockId, ex.id, { operands, answer, remainder, isManuallyEdited: true });
        setEditing(false);
    };

    return (
        <div style={{ marginBottom: 6, display: 'inline-flex', flexDirection: 'column' }}>
            {editing ? (
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
                    style={{ border: '0.5px solid #aaa', padding: '4px 8px', textAlign: 'center', fontSize: 11, fontFamily: 'Azeret Mono, monospace', backgroundColor: '#fff', cursor: 'pointer', userSelect: 'none' }}
                >
                    {headerText}
                </div>
            )}
            {c.withEstimation && (
                <div style={{ backgroundColor: '#e8e8e8', border: '0.5px solid #aaa', borderTop: 'none', padding: '3px 8px', fontSize: 9, color: '#555', fontFamily: 'Azeret Mono, monospace' }}>
                    {showSolutions ? `≈  ${computeEstimation(ex)}` : '≈  ....................................................................'}
                </div>
            )}
            {isDivision
                ? <DivisionGrid ex={ex} CELL={CELL} dp={dp} scaffolding={scaffolding} showSolutions={showSolutions} extraCols={extraCols} extraRows={extraRows} />
                : isMultiplication
                ? <MultiplicationGrid ex={ex} CELL={CELL} dp={dp} scaffolding={scaffolding} showSolutions={showSolutions} extraCols={extraCols} extraRows={extraRows} />
                : <AddSubGrid ex={ex} CELL={CELL} dp={dp} scaffolding={scaffolding} showSolutions={showSolutions} extraCols={extraCols} extraRows={extraRows} />
            }
            {isDivision && (c.showQR !== false) && (
                <div style={{ border: '0.5px solid #aaa', backgroundColor: '#e8e8e8', padding: '4px 8px', marginTop: 8, fontFamily: 'Azeret Mono, monospace', fontSize: 10, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {showSolutions ? (
                        <>
                            <span>q  {fmtDisplay(ex.answer, dp)}</span>
                            <span>r  {ex.remainder > 0 ? fmtDisplay(ex.remainder, dp) : '0'}</span>
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
    const c = block.constraints as CijferConstraints;
    const exercises = (block.cijferExercises || []) as CijferExercise[];

    if (exercises.length === 0) {
        return <div style={{ padding: '8px 0', fontStyle: 'italic', color: '#999', fontSize: '14px' }}>(Genereer oefeningen via het rechterpaneel)</div>;
    }

    const exPerRow = computeExPerRow(c);

    const groups: CijferExercise[][] = [];
    exercises.forEach((ex, i) => {
        if (i % exPerRow === 0) groups.push([ex]);
        else groups[groups.length - 1].push(ex);
    });

    if (exPerRow === 1) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
                {exercises.map(ex => <CijferExercisePreview key={ex.id} ex={ex} c={c} showSolutions={showSolutions} blockId={block.id} />)}
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {groups.map((group, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start' }}>
                    {group.map(ex => <CijferExercisePreview key={ex.id} ex={ex} c={c} showSolutions={showSolutions} blockId={block.id} />)}
                </div>
            ))}
        </div>
    );
}
