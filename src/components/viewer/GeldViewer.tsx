import type { MathBlock, GeldExercise, GeldDenomination } from '../../services/math/types';
import { DENOMINATION_CATALOGUE, formatAmount, denominationLabel } from '../../services/geld/geldGenerator';
import FragmentableGrid from './FragmentableGrid';
import { fitCols, useBlockWidth, useSheetSizePx } from './BlockWidthContext';
import type { GeldConstraints } from '../../services/math/constraintTypes';
import { solutionText } from './solutionStyle';

// Sizes below are factors of the sheet tokens (--sheet-size-math / --sheet-size-text), not fixed px

// Coins and bills keep their px geometry as the viewBox and their element size as em over
// this divisor: 13pt (the --sheet-size-math default) = 17.33px, so a default sheet draws
// exactly today's pixels and the Lettergrootte slider grows the figures with the text.
// The numerals inside are viewBox units, so they scale with the coin for free.
// SYNC: GeldTeruggevenViewer.tsx repeats `em` for the jump diagram.
const PX_PER_EM_AT_DEFAULT = 17.33;
const em = (px: number): string => `${px / PX_PER_EM_AT_DEFAULT}em`;
// Each figure carries the token as its own font-size so the em above resolves against it.
const FIGURE_FONT: React.CSSProperties = { fontSize: 'var(--sheet-size-math)' };

// ── SVG helpers (print-friendly: white fill, black outline, no colour) ────────

function billText(valueCents: number): string { return `${valueCents / 100}`; }
function coinText(valueCents: number): string { return valueCents >= 100 ? `${valueCents / 100}` : `${valueCents}`; }

interface BillProps { valueCents: number; width?: number; height?: number; }
interface CoinProps { valueCents: number; size?: number; }

export function Bill({ valueCents, width = 56, height = 32 }: BillProps) {
    const fs = Math.round(height * 0.42);
    const ty = Math.round(height * 0.62);
    return (
        <svg width={em(width)} height={em(height)} viewBox="0 0 70 40" style={FIGURE_FONT}>
            <rect x="1.5" y="1.5" width="67" height="37" rx="4" ry="4" fill="white" stroke="#000" strokeWidth="2" />
            <text x="35" y={(40 * ty) / height} textAnchor="middle" fontSize={(40 * fs) / height} fontWeight="bold"
                fontFamily="'Azeret Mono', monospace" fill="#000">
                {billText(valueCents)}
            </text>
        </svg>
    );
}

function EuroCoin({ valueCents, size = 36 }: CoinProps) {
    return (
        <svg width={em(size)} height={em(size)} viewBox="0 0 44 44" style={FIGURE_FONT}>
            <circle cx="22" cy="22" r="20" fill="white" stroke="#000" strokeWidth="2" />
            <circle cx="22" cy="22" r="14" fill="white" stroke="#000" strokeWidth="1.5" />
            <text x="22" y="27" textAnchor="middle" fontSize="13" fontWeight="bold"
                fontFamily="'Azeret Mono', monospace" fill="#000">
                {coinText(valueCents)}
            </text>
        </svg>
    );
}

function CentCoin({ valueCents, size = 30 }: CoinProps) {
    return (
        <svg width={em(size)} height={em(size)} viewBox="0 0 36 36" style={FIGURE_FONT}>
            <circle cx="18" cy="18" r="16" fill="white" stroke="#000" strokeWidth="1.5" />
            <text x="18" y="23" textAnchor="middle" fontSize="11" fontWeight="bold"
                fontFamily="'Azeret Mono', monospace" fill="#000">
                {coinText(valueCents)}
            </text>
        </svg>
    );
}

function DenomItem({ denom }: { denom: GeldDenomination }) {
    const items = Array.from({ length: denom.count }, (_, i) => {
        if (denom.type === 'bill') return <Bill key={i} valueCents={denom.valueCents} />;
        if (denom.type === 'euro-coin') return <EuroCoin key={i} valueCents={denom.valueCents} />;
        return <CentCoin key={i} valueCents={denom.valueCents} />;
    });
    return <>{items}</>;
}

// ── Voorbeelden bar ───────────────────────────────────────────────────────────
// Sized small so the full set of 13 denominations fits on a single line.

export function VoorbeeldenBar({ allowedDenominations, voorbeeldTypes }: { allowedDenominations: number[]; voorbeeldTypes: number[] }) {
    const toShow = DENOMINATION_CATALOGUE.filter(
        d => allowedDenominations.includes(d.valueCents) && voorbeeldTypes.includes(d.valueCents)
    );
    if (toShow.length === 0) return null;
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'flex-end', padding: '6px 0 8px', borderBottom: '1px solid #e5e7eb', marginBottom: '10px' }}>
            {toShow.map(d => (
                <div key={d.valueCents} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                    {d.type === 'bill' && <Bill valueCents={d.valueCents} width={42} height={24} />}
                    {d.type === 'euro-coin' && <EuroCoin valueCents={d.valueCents} size={26} />}
                    {d.type === 'cent-coin' && <CentCoin valueCents={d.valueCents} size={22} />}
                    <span style={{ fontSize: 'calc(var(--sheet-size-math) * 0.52)', fontFamily: "'Azeret Mono', monospace", color: '#555' }}>
                        {denominationLabel(d.valueCents)}
                    </span>
                </div>
            ))}
        </div>
    );
}

