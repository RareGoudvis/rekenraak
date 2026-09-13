import { useState } from 'react';
import type { MathBlock, Fraction } from '../../services/math/types';
import { useWorksheetStore } from '../../store/useWorksheetStore';
import FragmentableGrid from './FragmentableGrid';
import { useBlockWidth, fitCols, ANSWER_LINE_H } from './BlockWidthContext';
import VerticalFraction from './VerticalFraction';
import { SOL, centerWhenSingle } from './solutionStyle';
import { ordenenRowPx } from '../../services/layout/blockLayout';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

// Printed digit/mono sizes below are factors of --sheet-size-math (empty-state chrome
// stays fixed px; VerticalFraction's numeric fontSize prop converts itself internally).
const mono = "'Azeret Mono', monospace";
const isFrac = (v: number | Fraction): v is Fraction => typeof v !== 'number';
const valOf = (v: number | Fraction): number => isFrac(v) ? (v.whole ?? 0) + v.n / v.d : v;

// Plain editable text for a value (number "12.3" or fraction "1 3/4").
const toText = (v: number | Fraction): string =>
    isFrac(v) ? `${v.whole ? v.whole + ' ' : ''}${v.n}/${v.d}` : String(v);

function parseValue(text: string): number | Fraction | null {
    const t = text.trim().replace(',', '.');
    if (!t) return null;
    if (t.includes('/')) {
        const parts = t.split(/\s+/);
        let whole = 0, fracStr = t;
        if (parts.length === 2) { whole = parseInt(parts[0], 10); fracStr = parts[1]; }
        const [nS, dS] = fracStr.split('/');
        const n = parseInt(nS, 10), d = parseInt(dS, 10);
        if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) return null;
        return whole ? { whole, n, d } : { n, d };
    }
    const num = Number(t);
    return Number.isFinite(num) ? num : null;
}

function renderVal(v: number | Fraction, color?: string) {
    if (isFrac(v)) return <VerticalFraction value={v} color={color} fontSize={15} mono />;
    return <span style={{ color, fontWeight: 'normal' }}>{v.toLocaleString('nl-BE')}</span>;
}

// Click a prompt number to edit it; commit re-sorts the answer.
function EditableValue({ value, onCommit }: { value: number | Fraction; onCommit: (v: number | Fraction) => void }) {
    const [editing, setEditing] = useState(false);
    const [text, setText] = useState('');
    if (editing) {
        return (
            <input
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                onBlur={() => { const p = parseValue(text); if (p !== null) onCommit(p); setEditing(false); }}
                onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditing(false); }}
                style={{ width: '70px', fontFamily: mono, fontSize: 'calc(var(--sheet-size-math) * 1)', fontWeight: 'normal', border: '1px solid var(--accent-purple, #ac29e9)', borderRadius: '4px', padding: '1px 4px' }}
            />
        );
    }
    return (
        <span onClick={() => { setText(toText(value)); setEditing(true); }} style={{ cursor: 'text' }} title="Klik om aan te passen">
            {renderVal(value)}
        </span>
    );
}

// Widest printed value in the WHOLE block, in characters — the answer blank/box is one
// consistent size across every exercise rather than a per-value guess (owner rule: never
// a hardcoded 64px, always the widest value's width). Fractions are a stacked num/denom
// pair, so their "width" is the wider of the two (plus the whole number, if mixed).
function charsOf(v: number | Fraction): number {
    if (isFrac(v)) {
        const parts = [String(v.n), String(v.d)];
        return Math.max(...parts.map((s) => s.length)) + (v.whole ? String(v.whole).length + 1 : 0);
    }
    return v.toLocaleString('nl-BE').length;
}

