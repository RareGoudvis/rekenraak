import type { MathBlock, GeldTeruggevenExercise } from '../../services/math/types';
import { Bill } from './GeldViewer';

// ── Amount formatting ─────────────────────────────────────────────────────────

function fmtCents(cents: number): string {
    const euros = Math.floor(cents / 100);
    const c = cents % 100;
    return `€${euros},${String(c).padStart(2, '0')}`;
}

function fmtChange(cents: number): string {
    const euros = Math.floor(cents / 100);
    const c = cents % 100;
    if (euros === 0) return `${c} cent`;
    if (c === 0) return `${euros} euro`;
    return `${euros} euro en ${c} cent`;
}

// ── Underline blank helper ────────────────────────────────────────────────────

const blank = (w = 28): React.CSSProperties => ({
    borderBottom: '1px solid #000', minWidth: `${w}px`,
    display: 'inline-block', verticalAlign: 'bottom',
});

const FS = '13px';
const FONT = "'Azeret Mono', monospace";
const SOL = '#e11d48';

// ── Answer line renderers ─────────────────────────────────────────────────────

function EuroCentLine({ changeCents, showSolutions }: { changeCents: number; showSolutions: boolean }) {
    if (showSolutions) return <span style={{ color: SOL, fontWeight: 'normal' }}>{fmtChange(changeCents)}</span>;
    return (
        <>
            <span style={blank(28)} /><span> euro en </span>
            <span style={blank(28)} /><span> cent</span>
        </>
    );
}

function DecimaalLine({ changeCents, showSolutions }: { changeCents: number; showSolutions: boolean }) {
    if (showSolutions) return <span style={{ color: SOL, fontWeight: 'normal' }}>{fmtCents(changeCents)}</span>;
    return (
        <>
            <span>€ </span>
            <span style={blank(24)} /><span> , </span>
            <span style={blank(24)} />
        </>
    );
}

function AnswerLine({ ex, antwoordFormat, showSolutions }: { ex: GeldTeruggevenExercise; antwoordFormat: string; showSolutions: boolean }) {
    // alignItems: baseline so blank spans (height 0) align their bottom edge to the text baseline
    const wrap = (children: React.ReactNode) => (
        <div style={{ fontFamily: FONT, fontSize: FS, display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '2px' }}>
            {children}
        </div>
    );
    if (antwoordFormat === 'euro-cent') return wrap(<EuroCentLine changeCents={ex.changeCents} showSolutions={showSolutions} />);
    if (antwoordFormat === 'decimaal')  return wrap(<DecimaalLine changeCents={ex.changeCents} showSolutions={showSolutions} />);
    // beide
    return (
        <div style={{ fontFamily: FONT, fontSize: FS, display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '4px' }}>
            <EuroCentLine changeCents={ex.changeCents} showSolutions={showSolutions} />
            {!showSolutions && <span style={{ color: '#999', padding: '0 4px', fontFamily: 'inherit', fontSize: FS }}>of</span>}
            {!showSolutions && <DecimaalLine changeCents={ex.changeCents} showSolutions={showSolutions} />}
        </div>
    );
}

// ── Arrow diagram SVG ─────────────────────────────────────────────────────────

// Compact viewBox: 440×100. Baseline y=72. Arcs stay proportional.
// strokeWidth 1.2, uniform fontSize 12px.

function ArrowDiagram({ ex, scaffolding, showSolutions }: { ex: GeldTeruggevenExercise; scaffolding: string; showSolutions: boolean }) {
    const sol = showSolutions;
    const showLeft   = sol || scaffolding === 'ingevuld' || scaffolding === 'basis';
    const showMiddle = sol || scaffolding === 'ingevuld';
    const showRight  = sol || scaffolding === 'ingevuld' || scaffolding === 'basis';
    const showLabel1 = sol || scaffolding === 'ingevuld';
    const showLabel2 = sol || scaffolding === 'ingevuld';
    const col = sol ? SOL : '#000';

    const label1Sol = `+ ${ex.step1Cents} cent`;
    const label2Sol = `+ €${ex.step2Cents / 100}`;

    // maxWidth keeps the SVG ~400px so fontSize=14 ≈ 13px CSS at normal scale
    // All arc endpoints at y=75 so arrows meet the text nodes at a consistent height
    return (
        <svg viewBox="0 0 440 114" style={{ width: '100%', maxWidth: '400px', overflow: 'visible' }}>
            <defs>
                <marker id="tg-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M 0,0 L 6,3 L 0,6 z" fill="#000" />
                </marker>
            </defs>

            {/* Arc 1: small, below baseline — short cent-step */}
            <path d="M 87,75 C 95,103 130,103 141,75"
                fill="none" stroke="#000" strokeWidth="1.2" markerEnd="url(#tg-arrow)" />

            {/* Arc 2: large, above baseline — long euro-step, middle node is at x≈150-198 */}
            <path d="M 205,75 C 250,28 345,28 376,75"
                fill="none" stroke="#000" strokeWidth="1.2" markerEnd="url(#tg-arrow)" />

            {showLeft  && <text x="50"  y="80" textAnchor="middle" fontSize="14" fontFamily={FONT} fill={col}>{fmtCents(ex.priceCents)}</text>}
            {showRight && <text x="415" y="80" textAnchor="middle" fontSize="14" fontFamily={FONT} fill={col}>{fmtCents(ex.payWithCents)}</text>}

            {/* Middle node: solution shows amount; otherwise € + blank line for student */}
            {showMiddle && (sol
                ? <text x="173" y="80" textAnchor="middle" fontSize="14" fontFamily={FONT} fill={col}>{fmtCents(ex.waypointCents)}</text>
                : <g>
                    <text x="150" y="80" fontSize="14" fontFamily={FONT} fill="#000" textAnchor="start">€</text>
                    <line x1="164" y1="81" x2="198" y2="81" stroke="#000" strokeWidth="1" />
                  </g>
            )}

            {/* Arc 1 label below small arc */}
            {showLabel1 && (sol
                ? <text x="114" y="112" textAnchor="middle" fontSize="12" fontFamily={FONT} fill={col}>{label1Sol}</text>
                : <g>
                    <text x="86"  y="112" fontSize="12" fontFamily={FONT} fill={col} textAnchor="start">+</text>
                    <line x1="98" y1="113" x2="132" y2="113" stroke={col} strokeWidth="1" />
                    <text x="136" y="112" fontSize="12" fontFamily={FONT} fill={col} textAnchor="start">cent</text>
                  </g>
            )}

            {/* Arc 2 label above large arc */}
            {showLabel2 && (sol
                ? <text x="290" y="20" textAnchor="middle" fontSize="12" fontFamily={FONT} fill={col}>{label2Sol}</text>
                : <g>
                    <text x="258" y="20" fontSize="12" fontFamily={FONT} fill={col} textAnchor="start">+ €</text>
                    <line x1="282" y1="21" x2="321" y2="21" stroke={col} strokeWidth="1" />
                  </g>
            )}
        </svg>
    );
}

