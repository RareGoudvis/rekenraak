import type { MathBlock, WeegschaalExercise } from '../../services/math/types';
import { formatGewicht } from '../../services/weegschaal/weegschaalGenerator';
import FragmentableGrid from './FragmentableGrid';
import { fitCols, useBlockWidth, useSheetSizePx } from './BlockWidthContext';
import type { WeegschaalConstraints } from '../../services/math/constraintTypes';
import { SOL, solutionText } from './solutionStyle';

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

// Dial geometry mirrors AnalogClockSVG's polar math: ticks around the rim,
// labels at the majors, a red needle from the centre.
function Dial({ grams, bereik, step, showNeedle, needleColor, size }: {
    grams: number; bereik: number; step: number; showNeedle: boolean; needleColor: string; size: number;
}) {
    const cx = size / 2, cy = size / 2;
    const rOuter = size / 2 - 6;
    const ticks: React.ReactNode[] = [];
    const majorEvery = bereik / 10;   // 10 labelled majors round the dial
    const total = bereik / step;
    for (let i = 0; i < total; i++) {
        const value = i * step;
        const isMajor = value % majorEvery === 0;
        // 0 g at the top, clockwise; full range = full turn (kitchen-scale convention).
        const ang = (value / bereik) * 2 * Math.PI - Math.PI / 2;
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
            ticks.push(
                <text key={`t${i}`} x={cx + rl * Math.cos(ang)} y={cy + rl * Math.sin(ang)}
                    textAnchor="middle" dominantBaseline="central" fontSize={0.64 * PX_PER_EM_AT_DEFAULT} fontFamily={mono}>{label}</text>
            );
        }
    }
    const needleAng = (grams / bereik) * 2 * Math.PI - Math.PI / 2;
    const rn = rOuter - 16;
    return (
        // `size` stays the viewBox geometry (ticks, labels and needle are all in those units);
        // only the rendered box follows the token, so the whole dial scales as one.
        <svg width={mathPx(size)} height={mathPx(size)} viewBox={`0 0 ${size} ${size}`}>
            <circle cx={cx} cy={cy} r={rOuter} fill="none" stroke="#000" strokeWidth={2} />
            {ticks}
            {/* Unit in the dial face; kg dials label in kg to keep numbers readable. */}
            <text x={cx} y={cy + rOuter * 0.45} textAnchor="middle" fontSize={0.64 * PX_PER_EM_AT_DEFAULT} fontFamily={mono} fill="#555">
                {bereik >= 2000 ? 'kg' : 'g'}
            </text>
            {showNeedle && (
                <line x1={cx} y1={cy} x2={cx + rn * Math.cos(needleAng)} y2={cy + rn * Math.sin(needleAng)}
                    stroke={needleColor} strokeWidth={2.5} strokeLinecap="round" />
            )}
            <circle cx={cx} cy={cy} r={4} fill="#000" />
        </svg>
    );
}

export default function WeegschaalViewer({ block, showSolutions }: Props) {
    const availableWidth = useBlockWidth();
    const sheetPx = useSheetSizePx('math');
    const exercises: WeegschaalExercise[] = block.weegschaalExercises || [];
    const c = block.constraints as WeegschaalConstraints;
    const mode: string = c.mode ?? 'aflezen';
    const bereik: number = c.bereikGram ?? 1000;
    const step: number = c.stepGram ?? 50;
    const notatie: string = c.notatie ?? 'g';
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
            items={exercises.map(ex => (
                <div key={ex.id} className="print-exercise" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    {mode === 'aflezen'
                        // aflezen: needle printed black, pupil writes the weight.
                        ? <Dial grams={ex.grams} bereik={bereik} step={step} showNeedle needleColor="#000" size={size} />
                        // tekenen: weight printed, solution needle in red.
                        : <Dial grams={ex.grams} bereik={bereik} step={step} showNeedle={showSolutions} needleColor={SOL} size={size} />}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', fontFamily: mono, fontSize: 'calc(var(--sheet-size-math) * 0.81)' }}>
                        {mode === 'aflezen'
                            ? showSolutions
                                ? <span style={{ ...solutionText }}>{formatGewicht(ex.grams, notatie)}</span>
                                : <>
                                    <span style={{ borderBottom: '1.5px solid #000', display: 'inline-block', width: mathPx(70), height: mathPx(16) }} />
                                    <span>{notatie === 'g' ? 'g' : notatie === 'kg-komma' ? 'kg' : ''}</span>
                                </>
                            : <span>{formatGewicht(ex.grams, notatie)}</span>}
                    </div>
                </div>
            ))}
        />
    );
}
