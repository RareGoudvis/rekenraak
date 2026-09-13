import type React from 'react';
import type { MathBlock, ControleExercise } from '../../services/math/types';
import { formatMathNumber } from '../../services/math/formatters';
import { negenrest } from '../../services/controleren/controlerenGenerator';
import FragmentableGrid from './FragmentableGrid';
import { OP_GLYPH as GLYPH } from '../../services/math/formatters';
import type { ControlerenConstraints } from '../../services/math/constraintTypes';
import { SOL, solutionText } from './solutionStyle';
import { ANSWER_LINE_H } from './BlockWidthContext';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

const mono = "'Azeret Mono', monospace";
// 13pt (the --sheet-size-math default) is 17.33 CSS px, so a figure sized `px / 17.33` em
// reproduces its old pixels at the default slider and grows with the text from there.
const PX_PER_EM_AT_DEFAULT = 17.33;
const INVERSE: Record<string, string> = { '+': '−', '-': '+' };
// Sizes below are factors of the sheet tokens (--sheet-size-math / --sheet-size-text) so print scales with the docSettings sliders.

// Negenproef-kruis: rests of the factors top/bottom, product-of-rests' rest left,
// rest of the shown answer right. Proef klopt when left equals right.
function NegenproefKruis({ ex, showSolutions }: { ex: ControleExercise; showSolutions: boolean }) {
    const size = 86;
    const rA = negenrest(ex.a);
    const rB = negenrest(ex.b);
    const rProduct = negenrest(rA * rB);
    const rShown = negenrest(ex.shownAnswer);
    // Plain viewBox units, never a token: the <svg> is already sized in em below, so a
    // calc(--sheet-size-math) here would scale the digits a second time.
    const num = (x: number, y: number, val: number) => showSolutions
        ? <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={15} fontFamily={mono} fill={SOL}>{val}</text>
        : null;
    return (
        <svg
            viewBox={`0 0 ${size} ${size}`}
            width={`${size / PX_PER_EM_AT_DEFAULT}em`}
            height={`${size / PX_PER_EM_AT_DEFAULT}em`}
            style={{ flexShrink: 0, fontSize: 'var(--sheet-size-math)' }}
        >
            <line x1={8} y1={8} x2={size - 8} y2={size - 8} stroke="#000" strokeWidth={1.5} />
            <line x1={size - 8} y1={8} x2={8} y2={size - 8} stroke="#000" strokeWidth={1.5} />
            {num(size / 2, 12, rA)}
            {num(size / 2, size - 12, rB)}
            {num(12, size / 2, rProduct)}
            {num(size - 12, size / 2, rShown)}
        </svg>
    );
}