function ScaffoldingArea({ ex, scaffolding, showSolutions, boxHeight }: {
    ex: GeldTeruggevenExercise; scaffolding: string; showSolutions: boolean; boxHeight: number;
}) {
    if (scaffolding === 'leeg') return null;
    if (scaffolding === 'rechthoek') {
        // 'lege ruimte' — empty calc space; label so pupils know what the space is for
        return (
            <div style={{ width: '100%', height: `${boxHeight}px`, border: '1px solid transparent', boxSizing: 'border-box', borderRadius: '3px', padding: '4px' }}>
                <span style={{ fontSize: '11px', fontStyle: 'italic', color: '#666' }}>Berekening:</span>
            </div>
        );
    }
    return <ArrowDiagram ex={ex} scaffolding={scaffolding} showSolutions={showSolutions} />;
}

// ── Per-exercise cell ─────────────────────────────────────────────────────────

function TeruggevenCell({ ex, block, showSolutions }: { ex: GeldTeruggevenExercise; block: MathBlock; showSolutions: boolean }) {
    const scaffolding: string        = block.constraints.scaffolding      ?? 'ingevuld';
    const antwoordType: string       = block.constraints.antwoordType     ?? 'schrijven';
    const antwoordFormat: string     = block.constraints.antwoordFormat   ?? 'euro-cent';
    const betalenMetTekening: boolean = block.constraints.betalenMetTekening ?? false;
    const boxHeight: number          = block.constraints.boxHeight        ?? 120;

    return (
        <div className="print-exercise" style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '6px 4px', boxSizing: 'border-box' }}>
            {/* Question */}
            <div style={{ fontSize: FS, fontFamily: 'inherit', lineHeight: 1.5 }}>
                <div>Je moet {fmtCents(ex.priceCents)} betalen.</div>
                {betalenMetTekening ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>Je betaalt met:</span>
                        <Bill valueCents={ex.payWithCents} />
                    </div>
                ) : (
                    <div>Je betaalt met {fmtCents(ex.payWithCents)}.</div>
                )}
            </div>

            {/* Diagram / scaffolding */}
            <ScaffoldingArea ex={ex} scaffolding={scaffolding} showSolutions={showSolutions} boxHeight={boxHeight} />

            {/* Answer */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '2px' }}>
                {antwoordType === 'tekenen-schrijven' && (
                    <div style={{ width: '100%', height: `${boxHeight}px`, border: '1px solid #000', boxSizing: 'border-box', borderRadius: '3px', padding: '4px' }}>
                        <span style={{ fontSize: '11px', fontStyle: 'italic', color: '#666' }}>Teken dit bedrag.</span>
                    </div>
                )}
                <AnswerLine ex={ex} antwoordFormat={antwoordFormat} showSolutions={showSolutions} />
            </div>
        </div>
    );
}

// ── Main viewer ───────────────────────────────────────────────────────────────

interface Props { block: MathBlock; showSolutions: boolean; }

export default function GeldTeruggevenViewer({ block, showSolutions }: Props) {
    const exercises: GeldTeruggevenExercise[] = block.geldTeruggevenExercises || [];
    const gap: number = block.verticalSpacing || 14;

    if (exercises.length === 0) {
        return <div className="no-print" style={{ padding: '8px 0', fontStyle: 'italic', color: '#999', fontSize: '13px' }}>(Genereer oefeningen via het paneel links)</div>;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: `${gap}px` }}>
            {exercises.map(ex => (
                <TeruggevenCell key={ex.id} ex={ex} block={block} showSolutions={showSolutions} />
            ))}
        </div>
    );
}
