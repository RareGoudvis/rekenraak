import type { MathBlock, GeldExercise, GeldDenomination } from '../../services/math/types';
import { DENOMINATION_CATALOGUE, formatAmount, denominationLabel } from '../../services/geld/geldGenerator';
import FragmentableGrid from './FragmentableGrid';

// ── SVG helpers (print-friendly: white fill, black outline, no colour) ────────

function billText(valueCents: number): string { return `${valueCents / 100}`; }
function coinText(valueCents: number): string { return valueCents >= 100 ? `${valueCents / 100}` : `${valueCents}`; }

interface BillProps { valueCents: number; width?: number; height?: number; }
interface CoinProps { valueCents: number; size?: number; }

export function Bill({ valueCents, width = 56, height = 32 }: BillProps) {
    const fs = Math.round(height * 0.42);
    const ty = Math.round(height * 0.62);
    return (
        <svg width={width} height={height} viewBox="0 0 70 40">
            <rect x="1.5" y="1.5" width="67" height="37" rx="4" ry="4" fill="white" stroke="#000" strokeWidth="2" />
            <text x="35" y={(40 * ty) / height} textAnchor="middle" fontSize={(40 * fs) / height} fontWeight="bold"
                fontFamily="'Azeret Mono', monospace" fill="#000">
                {billText(valueCents)}
            </text>
        </svg>
    );
}

export function EuroCoin({ valueCents, size = 36 }: CoinProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 44 44">
            <circle cx="22" cy="22" r="20" fill="white" stroke="#000" strokeWidth="2" />
            <circle cx="22" cy="22" r="14" fill="white" stroke="#000" strokeWidth="1.5" />
            <text x="22" y="27" textAnchor="middle" fontSize="13" fontWeight="bold"
                fontFamily="'Azeret Mono', monospace" fill="#000">
                {coinText(valueCents)}
            </text>
        </svg>
    );
}

export function CentCoin({ valueCents, size = 30 }: CoinProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 36 36">
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
                    <span style={{ fontSize: '9px', fontFamily: "'Azeret Mono', monospace", color: '#555' }}>
                        {denominationLabel(d.valueCents)}
                    </span>
                </div>
            ))}
        </div>
    );
}

// ── Per-exercise cell ─────────────────────────────────────────────────────────

function HerkennenCell({ ex, block, showSolutions }: { ex: GeldExercise; block: MathBlock; showSolutions: boolean }) {
    const format: string = block.constraints.format ?? 'euros';
    const scaffolding: string = block.constraints.scaffolding ?? 'invullen';
    const geldLayout: string = block.constraints.geldLayout ?? 'samen';

    const answerArea = showSolutions ? (
        <div style={{ color: '#e11d48', fontWeight: 'bold', fontSize: '16px', fontFamily: "'Azeret Mono', monospace", marginTop: '6px' }}>
            {formatAmount(ex.amountCents, format)}
        </div>
    ) : scaffolding === 'invullen' ? (
        <div style={{ fontFamily: "'Azeret Mono', monospace", fontSize: '14px', marginTop: '6px' }}>
            {format === 'decimaal' ? '€ ___ , ___' : '€ _______'}
        </div>
    ) : (
        <div style={{ borderBottom: '1.5px solid #000', width: '100px', height: '20px', marginTop: '8px' }} />
    );

    const rowStyle: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', alignContent: 'flex-start', width: '100%' };

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
    const exercises: GeldExercise[] = block.geldExercises || [];
    const gap: number = block.verticalSpacing || 14;
    const allowedDenominations: number[] = block.constraints.allowedDenominations ?? [];
    const voorbeeldTypes: number[] = block.constraints.voorbeeldTypes ?? [];
    const showVoorbeelden: boolean = block.constraints.showVoorbeelden ?? false;
    const exercisesPerRow: number | null = block.constraints.exercisesPerRow ?? null;
    const perRow = exercisesPerRow ?? 4;

    if (exercises.length === 0) {
        return <div className="no-print" style={{ padding: '8px 0', fontStyle: 'italic', color: '#999', fontSize: '14px' }}>(Genereer oefeningen via het rechterpaneel)</div>;
    }

    return (
        <div>
            {showVoorbeelden && voorbeeldTypes.length > 0 && (
                <VoorbeeldenBar allowedDenominations={allowedDenominations} voorbeeldTypes={voorbeeldTypes} />
            )}
            <FragmentableGrid
                cols={perRow}
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