export default function ControlerenViewer({ block, showSolutions }: Props) {
    const exercises: ControleExercise[] = block.controleExercises || [];
    const c = block.constraints as ControlerenConstraints;
    const subType: string = c.subType ?? 'negenproef';
    const showKruis: boolean = c.showKruis ?? true;
    const gap = block.verticalSpacing || 14;

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Nog geen oefeningen — klik Genereer)</div>;
    }

    const juistFout = (ex: ControleExercise) => {
        const correct = ex.shownAnswer === ex.correctAnswer;
        const mark = (label: string, hit: boolean) => (
            <span style={{
                padding: '1px 10px', borderRadius: '10px', fontFamily: mono, fontSize: 'calc(var(--sheet-size-text) * 0.65)',
                border: showSolutions && hit ? `2px solid ${SOL}` : '1px solid #999',
                color: showSolutions && hit ? SOL : undefined,
            }}>{label}</span>
        );
        return <span style={{ display: 'inline-flex', gap: '8px' }}>{mark('juist', correct)}{mark('fout', !correct)}</span>;
    };

    // ── NEGENPROEF: worked × + kruis + juist/fout ──────────────────────────────
    if (subType === 'negenproef') {
        const sumOf = (ex: ControleExercise) =>
            `${formatMathNumber(ex.a)} × ${formatMathNumber(ex.b)} = ${formatMathNumber(ex.shownAnswer)}`;
        // One sum column for the whole block: the widest sum in ch (the text is monospaced,
        // so a character count is an exact width). Without it every kruis sat at its own x
        // and the column of crosses zig-zagged down the page.
        const sumCh = Math.max(...exercises.map(ex => sumOf(ex).length));
        return (
            <FragmentableGrid
                cols={2}
                columnGap={28}
                rowGap={gap + 16}
                alignItems="flex-start"
                items={exercises.map(ex => (
                    <div key={ex.id} className="print-exercise" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                            display: 'flex', flexDirection: 'column', gap: '8px',
                            fontFamily: mono, fontSize: 'calc(var(--sheet-size-math) * 0.92)',
                            minWidth: `${sumCh}ch`, flexShrink: 0,
                        }}>
                            <span>{sumOf(ex)}</span>
                            {juistFout(ex)}
                        </div>
                        {showKruis && <NegenproefKruis ex={ex} showSolutions={showSolutions} />}
                    </div>
                ))}
            />
        );
    }

    // ── OMGEKEERDE BEWERKING: exercise on top, full write-line for the check below ──
    // prefill: 'niets' = empty line · 'teken' = inverse operator hinted · 'alles' = numbers filled.
    const prefill: string = c.prefill ?? 'niets';
    // The blank a pupil writes a number on. 160px is roughly six digits at the default
    // slider — 64px was a stub nobody could write "1 248" in; flex:1 lets it take whatever
    // the row has left over.
    // Writing-space token, not a fixed em value: the check line grows with the
    // Lettergrootte slider (or a per-block override) like every other answer line.
    const writeLine: React.CSSProperties = {
        borderBottom: '1.5px solid #000', flex: 1, minWidth: '160px', height: ANSWER_LINE_H, display: 'inline-block',
    };
    // 'teken' puts three blanks on one row, so each gets a third of the floor — three
    // 160px minimums would not fit the half a single exercise is allowed to take.
    const writeLineShort: React.CSSProperties = { ...writeLine, minWidth: '54px' };
    return (
        <FragmentableGrid
            cols={1}
            columnGap={24}
            rowGap={gap + 6}
            items={exercises.map(ex => {
                const inv = INVERSE[ex.operator] ?? '−';
                // Inverse check for a op b = r: r − b (bij +) of r + b (bij −) moet a geven.
                const checkVal = ex.operator === '+' ? ex.shownAnswer - ex.b : ex.shownAnswer + ex.b;
                const solution = `${formatMathNumber(ex.shownAnswer)} ${inv} ${formatMathNumber(ex.b)} = ${formatMathNumber(checkVal)}`;
                return (
                    <div key={ex.id} className="print-exercise" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontFamily: mono, fontSize: 'calc(var(--sheet-size-math) * 0.87)' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px' }}>
                            <span>{formatMathNumber(ex.a)} {GLYPH[ex.operator]} {formatMathNumber(ex.b)} = {formatMathNumber(ex.shownAnswer)}</span>
                            {juistFout(ex)}
                        </div>
                        {/* 1.4em of line, not 15px: the pupil writes the check BY HAND on
                            this line, so it has to grow with the Lettergrootte slider like
                            the sum above it. */}
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', paddingLeft: '16px' }}>
                            <span style={{ fontSize: 'calc(var(--sheet-size-text) * 0.6)', color: '#555' }}>controle:</span>
                            {showSolutions
                                ? <span style={{ ...solutionText }}>{solution}</span>
                                : prefill === 'alles'
                                    ? <>
                                        <span>{formatMathNumber(ex.shownAnswer)} {inv} {formatMathNumber(ex.b)} =</span>
                                        <span style={writeLine} />
                                    </>
                                    : prefill === 'teken'
                                        ? <>
                                            <span style={writeLineShort} />
                                            <span>{inv}</span>
                                            <span style={writeLineShort} />
                                            <span>=</span>
                                            <span style={writeLineShort} />
                                        </>
                                        : <span style={{ ...writeLine, minWidth: undefined }} />}
                        </div>
                    </div>
                );
            })}
        />
    );
}