// ── Per-exercise cell ─────────────────────────────────────────────────────────

function HerkennenCell({ ex, block, showSolutions }: { ex: GeldExercise; block: MathBlock; showSolutions: boolean }) {
    const c = block.constraints as GeldConstraints;
    const format: string = c.format ?? 'euros';
    const scaffolding: string = c.scaffolding ?? 'invullen';
    const geldLayout: string = c.geldLayout ?? 'samen';

    const answerArea = showSolutions ? (
        <div style={{ ...solutionText, fontSize: 'calc(var(--sheet-size-math) * 0.92)', fontFamily: "'Azeret Mono', monospace", marginTop: '6px' }}>
            {formatAmount(ex.amountCents, format)}
        </div>
    ) : scaffolding === 'invullen' ? (
        <div style={{ fontFamily: "'Azeret Mono', monospace", fontSize: 'calc(var(--sheet-size-math) * 0.81)', marginTop: '6px' }}>
            {format === 'decimaal' ? '€ ___ , ___' : '€ _______'}
        </div>
    ) : (
        <div style={{ borderBottom: '1.5px solid #000', width: '100px', height: '20px', marginTop: '8px' }} />
    );

    const rowStyle: React.CSSProperties = { ...FIGURE_FONT, display: 'flex', flexWrap: 'wrap', gap: em(6), justifyContent: 'center', alignContent: 'flex-start', width: '100%' };

    let denomArea: React.ReactNode;
    if (geldLayout === 'gescheiden') {
        const eurosGroup = ex.denominations.filter(d => d.type === 'bill' || d.type === 'euro-coin');
        const centsGroup = ex.denominations.filter(d => d.type === 'cent-coin');
        denomArea = (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', width: '100%' }}>
                {eurosGroup.length > 0 && (
                    <div style={rowStyle}>
                        {eurosGroup.map((d, i) => <DenomItem key={`e${i}`} denom={d} />)}
                    </div>
                )}
                {centsGroup.length > 0 && (
                    <div style={rowStyle}>
                        {centsGroup.map((d, i) => <DenomItem key={`c${i}`} denom={d} />)}
                    </div>
                )}
            </div>
        );
    } else {
        denomArea = (
            <div style={rowStyle}>
                {ex.denominations.map((d, i) => <DenomItem key={i} denom={d} />)}
            </div>
        );
    }

    return (
        <div className="print-exercise" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px', boxSizing: 'border-box', height: '100%' }}>
            {denomArea}
            <div style={{ flex: 1 }} />
            {answerArea}
        </div>
    );
}

// ── Main viewer ───────────────────────────────────────────────────────────────

interface Props { block: MathBlock; showSolutions: boolean; }

export default function GeldViewer({ block, showSolutions }: Props) {
    const availableWidth = useBlockWidth();
    // 150px of coins at the 13pt default; the figures are em, so the budget follows the slider.
    const itemMinPx = 150 * (useSheetSizePx('math') / PX_PER_EM_AT_DEFAULT);
    const exercises: GeldExercise[] = block.geldExercises || [];
    const gap: number = block.verticalSpacing || 14;
    const c = block.constraints as GeldConstraints;
    const allowedDenominations: number[] = c.allowedDenominations ?? [];
    const voorbeeldTypes: number[] = c.voorbeeldTypes ?? [];
    const showVoorbeelden: boolean = c.showVoorbeelden ?? false;
    const exercisesPerRow: number | null = c.exercisesPerRow ?? null;
    const perRow = exercisesPerRow ?? 4;

    if (exercises.length === 0) {
        return <div className="no-print" style={{ padding: '8px 0', fontStyle: 'italic', color: '#999', fontSize: '14px' }}>(Nog geen oefeningen — klik Genereer)</div>;
    }

    return (
        <div>
            {showVoorbeelden && voorbeeldTypes.length > 0 && (
                <VoorbeeldenBar allowedDenominations={allowedDenominations} voorbeeldTypes={voorbeeldTypes} />
            )}
            <FragmentableGrid
                cols={fitCols(availableWidth, itemMinPx, perRow)}
                columnGap={gap}
                rowGap={gap}
                alignItems="stretch"
                items={exercises.map(ex => (
                    <HerkennenCell key={ex.id} ex={ex} block={block} showSolutions={showSolutions} />
                ))}
            />
        </div>
    );
}
