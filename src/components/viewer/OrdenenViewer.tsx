import { useState } from 'react';
import type { MathBlock, Fraction } from '../../services/math/types';
import { useWorksheetStore } from '../../store/useWorksheetStore';
import FragmentableGrid from './FragmentableGrid';
import VerticalFraction from './VerticalFraction';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

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
                style={{ width: '70px', fontFamily: mono, fontSize: '17px', fontWeight: 'normal', border: '1px solid var(--accent-purple, #ac29e9)', borderRadius: '4px', padding: '1px 4px' }}
            />
        );
    }
    return (
        <span onClick={() => { setText(toText(value)); setEditing(true); }} style={{ cursor: 'text' }} title="Klik om aan te passen">
            {renderVal(value)}
        </span>
    );
}

export default function OrdenenViewer({ block, showSolutions }: Props) {
    const exercises = block.ordenenExercises || [];
    const patchExercise = useWorksheetStore((s) => s.patchExercise);
    const gap = block.verticalSpacing || 14;

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Nog geen oefeningen — klik Genereer)</div>;
    }

    const editAt = (exId: string, display: (number | Fraction)[], operator: '<' | '>', i: number, v: number | Fraction) => {
        const nextDisplay = display.map((d, idx) => idx === i ? v : d);
        const nextValues = [...nextDisplay].sort((a, b) => operator === '<' ? valOf(a) - valOf(b) : valOf(b) - valOf(a));
        patchExercise(block.id, 'ordenenExercises', exId, { display: nextDisplay, values: nextValues, isManuallyEdited: true });
    };

    // Short series (default 3 numbers) only fill ~40% of the width one-up; place them
    // two-up so the right half isn't dead. Longer series stay full width (they wrap).
    const maxLen = Math.max(...exercises.map((e) => e.display.length));
    const ordCols = maxLen <= 4 ? 2 : 1;

    return (
        <FragmentableGrid
            cols={ordCols}
            columnGap={28}
            rowGap={gap + 6}
            items={exercises.map((ex) => (
                <div key={ex.id} className="print-exercise" style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontFamily: mono, fontSize: '17px' }}>
                    {/* shuffled prompt numbers (click to edit) */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', flexWrap: 'wrap', fontWeight: 'normal' }}>
                        {ex.display.map((v, i) => (
                            <span key={i} style={{ display: 'inline-flex', alignItems: 'flex-end', gap: '4px' }}>
                                {i > 0 && <span>,</span>}
                                <EditableValue value={v} onCommit={(nv) => editAt(ex.id, ex.display, ex.operator, i, nv)} />
                            </span>
                        ))}
                    </div>
                    {/* ordered blanks */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
                        {ex.values.map((v, i) => (
                            <span key={i} style={{ display: 'inline-flex', alignItems: 'flex-end', gap: '10px' }}>
                                {i > 0 && <span style={{ fontWeight: 'normal' }}>{ex.operator}</span>}
                                {showSolutions
                                    ? renderVal(v, '#e11d48')
                                    : <span style={{ borderBottom: '1.5px solid #000', minWidth: '64px', height: '18px', display: 'inline-block' }} />}
                            </span>
                        ))}
                    </div>
                </div>
            ))}
        />
    );
}
