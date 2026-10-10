import type { MathBlock, WeegschaalExercise } from '../../services/math/types';
import { formatGewicht } from '../../services/weegschaal/weegschaalGenerator';
import FragmentableGrid from './FragmentableGrid';
import { fitCols, useBlockWidth, useSheetSizePx, ANSWER_LINE_H } from './BlockWidthContext';
import { monoTextPx } from '../../services/layout/blockLayout';
import type { WeegschaalConstraints } from '../../services/math/constraintTypes';
import { SOL, solutionText } from './solutionStyle';
import { useViewerInteraction, type ViewerInteraction } from './ViewerInteractionContext';
import { clamp, clockAngle, dragHandleProps, dragSurfaceProps, dragValuesOf } from './kioskDrag';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

const mono = "'Azeret Mono', monospace";

// Sizes below are factors of the sheet token (--sheet-size-math), not fixed px

// 13pt (the --sheet-size-math default) is 17.33 CSS px, so a figure sized `px / 17.33` em
// inside a `font-size: var(--sheet-size-math)` box reproduces today's pixels exactly and
// then follows the teacher's Lettergrootte slider. SYNC: same divisor in every viewer.
const PX_PER_EM_AT_DEFAULT = 17.33;
const mathPx = (px: number) => `calc(var(--sheet-size-math) * ${(px / PX_PER_EM_AT_DEFAULT).toFixed(3)})`;
// Dial labels in viewBox units, and the room the needle keeps from them.
const LABEL_FONT = 0.64 * PX_PER_EM_AT_DEFAULT;
const NEEDLE_CLEAR = 2;

// Distance along the ray from the centre at `ang` to the first label box it enters (slab test),
// or Infinity. A needle pointing AT a major value used to run straight through its label.
function rayEntry(ang: number, boxes: { x: number; y: number; w: number; h: number }[]): number {
    const dx = Math.cos(ang), dy = Math.sin(ang);
    let best = Infinity;
    for (const b of boxes) {
        let t0 = 0, t1 = Infinity;
        for (const [d, c, half] of [[dx, b.x, b.w], [dy, b.y, b.h]] as const) {
            if (Math.abs(d) < 1e-9) { if (Math.abs(c) >= half) { t0 = Infinity; break; } continue; }
            const a = (c - half) / d, z = (c + half) / d;
            t0 = Math.max(t0, Math.min(a, z)); t1 = Math.min(t1, Math.max(a, z));
        }
        if (t0 <= t1) best = Math.min(best, t0);
    }
    return best;
}

