import FractionShapeSVG from '../../../components/viewer/FractionShapeSVG';
import VerticalFraction from '../../../components/viewer/VerticalFraction';
import { EMPTY_INTERACTION, type ViewerInteraction } from '../../../components/viewer/ViewerInteractionContext';
import { formatMathNumber } from '../../../services/math/formatters';
import { breukvizProps, coloredParts, wholesFor, type BreukItem, type BreukvizProps } from '../../mathTools/breukviz';
import { useSetProps, fontScale, widgetAccent } from '../../settings/baseProps';
import type { BoardWidget } from '../../boardTypes';

const MONO = "'Azeret Mono', monospace";
// Content width of the 300-wide card minus its 14px padding each side.
const BUDGET = 272;

// Most square-like rows × cols for a rectangle of d parts (12 → 3 × 4; a prime stays one row).
function grid(d: number): [number, number] {
    let rows = 1;
    for (let r = 2; r * r <= d; r++) if (d % r === 0) rows = r;
    return [rows, d / rows];
}

function FractionLabel({ f, p, size, ink }: { f: BreukItem; p: BreukvizProps; size: number; ink?: string }) {
    const k = p.equivalent;
    if (p.labelStyle === 'decimaal') {
        return <span style={{ fontFamily: MONO, fontSize: `${size}px`, fontWeight: 700, color: ink }}>{formatMathNumber(String(Math.round((f.n / f.d) * 1000) / 1000))}</span>;
    }
    const whole = p.labelStyle === 'gemengd' ? Math.floor(f.n / f.d) : 0;
    const rest = f.n - whole * f.d;
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: MONO, fontSize: `${size}px`, fontWeight: 700, color: ink }}>
            {whole > 0 && <span>{whole}</span>}
            {(rest > 0 || whole === 0) && <VerticalFraction value={{ n: rest, d: f.d }} fontSize={size} color={ink} mono />}
            {k > 1 && <><span>=</span><VerticalFraction value={{ n: f.n * k, d: f.d * k }} fontSize={size} color={ink} mono /></>}
        </span>
    );
}

