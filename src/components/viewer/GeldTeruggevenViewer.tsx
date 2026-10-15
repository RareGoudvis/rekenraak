import type { MathBlock, GeldTeruggevenExercise } from '../../services/math/types';
import { Bill, EuroCoin } from './GeldViewer';
import type { GeldTeruggevenConstraints } from '../../services/math/constraintTypes';
import { SOL, solutionText } from './solutionStyle';
import { useBlockWidth } from './BlockWidthContext';

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

// Sizes below are factors of the sheet tokens (--sheet-size-math / --sheet-size-text), not fixed px
const FS = 'calc(var(--sheet-size-math) * 0.75)';
const FS_TEXT = 'calc(var(--sheet-size-text) * 0.65)';
const FS_LABEL = 'calc(var(--sheet-size-text) * 0.55)';
const FONT = "'Azeret Mono', monospace";

// SYNC: same divisor as GeldViewer.tsx (it cannot export it next to its components).
// 13pt = 17.33px, so em over it is today's px on a default sheet.
const em = (px: number): string => `${px / 17.33}em`;

// ── Answer line renderers ─────────────────────────────────────────────────────

function EuroCentLine({ changeCents, showSolutions }: { changeCents: number; showSolutions: boolean }) {
    if (showSolutions) return <span style={{ ...solutionText }}>{fmtChange(changeCents)}</span>;
    return (
        <>
            <span style={blank(28)} /><span> euro en </span>
            <span style={blank(28)} /><span> cent</span>
        </>
    );
}

