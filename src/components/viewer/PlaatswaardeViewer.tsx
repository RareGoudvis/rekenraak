import React from 'react';
import type { MathBlock, PlaatswaardeExercise } from '../../services/math/types';
import { getMaskPlaces, digitAtPlace } from '../../services/math/mathEngine';
import { formatMathNumber } from '../../services/math/formatters';
import FragmentableGrid from './FragmentableGrid';
import { fitCols, useBlockWidth, ANSWER_LINE_H } from './BlockWidthContext';
import type { PlaatswaardeConstraints } from '../../services/math/constraintTypes';
import { SOL, solutionText } from './solutionStyle';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

// Printed digit/mono sizes below are factors of --sheet-size-math (empty-state chrome
// stays fixed px).
const mono = "'Azeret Mono', monospace";
const SALMON = '#f4cbb8';

// Digits of `n` from its highest non-zero place down to the smallest place (E, or 10^-dp).
function placesOf(n: number, maxGetal: number, decimalPlaces: number) {
    const all = getMaskPlaces(maxGetal, decimalPlaces > 0 ? 'decimal' : 'natural', decimalPlaces);   // descending
    const startIdx = all.findIndex(p => digitAtPlace(n, p.weight) !== 0);
    const slice = startIdx < 0 ? all.slice(-1) : all.slice(startIdx);
    return slice.map(p => ({ key: p.key, label: p.label, weight: p.weight, digit: digitAtPlace(n, p.weight) }));
}