// Fraction manipulative: one or more fractions (side by side to compare) as circle, pizza,
// rectangle, strip or number line. Tapping a part colours it; the fraction follows the taps.
export default function BreukvizWidget({ widget }: { widget: BoardWidget }) {
    const set = useSetProps(widget);
    const p = breukvizProps(widget);
    // 22px = the label before settings existed; self-scaled (a frame zoom would clip the shapes).
    const labelSize = 22 * fontScale(widget);
    // Accentkleur inks the label; none = inherit, exactly as before.
    const ink = widgetAccent(widget) ?? undefined;
    const many = p.fractions.length > 1;
    const k = p.equivalent;
    // Several fractions stack as rows with the label beside the shape, so the shapes line up for
    // comparing; the label's room comes off the shape budget (wider with an "= 2/4" overlay).
    const labelRoom = many && p.labels ? (k > 1 ? 130 : 60) * fontScale(widget) : 0;
    const shapeBudget = Math.max(120, BUDGET - labelRoom);

    const writeItem = (idx: number, patch: Partial<BreukItem>) => {
        const fractions = p.fractions.map((f, i) => (i === idx ? { ...f, ...patch } : f));
        set({ fractions, n: fractions[0].n, d: fractions[0].d });
    };

    // One whole of fraction idx, drawn with d·k parts (k > 1 = the gelijkwaardige-breuk split).
    const whole = (f: BreukItem, idx: number, w: number, wholes: number) => {
        const on = new Set(coloredParts(f));
        const sub = f.d * k;
        const colored = Array.from({ length: sub }, (_, j) => j).filter(j => on.has(w * f.d + Math.floor(j / k)));
        // Stambreuk is fixed at 1/d, so its parts are not tappable.
        const ix: ViewerInteraction | null = p.stambreuk ? null : {
            kind: 'tap-multi',
            state: { ...EMPTY_INTERACTION, selected: colored.map(String) },
            set: (next) => {
                const tapped = next.selected.map(Number);
                const added = tapped.find(j => !colored.includes(j));
                const removed = colored.find(j => !tapped.includes(j));
                const part = w * f.d + Math.floor(((added ?? removed) as number) / k);
                const nextOn = new Set(on);
                if (added !== undefined) nextOn.add(part); else nextOn.delete(part);
                writeItem(idx, { parts: [...nextOn].sort((a, b) => a - b), n: nextOn.size });
            },
        };
        // -2 per whole: the 1.5px outline must not push the last whole onto a new line.
        const avail = (shapeBudget - 8 * (wholes - 1)) / wholes - 2;
        if (p.shape === 'strook' || p.shape === 'rechthoek') {
            const [rows, cols] = p.shape === 'strook' ? [1, sub] : grid(sub);
            const width = Math.min(250, avail);
            const height = p.shape === 'strook' ? 56 : Math.min(width * 0.7, 150);
            return (
                <FractionShapeSVG key={w} numerator={f.n} denominator={sub} shape="rectangle" ix={ix}
                    coloredIndices={colored} gridRows={rows} gridCols={cols} fillColor={f.color}
                    showColored cellSize={Math.floor(width / cols)} fixedHeightPx={height} fixedWidthPx={width} />
            );
        }
        const diameter = Math.min(many ? 120 : 190, avail - (p.shape === 'pizza' ? 20 : 12));
        const circle = (
            <FractionShapeSVG numerator={f.n} denominator={sub} shape="circle" ix={ix}
                coloredIndices={colored} gridRows={1} gridCols={sub} fillColor={f.color}
                showColored fixedDiameterPx={diameter} />
        );
        if (p.shape !== 'pizza') return <div key={w}>{circle}</div>;
        return (
            <div key={w} style={{ position: 'relative', margin: wholes > 1 || many ? '10px' : 0 }}>
                {/* Pizza = the same sector circle on a "crust" ring with warm fill. */}
                <div style={{ position: 'absolute', inset: '-10px', borderRadius: '50%', background: '#d9974a', border: '2px solid #a86a2b' }} />
                <div style={{ position: 'relative', filter: 'sepia(0.5) saturate(1.6) hue-rotate(-18deg)' }}>{circle}</div>
            </div>
        );
    };

    const numberLine = (f: BreukItem, idx: number) => {
        const wholes = wholesFor(f);
        const W = Math.min(260, shapeBudget), pad = 14, y = 26, sub = f.d * k;
        const unit = (W - 2 * pad) / wholes;
        const x = (v: number) => pad + v * unit;
        const steps = wholes * sub;
        return (
            <svg width={W} height={52} viewBox={`0 0 ${W} 52`} style={{ display: 'block' }} data-breuk-lijn>
                <line x1={pad} y1={y} x2={W - pad} y2={y} stroke="#000" strokeWidth={2} />
                <line x1={x(0)} y1={y} x2={x(f.n / f.d)} y2={y} stroke={f.color} strokeWidth={8} strokeLinecap="round" />
                {Array.from({ length: steps + 1 }, (_, i) => {
                    const v = i / sub;
                    const big = i % sub === 0;
                    return (
                        <g key={i}>
                            <line x1={x(v)} y1={y - (big ? 10 : 6)} x2={x(v)} y2={y + (big ? 10 : 6)} stroke="#000" strokeWidth={big ? 2 : 1.4} />
                            {big && <text x={x(v)} y={y + 24} textAnchor="middle" fontFamily={MONO} fontSize={13} fill="#111">{i / sub}</text>}
                            {!p.stambreuk && (
                                <rect x={x(v) - unit / sub / 2} y={0} width={unit / sub} height={52} fill="transparent" style={{ cursor: 'pointer' }}
                                    data-breuk-tick={i}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={() => writeItem(idx, { n: Math.round(i / k), parts: null })} />
                            )}
                        </g>
                    );
                })}
                <circle cx={x(f.n / f.d)} cy={y} r={6} fill={f.color} stroke="#000" strokeWidth={1.5} />
            </svg>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: many ? '14px' : '10px', padding: '14px' }}>
            {p.fractions.map((f, idx) => {
                const wholes = wholesFor(f);
                return (
                    <div key={idx} data-breuk-item={idx} style={{ display: 'flex', flexDirection: many ? 'row' : 'column', alignItems: 'center', gap: many ? '12px' : '10px', alignSelf: many ? 'stretch' : undefined }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
                            {p.shape === 'getallenlijn'
                                ? numberLine(f, idx)
                                : Array.from({ length: wholes }, (_, w) => whole(f, idx, w, wholes))}
                        </div>
                        {p.labels && <FractionLabel f={f} p={p} size={labelSize} ink={ink} />}
                    </div>
                );
            })}
        </div>
    );
}