export default function OrdenenViewer({ block, showSolutions }: Props) {
    const exercises = block.ordenenExercises || [];
    const patchExercise = useWorksheetStore((s) => s.patchExercise);
    const gap = block.verticalSpacing || 14;
    const availableWidth = useBlockWidth();
    const c = (block.constraints ?? {}) as Record<string, unknown>;
    const answerStyle = (c.answerStyle as 'lijn' | 'vak' | undefined) ?? 'lijn';

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Nog geen oefeningen — klik Genereer)</div>;
    }

    const editAt = (exId: string, display: (number | Fraction)[], operator: '<' | '>', i: number, v: number | Fraction) => {
        const nextDisplay = display.map((d, idx) => idx === i ? v : d);
        const nextValues = [...nextDisplay].sort((a, b) => operator === '<' ? valOf(a) - valOf(b) : valOf(b) - valOf(a));
        patchExercise(block.id, 'ordenenExercises', exId, { display: nextDisplay, values: nextValues, isManuallyEdited: true });
    };

    // Mirrors blockLayout's `ordenenFloor` (same function, same constants: the 330px half-
    // cell threshold there is exactly `fitCols`'s own arithmetic here) so the width the
    // packer promoted this block to is always wide enough for whatever this resolves to —
    // owner rule: a row never wraps, so there is no narrower fallback to drop into.
    const count = Math.max(...exercises.map((e) => e.display.length));
    const rowPx = ordenenRowPx(block.typeId, c, count);
    const ordCols = fitCols(availableWidth, rowPx, 2, 28);

    // Answer blank/box is one fixed width for the whole block: the widest value actually
    // generated, never a magic 64px that clips a 5-digit answer or strands a 1-digit one.
    const maxChars = Math.max(2, ...exercises.flatMap((e) => e.values.map(charsOf)));
    const blankWidthCh = `${maxChars}ch`;

    return (
        <FragmentableGrid
            cols={ordCols}
            columnGap={28}
            rowGap={gap + 6}
            justifyItems={centerWhenSingle(ordCols)}
            items={exercises.map((ex) => {
                const n = ex.display.length;
                // 2n-1 columns (number, separator, number, …), ONE grid shared by the prompt
                // and answer rows of this exercise, so a blank always sits directly under its
                // number — separators are a narrow fixed track, numbers auto-size to content.
                const gridTemplateColumns = Array(n).fill('max-content').join(' 22px ');
                return (
                    <div key={ex.id} className="print-exercise" style={{
                        display: 'grid', gridTemplateColumns, columnGap: 0, rowGap: '10px',
                        fontFamily: mono, fontSize: 'calc(var(--sheet-size-math) * 1)',
                    }}>
                        {/* shuffled prompt numbers (click to edit) */}
                        {ex.display.map((v, i) => (
                            <div key={`p${i}`} style={{ gridRow: 1, gridColumn: 2 * i + 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', fontWeight: 'normal', whiteSpace: 'nowrap' }}>
                                <EditableValue value={v} onCommit={(nv) => editAt(ex.id, ex.display, ex.operator, i, nv)} />
                                {i < n - 1 && <span>,</span>}
                            </div>
                        ))}
                        {/* ordered blanks/boxes, aligned to the same columns */}
                        {ex.values.map((v, i) => (
                            <div key={`a${i}`} style={{ gridRow: 2, gridColumn: 2 * i + 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', whiteSpace: 'nowrap' }}>
                                {showSolutions
                                    ? renderVal(v, SOL)
                                    : answerStyle === 'vak'
                                        ? <span style={{ border: '1.5px solid #000', borderRadius: '4px', width: blankWidthCh, height: '26px', display: 'inline-block' }} />
                                        : <span style={{ borderBottom: '1.5px solid #000', width: blankWidthCh, height: ANSWER_LINE_H, display: 'inline-block' }} />}
                            </div>
                        ))}
                        {/* operator glyph between consecutive answers, in the separator column */}
                        {ex.values.slice(1).map((_, i) => (
                            <div key={`o${i}`} style={{ gridRow: 2, gridColumn: 2 * i + 2, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', fontWeight: 'normal' }}>
                                {ex.operator}
                            </div>
                        ))}
                    </div>
                );
            })}
        />
    );
}