export default function PlaatswaardeViewer({ block, showSolutions }: Props) {
    const availableWidth = useBlockWidth();
    // Below 200px (a quarter-width cell is 163px) the fixed 120px number column, the 16px
    // gaps and the 40px table cells together are wider than the cell. Everything that was
    // sized for alignment across a wide row tightens to what the digits actually need.
    const tight = availableWidth < 200;
    const exercises: PlaatswaardeExercise[] = block.plaatswaardeExercises || [];
    const c = block.constraints as PlaatswaardeConstraints;
    const subType: string = c.subType ?? 'waarde';
    const maxGetal: number = c.maxGetal ?? 1000;
    const decimalPlaces: number = c.decimalPlaces ?? 0;
    const gap = block.verticalSpacing || 14;

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Nog geen oefeningen — klik Genereer)</div>;
    }

    const blank = (w = 80) => <span style={{ borderBottom: '1.5px solid #000', minWidth: `${w}px`, height: ANSWER_LINE_H, display: 'inline-block', verticalAlign: 'bottom' }} />;
    const sol = (t: string) => <span style={{ ...solutionText }}>{t}</span>;

    // Places of an EXERCISE come from its own number, not from the block's current settings:
    // an exercise generated at 3 decimals must still render after the teacher drops to 0,
    // or its placeKey is missing and the sheet crashes (until Genereer replaces it).
    const placesFor = (ex: PlaatswaardeExercise) => {
        const ownDecimals = (String(ex.number).split('.')[1] ?? '').length;
        return placesOf(ex.number, Math.max(maxGetal, ex.number), Math.max(decimalPlaces, ownDecimals));
    };

    // Render the number with the targeted digit underlined (comma before the first decimal place).
    const numberWithUnderline = (ex: PlaatswaardeExercise) => {
        const places = placesFor(ex);
        return (
            <span style={{ fontFamily: mono, fontSize: 'calc(var(--sheet-size-math) * 1.04)', letterSpacing: '1px' }}>
                {places.map((p, i) => {
                    const comma = p.weight < 1 && (i === 0 || places[i - 1].weight >= 1);
                    return (
                        <React.Fragment key={p.key}>
                            {comma && <span>,</span>}
                            <span style={p.key === ex.placeKey ? { borderBottom: '2px solid #000', padding: '0 1px' } : undefined}>{p.digit}</span>
                        </React.Fragment>
                    );
                })}
            </span>
        );
    };

    // ── TABEL: number + place-value columns to fill ───────────────────────────
    if (subType === 'tabel') {
        const cell: React.CSSProperties = {
            border: '1px solid #000', width: tight ? '24px' : '40px', height: tight ? '28px' : '34px', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontFamily: mono, fontSize: tight ? 'calc(var(--sheet-size-math) * 0.75)' : 'calc(var(--sheet-size-math) * 0.92)', boxSizing: 'border-box',
        };
        // Two-up when a row is narrow enough (default maxGetal 1000 = 4 places ≈ 266px),
        // so small place-value tables don't waste the right half of the page.
        const placeCount = placesOf(maxGetal, maxGetal, decimalPlaces).length;
        const rowW = 90 + 16 + placeCount * 40;
        const tabCols = !tight && rowW * 2 + 24 <= availableWidth ? 2 : 1;
        return (
            <FragmentableGrid
                cols={tabCols}
                columnGap={24}
                rowGap={gap + 4}
                items={exercises.map(ex => {
                    const places = placesOf(ex.number, maxGetal, decimalPlaces);
                    return (
                        <div key={ex.id} className="print-exercise" style={{ display: 'flex', alignItems: 'center', gap: tight ? '6px' : '16px' }}>
                            <span style={{ fontFamily: mono, fontSize: tight ? 'calc(var(--sheet-size-math) * 0.87)' : 'calc(var(--sheet-size-math) * 1.04)', minWidth: tight ? undefined : '90px', whiteSpace: 'nowrap' }}>{formatMathNumber(ex.number)}</span>
                            <div>
                                <div style={{ display: 'flex' }}>
                                    {places.map(p => <div key={p.key} style={{ ...cell, backgroundColor: SALMON, fontWeight: 'bold', fontSize: 'calc(var(--sheet-size-math) * 0.75)' }}>{p.key}</div>)}
                                </div>
                                <div style={{ display: 'flex' }}>
                                    {places.map(p => <div key={p.key} style={{ ...cell, ...solutionText }}>{showSolutions ? p.digit : ''}</div>)}
                                </div>
                            </div>
                        </div>
                    );
                })}
            />
        );
    }

    // ── OMCIRKELEN: circle the digit at the marked place ───────────────────────
    // Reuses the 'plaats' generator path (same number + placeKey shape); the marked
    // place is shown as a row of chips (one per digit, in the same descending E/T/H/...
    // order placesFor already uses) instead of an underline, and the pupil circles it.
    if (subType === 'omcirkelen') {
        // The number keeps its underlined digit (same as 'plaats'); the answer is not written but
        // circled among the place letters, which are printed in the number's own place order.
        // Fixed-width right-aligned number column (widest number's digit + comma count in the
        // block) so every "→" lands at the same x, matching the waarde/plaats section below.
        const numChars = Math.max(1, ...exercises.map(ex => {
            const places = placesFor(ex);
            return places.length + (places.some(p => p.weight < 1) ? 1 : 0);
        }));
        // `ch` is the advance of "0" in THIS element's own font, so a mono column of
        // numChars digits is exactly numChars ch — no 0.62em guess that under-measures the
        // glyph and lets the longest number push its own arrow out of the column (9 vs 10,
        // 34 vs 6,20: the short numbers sat at the reserved width and the long ones a few px
        // past it, so the arrows stepped instead of lining up). The two constants are the
        // markup's own: 1px of letter-spacing after every glyph, and the 0 1px padding the
        // underlined digit always carries.
        const numColWidth = tight ? undefined : `calc(${numChars}ch + ${numChars + 2}px)`;
        return (
            <FragmentableGrid
                cols={fitCols(availableWidth, 260, 2)}
                columnGap={24}
                rowGap={gap}
                items={exercises.map(ex => {
                    const places = placesFor(ex);
                    return (
                        <div key={ex.id} className="print-exercise" style={{ display: 'flex', alignItems: 'center', gap: tight ? '8px' : '14px', flexWrap: 'nowrap', fontFamily: mono, fontSize: 'calc(var(--sheet-size-math) * 1.04)' }}>
                            <span style={{ display: 'inline-block', minWidth: numColWidth, textAlign: 'right', whiteSpace: 'nowrap', flexShrink: 0 }}>{numberWithUnderline(ex)}</span>
                            <span>→</span>
                            <span style={{ display: 'inline-flex', gap: tight ? '2px' : '6px' }}>
                                {places.map(p => {
                                    const isAns = showSolutions && p.key === ex.placeKey;
                                    return (
                                        <span key={p.key} style={{
                                            padding: '2px 8px',
                                            border: isAns ? `2px solid ${SOL}` : '2px solid transparent',
                                            borderRadius: '50%',
                                            color: isAns ? SOL : 'inherit',
                                            fontWeight: isAns ? 'bold' : undefined,
                                        }}>
                                            {p.key}
                                        </span>
                                    );
                                })}
                            </span>
                        </div>
                    );
                })}
            />
        );
    }

    // ── WAARDE / PLAATS: underline a digit, write its value or its place name ──
    return (
        <FragmentableGrid
            cols={fitCols(availableWidth, 260, 2)}
            columnGap={24}
            rowGap={gap}
            items={exercises.map(ex => {
                const place = placesFor(ex).find(p => p.key === ex.placeKey);
                // A stale exercise keeps its number and an empty line rather than taking the sheet down.
                const value = place ? Number((place.digit * place.weight).toFixed(4)) : 0;
                const answer = !place ? '' : subType === 'plaats' ? place.label.toLowerCase() : formatMathNumber(value);
                return (
                    <div key={ex.id} className="print-exercise" style={{ display: 'flex', alignItems: 'flex-end', gap: tight ? '4px' : '8px', fontFamily: mono, fontSize: 'calc(var(--sheet-size-math) * 0.92)', ...(tight && { flexWrap: 'wrap' }) }}>
                        {/* Fixed-width right-aligned so the arrow + answer line align across rows.
                            Tight cells drop the reserved column — the digits are what has to fit. */}
                        <span style={{ display: 'inline-block', minWidth: tight ? undefined : '120px', textAlign: 'right', whiteSpace: 'nowrap', flexShrink: 0 }}>{numberWithUnderline(ex)}</span>
                        <span style={{ alignSelf: 'center' }}>→</span>
                        {showSolutions ? sol(answer) : blank(tight ? (subType === 'plaats' ? 70 : 45) : (subType === 'plaats' ? 110 : 70))}
                    </div>
                );
            })}
        />
    );
}
