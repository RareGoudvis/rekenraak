import { useState } from 'react';
import type { MathBlock, HerleidingExercise, HerleidingPart } from '../../services/math/types';
import { formatMathNumber } from '../../services/math/formatters';
import { ladderFor, recomputeHerleiding } from '../../services/herleidingen/herleidingenGenerator';
import { useWorksheetStore } from '../../store/useWorksheetStore';
import FragmentableGrid from './FragmentableGrid';

interface Props { block: MathBlock; showSolutions: boolean; }

const mono = "'Azeret Mono', monospace";
const SOL = '#e11d48';
const SALMON = '#f4cbb8';

const numLine = () => <span style={{ borderBottom: '1.5px solid #000', minWidth: '60px', height: '16px', display: 'inline-block' }} />;
const unitLine = () => <span style={{ borderBottom: '1.5px solid #000', minWidth: '34px', height: '16px', display: 'inline-block' }} />;

// Click a given number → inline input; click a given unit → dropdown of valid ladder units.
function EditableNumber({ value, onCommit }: { value: number; onCommit: (v: number) => void }) {
    const [editing, setEditing] = useState(false);
    const [text, setText] = useState('');
    if (editing) {
        return (
            <input autoFocus value={text}
                onClick={e => e.stopPropagation()}
                onChange={e => setText(e.target.value)}
                onBlur={() => { const n = Number(text.replace(',', '.')); if (!isNaN(n)) onCommit(n); setEditing(false); }}
                onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditing(false); }}
                style={{ width: '70px', fontFamily: mono, fontSize: '16px', border: '1px solid var(--accent)', borderRadius: '4px', padding: '0 4px' }} />
        );
    }
    return <span onClick={e => { e.stopPropagation(); setText(String(value)); setEditing(true); }} style={{ cursor: 'text' }} title="Klik om aan te passen">{formatMathNumber(value)}</span>;
}

function EditableUnit({ value, measure, onCommit }: { value: string; measure: string; onCommit: (v: string) => void }) {
    const [editing, setEditing] = useState(false);
    if (editing) {
        return (
            <select autoFocus defaultValue={value}
                onClick={e => e.stopPropagation()}
                onChange={e => { onCommit(e.target.value); setEditing(false); }}
                onBlur={() => setEditing(false)}
                style={{ fontFamily: mono, fontSize: '15px', border: '1px solid var(--accent)', borderRadius: '4px' }}>
                {ladderFor(measure).map(u => <option key={u.key} value={u.key}>{u.key}</option>)}
            </select>
        );
    }
    return <span onClick={e => { e.stopPropagation(); setEditing(true); }} style={{ cursor: 'pointer' }} title="Klik om de eenheid te kiezen">{value}</span>;
}