function DecimaalLine({ changeCents, showSolutions }: { changeCents: number; showSolutions: boolean }) {
    if (showSolutions) return <span style={{ ...solutionText }}>{fmtCents(changeCents)}</span>;
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
// The text inside is in viewBox units, not a token calc: the box itself is sized in em off
// --sheet-size-math, so a calc would scale twice. 14.04 / 12.13 are what
// calc(var(--sheet-size-math) * 0.81) / (* 0.7) resolved to at the 13pt default.
const DIAG_FS = 14.04;
const DIAG_FS_SMALL = 12.13;

function ArrowDiagram({ ex, scaffolding, showSolutions }: { ex: GeldTeruggevenExercise; scaffolding: string; showSolutions: boolean }) {
    const sol = showSolutions;
    // Paid amount = the next whole euro (€0,35 → €1, €9,35 → €10): one jump, so only the
    // cent arc is drawn and the paid amount takes the waypoint's place.
    const single = ex.step2Cents === 0;
    const showLeft   = sol || scaffolding === 'ingevuld' || scaffolding === 'basis';
    const showMiddle = !single && (sol || scaffolding === 'ingevuld');
    const showRight  = sol || scaffolding === 'ingevuld' || scaffolding === 'basis';
    const showLabel1 = sol || scaffolding === 'ingevuld';
    const showLabel2 = !single && (sol || scaffolding === 'ingevuld');
    const col = sol ? SOL : '#000';

    const label1Sol = `+ ${ex.step1Cents} cent`;
    const label2Sol = `+ €${ex.step2Cents / 100}`;

    // maxWidth keeps the SVG at 400px on a 13pt sheet and grows it with the slider
    // All arc endpoints at y=75 so arrows meet the text nodes at a consistent height
    return (
        <svg viewBox={single ? '15 60 210 54' : '0 0 440 114'} style={{ fontSize: 'var(--sheet-size-math)', width: '100%', maxWidth: em(single ? 191 : 400), overflow: 'visible' }}>
            <defs>
                <marker id="tg-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M 0,0 L 6,3 L 0,6 z" fill="#000" />
                </marker>
            </defs>

            {/* Arc 1: small, below baseline — short cent-step */}
            <path d="M 87,75 C 95,103 130,103 141,75"
                fill="none" stroke="#000" strokeWidth="1.2" markerEnd="url(#tg-arrow)" />

            {/* Arc 2: large, above baseline — long euro-step, middle node is at x≈150-198 */}
            {!single && <path d="M 205,75 C 250,28 345,28 376,75"
                fill="none" stroke="#000" strokeWidth="1.2" markerEnd="url(#tg-arrow)" />}

            {showLeft  && <text x="50"  y="80" textAnchor="middle" fontSize={DIAG_FS} fontFamily={FONT} fill={col}>{fmtCents(ex.priceCents)}</text>}
            {showRight && <text x={single ? 173 : 415} y="80" textAnchor="middle" fontSize={DIAG_FS} fontFamily={FONT} fill={col}>{fmtCents(ex.payWithCents)}</text>}

            {/* Middle node: solution shows amount; otherwise € + blank line for student */}
            {showMiddle && (sol
                ? <text x="173" y="80" textAnchor="middle" fontSize={DIAG_FS} fontFamily={FONT} fill={col}>{fmtCents(ex.waypointCents)}</text>
                : <g>
                    <text x="150" y="80" fontSize={DIAG_FS} fontFamily={FONT} fill="#000" textAnchor="start">€</text>
                    <line x1="164" y1="81" x2="198" y2="81" stroke="#000" strokeWidth="1" />
                  </g>
            )}

            {/* Arc 1 label below small arc */}
            {showLabel1 && (sol
                ? <text x="114" y="112" textAnchor="middle" fontSize={DIAG_FS_SMALL} fontFamily={FONT} fill={col}>{label1Sol}</text>
                : <g>
                    <text x="86"  y="112" fontSize={DIAG_FS_SMALL} fontFamily={FONT} fill={col} textAnchor="start">+</text>
                    <line x1="98" y1="113" x2="132" y2="113" stroke={col} strokeWidth="1" />
                    <text x="136" y="112" fontSize={DIAG_FS_SMALL} fontFamily={FONT} fill={col} textAnchor="start">cent</text>
                  </g>
            )}

            {/* Arc 2 label above large arc */}
            {showLabel2 && (sol
                ? <text x="290" y="20" textAnchor="middle" fontSize={DIAG_FS_SMALL} fontFamily={FONT} fill={col}>{label2Sol}</text>
                : <g>
                    <text x="258" y="20" fontSize={DIAG_FS_SMALL} fontFamily={FONT} fill={col} textAnchor="start">+ €</text>
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
                <span style={{ fontSize: FS_LABEL, fontStyle: 'italic', color: '#666' }}>Berekening:</span>
            </div>
        );
    }
    return <ArrowDiagram ex={ex} scaffolding={scaffolding} showSolutions={showSolutions} />;
}

// ── Per-exercise cell ─────────────────────────────────────────────────────────

function TeruggevenCell({ ex, block, showSolutions }: { ex: GeldTeruggevenExercise; block: MathBlock; showSolutions: boolean }) {
    const c = block.constraints as GeldTeruggevenConstraints;
    const scaffolding: string        = c.scaffolding      ?? 'ingevuld';
    const antwoordType: string       = c.antwoordType     ?? 'schrijven';
    const antwoordFormat: string     = c.antwoordFormat   ?? 'euro-cent';
    const betalenMetTekening: boolean = c.betalenMetTekening ?? false;
    const boxHeight: number          = c.boxHeight        ?? 120;
    // The scaffold (arrow diagram or the lege-ruimte box) goes beside the text, in the same right-hand slot.
    const diagramBeside = scaffolding !== 'leeg';

    const tekenen = antwoordType === 'tekenen-schrijven';
    const blockWidth = useBlockWidth();
    // Text and scaffold side by side only when both fit (left column ≥ 220 px, scaffold ≥ 220 px, gap);
    // narrower cells stack: question, scaffold, answer line last.
    const wide = blockWidth >= 500;
    const gridLayout = wide && tekenen && diagramBeside;

    const question = (
        <div style={{ fontSize: FS_TEXT, fontFamily: 'inherit', lineHeight: 1.5 }}>
            <div>Je moet {fmtCents(ex.priceCents)} betalen.</div>
            {betalenMetTekening ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Je betaalt met:</span>
                    {ex.payWithCents < 500 ? <EuroCoin valueCents={ex.payWithCents} /> : <Bill valueCents={ex.payWithCents} />}
                </div>
            ) : (
                <div>Je betaalt met {fmtCents(ex.payWithCents)}.</div>
            )}
        </div>
    );
    const drawBox = tekenen && (
        <div style={{ width: '100%', height: `${boxHeight}px`, border: '1px solid #000', boxSizing: 'border-box', borderRadius: '3px', padding: '4px' }}>
            <span style={{ fontSize: FS_LABEL, fontStyle: 'italic', color: '#666' }}>Teken dit bedrag.</span>
        </div>
    );
    const answer = <AnswerLine ex={ex} antwoordFormat={antwoordFormat} showSolutions={showSolutions} />;
    const diagram = diagramBeside && <ScaffoldingArea ex={ex} scaffolding={scaffolding} showSolutions={showSolutions} boxHeight={boxHeight} />;

    if (gridLayout) {
        // The diagram shares the draw box's row and is centred on it; the answer line is centred under the box.
        return (
            <div className="print-exercise" style={{ padding: '6px 4px', boxSizing: 'border-box' }}>
                <div style={{ display: 'grid', gridTemplateColumns: `minmax(0, 1fr) minmax(${em(220)}, ${em(400)})`, columnGap: em(40), rowGap: '6px', alignItems: 'start' }}>
                    <div style={{ gridColumn: 1, gridRow: 1 }}>{question}</div>
                    <div style={{ gridColumn: 1, gridRow: 2 }}>{drawBox}</div>
                    <div style={{ gridColumn: 1, gridRow: 3, justifySelf: 'center' }}>{answer}</div>
                    <div style={{ gridColumn: 2, gridRow: 2, alignSelf: 'center', justifySelf: 'end', width: '100%', display: 'flex', justifyContent: 'flex-end' }}>{diagram}</div>
                </div>
            </div>
        );
    }

    if (!wide) {
        return (
            <div className="print-exercise" style={{ padding: '6px 4px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {question}
                {diagramBeside && <div style={{ display: 'flex', justifyContent: 'flex-end' }}>{diagram}</div>}
                {drawBox}
                <div style={{ alignSelf: tekenen ? 'center' : 'flex-start' }}>{answer}</div>
            </div>
        );
    }

    return (
        <div className="print-exercise" style={{ padding: '6px 4px', boxSizing: 'border-box' }}>
            {/* Two columns: text + answer on the left, the scaffold top-right */}
            <div style={{ display: 'flex', alignItems: 'flex-start', columnGap: em(40) }}>
                <div style={{ flex: `1 1 ${em(220)}`, minWidth: 0, alignSelf: 'stretch', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {question}
                    {drawBox}
                    {/* Under a draw box the answer line is centred beneath it; otherwise it sits at the left like the text */}
                    {/* Without a draw box the answer line drops to the bottom of the row, level with the diagram */}
                    <div style={{ alignSelf: tekenen ? 'center' : 'flex-start', marginTop: tekenen ? 0 : 'auto', paddingTop: tekenen ? 0 : em(8) }}>{answer}</div>
                </div>
                {diagramBeside && (
                    <div style={{ flex: `0 1 ${em(400)}`, minWidth: em(220), marginLeft: 'auto', display: 'flex', justifyContent: 'flex-end' }}>
                        {diagram}
                    </div>
                )}
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
        return <div className="no-print" style={{ padding: '8px 0', fontStyle: 'italic', color: '#999', fontSize: '13px' }}>(Nog geen oefeningen — klik Genereer)</div>;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: `${gap}px` }}>
            {exercises.map(ex => (
                <TeruggevenCell key={ex.id} ex={ex} block={block} showSolutions={showSolutions} />
            ))}
        </div>
    );
}