// Dial geometry mirrors AnalogClockSVG's polar math: ticks around the rim,
// labels at the majors, a red needle from the centre.
function Dial({ grams, bereik, step, needleColor, arcColor, size, ctx }: {
    grams: number; bereik: number; step: number;
    needleColor?: string;   // aflezen: draws the needle at `grams` in this colour
    arcColor?: string;      // kleuren solutions: fills a wedge from 0 to `grams` in this colour
    size: number;
    // Oefenmodus "kleur tot" (kiosk only): the pupil drags a needle round; `grams` is ignored.
    ctx?: ViewerInteraction;
}) {
    const cx = size / 2, cy = size / 2;
    const rOuter = size / 2 - 6;
    const angleOf = (v: number) => (v / bereik) * 2 * Math.PI - Math.PI / 2;   // 0 g at top, clockwise
    const ticks: React.ReactNode[] = [];
    const labelBoxes: { x: number; y: number; w: number; h: number }[] = [];
    const majorEvery = bereik / 10;   // 10 labelled majors round the dial
    const total = bereik / step;
    for (let i = 0; i < total; i++) {
        const value = i * step;
        const isMajor = value % majorEvery === 0;
        const ang = angleOf(value);
        const r1 = isMajor ? rOuter - 12 : rOuter - 7;
        ticks.push(
            <line key={i}
                x1={cx + r1 * Math.cos(ang)} y1={cy + r1 * Math.sin(ang)}
                x2={cx + rOuter * Math.cos(ang)} y2={cy + rOuter * Math.sin(ang)}
                stroke="#000" strokeWidth={isMajor ? 1.8 : 1} />
        );
        if (isMajor) {
            const rl = rOuter - 24;
            const label = bereik >= 2000 ? `${value / 1000}`.replace('.', ',') : String(value);
            labelBoxes.push({ x: rl * Math.cos(ang), y: rl * Math.sin(ang), w: monoTextPx(label.length, 1, LABEL_FONT) / 2 + 1, h: LABEL_FONT / 2 + 1 });
            ticks.push(
                <text key={`t${i}`} x={cx + rl * Math.cos(ang)} y={cy + rl * Math.sin(ang)}
                    textAnchor="middle" dominantBaseline="central" fontSize={LABEL_FONT} fontFamily={mono}>{label}</text>
            );
        }
    }
    // The kiosk dial shows the pupil's own weight (nothing until the needle is first placed).
    const set = ctx ? dragValuesOf(ctx).g : undefined;
    const needleAt = ctx ? (set ?? 0) : grams;
    const needleAng = angleOf(needleAt);
    // The needle reaches toward the ticks but stops short of a label in its way.
    const rn = Math.min(rOuter - 16, rayEntry(needleAng, labelBoxes) - NEEDLE_CLEAR);
    // The kiosk needle reaches the tick ring, so its knob sits past the labels, not on them.
    const rk = rOuter - 7;
    // A press anywhere on the dial points the needle there, snapped to the dial's step; once
    // round past 0 it starts over (the bereik itself is never asked).
    const surface = ctx ? dragSurfaceProps(ctx, {
        width: size, height: size, pick: () => 'g',
        move: (_k, p, from) => ({ ...from, g: (Math.round((clockAngle(p, cx, cy) / 360) * (bereik / step)) * step) % bereik }),
    }) : {};

    // Solution wedge for 'kleuren': a filled pie slice from 0 up to `grams`, drawn
    // under the ticks so the scale markings stay legible through the shading.
    let wedge: React.ReactNode = null;
    if (arcColor && grams > 0) {
        const rArc = rOuter - 6;
        const startAng = angleOf(0);
        const endAng = angleOf(grams);
        const largeArc = endAng - startAng > Math.PI ? 1 : 0;
        const sx = cx + rArc * Math.cos(startAng), sy = cy + rArc * Math.sin(startAng);
        const ex = cx + rArc * Math.cos(endAng), ey = cy + rArc * Math.sin(endAng);
        wedge = <path d={`M ${cx} ${cy} L ${sx} ${sy} A ${rArc} ${rArc} 0 ${largeArc} 1 ${ex} ${ey} Z`} fill={arcColor} fillOpacity={0.35} />;
    }
    if (ctx && needleAt > 0) {
        // The pupil's wedge in the state accent (kiosk.css), never the solution red.
        const rArc = rOuter - 6;
        const s0 = angleOf(0), s1 = angleOf(needleAt);
        wedge = <path className="kiosk-drag-fill" d={`M ${cx} ${cy} L ${cx + rArc * Math.cos(s0)} ${cy + rArc * Math.sin(s0)} A ${rArc} ${rArc} 0 ${s1 - s0 > Math.PI ? 1 : 0} 1 ${cx + rArc * Math.cos(s1)} ${cy + rArc * Math.sin(s1)} Z`} />;
    }

    return (
        // `size` stays the viewBox geometry (ticks, labels, needle/wedge are all in those
        // units); only the rendered box follows the token, so the dial scales as one.
        <svg width={mathPx(size)} height={mathPx(size)} viewBox={`0 0 ${size} ${size}`} {...surface}>
            <circle cx={cx} cy={cy} r={rOuter} fill="none" stroke="#000" strokeWidth={2} />
            {wedge}
            {ticks}
            {/* Unit in the dial face; kg dials label in kg to keep numbers readable. */}
            <text x={cx} y={cy + rOuter * 0.45} textAnchor="middle" fontSize={LABEL_FONT} fontFamily={mono} fill="#555">
                {bereik >= 2000 ? 'kg' : 'g'}
            </text>
            {needleColor && (
                <line x1={cx} y1={cy} x2={cx + rn * Math.cos(needleAng)} y2={cy + rn * Math.sin(needleAng)}
                    stroke={needleColor} strokeWidth={2.5} strokeLinecap="round" />
            )}
            {ctx && <>
                {set !== undefined && <line className="kiosk-drag-line" x1={cx} y1={cy} x2={cx + rk * Math.cos(needleAng)} y2={cy + rk * Math.sin(needleAng)} strokeWidth={2.5} strokeLinecap="round" />}
                <g {...dragHandleProps(ctx, 'g', {
                    label: 'wijzer', valueText: `${needleAt} gram`, value: needleAt, min: 0, max: bereik - step,
                    step: (dir, from) => ({ ...from, g: clamp((from.g ?? -dir * step) + dir * step, 0, bereik - step) }),
                })}>
                    {/* Not placed yet: the knob waits hollow at 0. */}
                    <circle cx={cx + rk * Math.cos(needleAng)} cy={cy + rk * Math.sin(needleAng)} r={6} className={`kiosk-knob${set === undefined ? ' is-unset' : ''}`} />
                </g>
            </>}
            <circle cx={cx} cy={cy} r={4} fill="#000" />
        </svg>
    );
}

