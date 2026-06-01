import React from 'react';
import type { MathBlock, PlaatswaardeExercise } from '../../services/math/types';
import { getMaskPlaces, digitAtPlace } from '../../services/math/mathEngine';
import { formatMathNumber } from '../../services/math/formatters';
import FragmentableGrid from './FragmentableGrid';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

const mono = "'Azeret Mono', monospace";
const SOL = '#e11d48';
const SALMON = '#f4cbb8';

// Digits of `n` from its highest non-zero place down to the smallest place (E, or 10^-dp).
function placesOf(n: number, maxGetal: number, decimalPlaces: number) {
    const all = getMaskPlaces(maxGetal, decimalPlaces > 0 ? 'decimal' : 'natural', decimalPlaces);   // descending
    const startIdx = all.findIndex(p => digitAtPlace(n, p.weight) !== 0);
    const slice = startIdx < 0 ? all.slice(-1) : all.slice(startIdx);
    return slice.map(p => ({ key: p.key, label: p.label, weight: p.weight, digit: digitAtPlace(n, p.weight) }));
}

export default function PlaatswaardeViewer({ block, showSolutions }: Props) {
    const exercises: PlaatswaardeExercise[] = block.plaatswaardeExercises || [];
    const subType: string = block.constraints.subType ?? 'waarde';
    const maxGetal: number = block.constraints.maxGetal ?? 1000;
    const decimalPlaces: number = block.constraints.decimalPlaces ?? 0;
    const gap = block.verticalSpacing || 14;

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Genereer oefeningen via het rechterpaneel)</div>;
    }

    const blank = (w = 80) => <span style={{ borderBottom: '1.5px solid #000', minWidth: `${w}px`, height: '18px', display: 'inline-block', verticalAlign: 'bottom' }} />;
    const sol = (t: string) => <span style={{ color: SOL }}>{t}</span>;

    // Render the number with the targeted digit underlined (comma before the first decimal place).
    const numberWithUnderline = (ex: PlaatswaardeExercise) => {
        const places = placesOf(ex.number, maxGetal, decimalPlaces);
        return (
            <span style={{ fontFamily: mono, fontSize: '18px', letterSpacing: '1px' }}>
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
            border: '1px solid #000', width: '40px', height: '34px', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontFamily: mono, fontSize: '16px', boxSizing: 'border-box',
        };
        return (
            <FragmentableGrid
                cols={1}
                rowGap={gap + 4}
                items={exercises.map(ex => {
                    const places = placesOf(ex.number, maxGetal, decimalPlaces);
                    return (
                        <div key={ex.id} className="print-exercise" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <span style={{ fontFamily: mono, fontSize: '18px', minWidth: '90px' }}>{formatMathNumber(ex.number)}</span>
                            <div>
                                <div style={{ display: 'flex' }}>
                                    {places.map(p => <div key={p.key} style={{ ...cell, backgroundColor: SALMON, fontWeight: 'bold', fontSize: '13px' }}>{p.key}</div>)}
                                </div>
                                <div style={{ display: 'flex' }}>
                                    {places.map(p => <div key={p.key} style={{ ...cell, color: SOL }}>{showSolutions ? p.digit : ''}</div>)}
                                </div>
                            </div>
                        </div>
                    );
                })}
            />
        );
    }

    // ── WAARDE / PLAATS: underline a digit, write its value or its place name ──
    return (
        <FragmentableGrid
            cols={2}
            columnGap={24}
            rowGap={gap}
            items={exercises.map(ex => {
                const place = placesOf(ex.number, maxGetal, decimalPlaces).find(p => p.key === ex.placeKey)!;
                const value = Number((place.digit * place.weight).toFixed(4));
                const answer = subType === 'plaats' ? place.label.toLowerCase() : formatMathNumber(value);
                return (
                    <div key={ex.id} className="print-exercise" style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', fontFamily: mono, fontSize: '16px' }}>
                        {numberWithUnderline(ex)}
                        <span style={{ alignSelf: 'center' }}>→</span>
                        {showSolutions ? sol(answer) : blank(subType === 'plaats' ? 110 : 70)}
                    </div>
                );
            })}
        />
    );
}