export default function HerleidingenViewer({ block, showSolutions }: Props) {
    const patchExercise = useWorksheetStore(s => s.patchExercise);
    const exercises: HerleidingExercise[] = block.herleidingExercises || [];
    const measure: string = block.constraints.measure ?? 'lengte';
    const scaffolding: string = block.constraints.scaffolding ?? 'geen';
    const writeUnits: boolean = !!block.constraints.writeUnits;
    // 'uitlijnen' = given always left, right-aligned to a shared '=' column;
    // 'compact' = the single-part side goes left so the long compound always sits right.
    const layout: string = block.constraints.herleidingLayout ?? 'uitlijnen';
    const gap = block.verticalSpacing || 14;

    if (exercises.length === 0) {
        return <div className="no-print" style={{ padding: '8px 0', fontStyle: 'italic', color: '#999', fontSize: '14px' }}>(Genereer oefeningen via het rechterpaneel)</div>;
    }

    // Recompute the answer and persist after any teacher edit to a shown field.
    const commit = (ex: HerleidingExercise, edited: HerleidingExercise) => {
        const re = recomputeHerleiding(measure, edited);
        patchExercise(block.id, 'herleidingExercises', ex.id, { fromParts: re.fromParts, toParts: re.toParts, isManuallyEdited: true });
    };
    const editFrom = (ex: HerleidingExercise, i: number, patch: Partial<HerleidingPart>) =>
        commit(ex, { ...ex, fromParts: ex.fromParts.map((p, idx) => idx === i ? { ...p, ...patch } : p) });
    const editTo = (ex: HerleidingExercise, i: number, patch: Partial<HerleidingPart>) =>
        commit(ex, { ...ex, toParts: ex.toParts.map((p, idx) => idx === i ? { ...p, ...patch } : p) });

    const renderFrom = (ex: HerleidingExercise) => ex.fromParts.map((p, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'baseline', gap: '4px', marginLeft: i > 0 ? '8px' : 0 }}>
            <EditableNumber value={p.value} onCommit={v => editFrom(ex, i, { value: v })} />
            <EditableUnit value={p.key} measure={measure} onCommit={k => editFrom(ex, i, { key: k })} />
        </span>
    ));

    const renderTo = (ex: HerleidingExercise) => ex.toParts.map((p, i) => {
        const numBlank = ex.blank === 'number';
        const unitBlank = ex.blank === 'unit' || (writeUnits && ex.blank === 'number');
        return (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'baseline', gap: '5px' }}>
                {numBlank
                    ? (showSolutions ? <span style={{ color: SOL }}>{formatMathNumber(p.value)}</span> : numLine())
                    : <EditableNumber value={p.value} onCommit={v => editTo(ex, i, { value: v })} />}
                {unitBlank
                    ? (showSolutions ? <span style={{ color: SOL }}>{p.key}</span> : unitLine())
                    : <EditableUnit value={p.key} measure={measure} onCommit={k => editTo(ex, i, { key: k })} />}
            </span>
        );
    });

    // Auto single-column when exercises get wide (long compounds / big numbers) so they don't
    // overflow into the block controls.
    const sideLen = (ps: HerleidingPart[]) => ps.map(p => `${formatMathNumber(p.value)} ${p.key}`).join('  ').length;
    const cols = Math.max(...exercises.map(ex => sideLen(ex.fromParts) + 3 + sideLen(ex.toParts))) > 38 ? 1 : 2;

    // Width estimates: a SHOWN side ≈ 9.5px/char (Azeret Mono @16px); a BLANK side renders
    // as fixed lines (numLine 60 + unitLine 34 + gaps ≈ 100px/part) regardless of its value.
    const givenPx = (ps: HerleidingPart[]) => sideLen(ps) * 9.5;
    const blankPx = (ps: HerleidingPart[]) => ps.length * 100;
    // In 'compact' the single-part (shorter) side anchors the left; in 'uitlijnen' the given
    // is always left. The long compound therefore always lands on the (wrapping) right side.
    const leftIsFrom = (ex: HerleidingExercise) => layout === 'uitlijnen' || ex.fromParts.length <= ex.toParts.length;
    const leftPx = (ex: HerleidingExercise) => leftIsFrom(ex) ? givenPx(ex.fromParts) : blankPx(ex.toParts);
    // Left box sized to the widest left side so every '=' column stays aligned.
    const leftW = Math.max(150, Math.round(Math.max(...exercises.map(leftPx))) + 12);

    const exerciseGrid = (
        <FragmentableGrid
            cols={cols}
            columnGap={28}
            rowGap={gap + 2}
            items={exercises.map(ex => {
                const lf = leftIsFrom(ex);
                return (
                    <div key={ex.id} className="print-exercise" style={{ display: 'flex', alignItems: 'baseline', gap: '8px', fontFamily: mono, fontSize: '16px' }}>
                        <span style={{ display: 'inline-block', width: `${leftW}px`, textAlign: 'right', whiteSpace: 'nowrap', flexShrink: 0 }}>{lf ? renderFrom(ex) : renderTo(ex)}</span>
                        <span style={{ flexShrink: 0 }}>=</span>
                        {/* Wrap the long side onto a second row instead of overflowing the page. */}
                        <span style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', columnGap: '10px', rowGap: '6px', minWidth: 0 }}>{lf ? renderTo(ex) : renderFrom(ex)}</span>
                    </div>
                );
            })}
        />
    );

    // Conversion-table scaffold ABOVE the exercises — centered, one row per exercise, with an
    // optional left prompt column and an optional right "= ___" answer column.
    let table = null;
    if (scaffolding === 'tabel-headers' || scaffolding === 'tabel-blanco') {
        const c = block.constraints;
        const tablePrompt: boolean = !!c.tablePrompt;
        const tableAnswer: string = c.tableAnswer ?? 'blank';
        const cw: number = c.tableCellW ?? 60;
        const ch: number = c.tableCellH ?? 30;
        const showHeaders = scaffolding === 'tabel-headers';
        const unitCell: React.CSSProperties = { border: '1px solid #000', width: `${cw}px`, height: `${ch}px`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: mono, fontSize: '13px' };

        // Oppervlakte steps ×100 → each ²-unit holds 2 digits, so 2 (half-width) cells per column.
        const cellsPerUnit = measure === 'oppervlakte' ? 2 : 1;
        const subW = Math.max(16, Math.floor(cw / cellsPerUnit));
        // Header width = the column's REAL width: sub-cells minus the (cellsPerUnit-1) collapsed
        // 1px inner borders, else the header overhangs the body cumulatively (right-edge drift).
        const colW = subW * cellsPerUnit - (cellsPerUnit - 1);
        // One column per distinct factor (descending). Equal-factor aliases share a column,
        // are-unit (ha/a/ca) stacked on top of its square (hm²/dam²/m²).
        const ARE = new Set(['ha', 'a', 'ca']);
        const enabled = ladderFor(measure).filter(u => (c.units ?? []).includes(u.key));
        const byFactor = new Map<number, string[]>();
        for (const u of enabled) { const arr = byFactor.get(u.factor) ?? []; arr.push(u.key); byFactor.set(u.factor, arr); }
        const cols = [...byFactor.entries()]
            .sort((x, y) => y[0] - x[0])
            .map(([, keys]) => keys.sort((a, b) => Number(ARE.has(b)) - Number(ARE.has(a))));
        const headCell: React.CSSProperties = { border: '1px solid #000', width: `${colW}px`, minHeight: `${ch}px`, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: mono, fontSize: '13px', fontWeight: 'bold', lineHeight: 1.1, backgroundColor: SALMON, padding: '2px 0' };
        const sideCell: React.CSSProperties = { height: `${ch}px`, display: 'flex', alignItems: 'center', fontFamily: mono, fontSize: '14px', whiteSpace: 'nowrap' };

        const promptStr = (ex: HerleidingExercise) => ex.fromParts.map(p => `${formatMathNumber(p.value)} ${p.key}`).join('  ');
        // Fixed prompt-column width (≈8.4px/char at 14px Azeret Mono) so every row's unit
        // cells start at the same x — without it the variable-width prompt staircases them.
        const promptW = Math.round(Math.max(0, ...exercises.map(ex => promptStr(ex).length)) * 8.4) + 8;
        const ansEl = (ex: HerleidingExercise) => {
            if (tableAnswer === 'blank') return <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '5px' }}>= <span style={{ borderBottom: '1.5px solid #000', width: '90px', display: 'inline-block', height: '15px' }} /></span>;
            // Shrink the blank lines when the answer has many parts (volledig) so the row fits.
            const many = ex.toParts.length >= 3;
            const line = (w: number) => <span style={{ borderBottom: '1.5px solid #000', width: `${w}px`, height: '15px', display: 'inline-block' }} />;
            return <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: many ? '4px' : '6px' }}>= {ex.toParts.map((p, i) => (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'baseline', gap: many ? '3px' : '4px' }}>
                    {ex.blank === 'number' ? line(many ? 30 : 56) : <span>{formatMathNumber(p.value)}</span>}
                    {ex.blank === 'unit' ? line(many ? 22 : 30) : <span>{p.key}</span>}
                </span>
            ))}</span>;
        };

        table = (
            <div style={{ margin: '0 auto', width: 'fit-content', marginBottom: `${gap + 6}px` }}>
                <div className="print-row" style={{ display: 'flex', alignItems: 'stretch' }}>
                    {tablePrompt && <div style={{ ...sideCell, width: `${promptW}px`, flexShrink: 0, marginRight: '10px' }} />}
                    {cols.map((labels, ci) => <div key={ci} style={headCell}>{showHeaders ? labels.map(l => <span key={l}>{l}</span>) : null}</div>)}
                    {tableAnswer !== 'hidden' && <div style={{ ...sideCell, marginLeft: '10px' }} />}
                </div>
                {exercises.map(ex => (
                    <div key={ex.id} className="print-row" style={{ display: 'flex', alignItems: 'stretch' }}>
                        {tablePrompt && <div style={{ ...sideCell, width: `${promptW}px`, flexShrink: 0, marginRight: '10px', justifyContent: 'flex-end' }}>{promptStr(ex)}</div>}
                        {cols.map((_c, ci) => (
                            <div key={ci} style={{ display: 'flex' }}>
                                {Array.from({ length: cellsPerUnit }).map((_, k) => (
                                    <div key={k} style={{ ...unitCell, width: `${subW}px`, marginLeft: k > 0 ? '-1px' : 0 }} />
                                ))}
                            </div>
                        ))}
                        {tableAnswer !== 'hidden' && <div style={{ ...sideCell, marginLeft: '10px' }}>{ansEl(ex)}</div>}
                    </div>
                ))}
            </div>
        );
    }

    return <div>{table}{exerciseGrid}</div>;
}