export default function WeegschaalViewer({ block, showSolutions }: Props) {
    const availableWidth = useBlockWidth();
    const sheetPx = useSheetSizePx('math');
    const ctx = useViewerInteraction();
    const exercises: WeegschaalExercise[] = block.weegschaalExercises || [];
    const c = block.constraints as WeegschaalConstraints;
    // exercisesPerRow/boxHeight are layout-only and always follow the live constraints;
    // bereik/step/notatie/mode are drawn structure, so each exercise falls back to its
    // own generation-time value first (see BUGS.md, stale settings).
    const perRow: number = c.exercisesPerRow ?? 2;
    const boxHeight: number = c.boxHeight ?? 170;
    const gap = block.verticalSpacing || 14;

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Nog geen oefeningen — klik Genereer)</div>;
    }

    const size = Math.max(120, Math.min(220, boxHeight));
    // The dial grows with the token, so the teacher's perRow is a ceiling, not a promise:
    // drop columns rather than let an enlarged dial overflow a half/quarter-width cell.
    const itemMinPx = size * (sheetPx / PX_PER_EM_AT_DEFAULT) + 24;   // +24 = the column gap below

    return (
        <FragmentableGrid
            cols={fitCols(availableWidth, itemMinPx, perRow, 24)}
            columnGap={24}
            rowGap={gap + 10}
            alignItems="flex-start"
            items={exercises.map(ex => {
                const bereik = ex.bereikGram ?? c.bereikGram ?? 1000;
                const step = ex.stepGram ?? c.stepGram ?? 50;
                const notatie = ex.notatie ?? c.notatie ?? 'g';
                // Legacy saves may still carry 'tekenen' (renamed to 'kleuren').
                const rawMode = ex.mode ?? c.mode ?? 'aflezen';
                const mode = (rawMode as string) === 'tekenen' ? 'kleuren' : rawMode;
                return (
                <div key={ex.id} className="print-exercise" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    {mode === 'aflezen'
                        // aflezen: needle printed black, pupil writes the weight.
                        ? <Dial grams={ex.grams} bereik={bereik} step={step} needleColor="#000" size={size} />
                        // kleuren: no needle at all — pupil colours the dial, red wedge only in solutions.
                        // Oefenmodus: the pupil drags a needle round instead (kiosk only).
                        : <Dial grams={ex.grams} bereik={bereik} step={step} arcColor={showSolutions ? SOL : undefined} size={size} ctx={ctx?.kind === 'drag' ? ctx : undefined} />}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', fontFamily: mono, fontSize: 'calc(var(--sheet-size-math) * 0.81)' }}>
                        {mode === 'aflezen'
                            ? showSolutions
                                ? <span style={{ ...solutionText }}>{formatGewicht(ex.grams, notatie)}</span>
                                : <>
                                    <span style={{ borderBottom: '1.5px solid #000', display: 'inline-block', width: mathPx(70), height: ANSWER_LINE_H }} />
                                    <span>{notatie === 'g' ? 'g' : notatie === 'kg-komma' ? 'kg' : ''}</span>
                                </>
                            // The kiosk header carries the verb ("Sleep de wijzer …"): the card keeps the target only.
                            : <span>{ctx?.kind === 'drag' ? null : 'Kleur tot '}{formatGewicht(ex.grams, notatie)}</span>}
                    </div>
                </div>
                );
            })}
        />
    );
}
