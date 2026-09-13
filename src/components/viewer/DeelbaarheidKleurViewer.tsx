import type { MathBlock, DeelbaarheidKleurExercise } from '../../services/math/types';
import { formatMathNumber } from '../../services/math/formatters';
import FragmentableGrid from './FragmentableGrid';
import type { DeelbaarheidKleurConstraints } from '../../services/math/constraintTypes';
import { SOL, solutionText } from './solutionStyle';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

const mono = "'Azeret Mono', monospace";
const FILL = '#93c5fd';
// Sizes below are factors of the sheet tokens (--sheet-size-math / --sheet-size-text) so print scales with the docSettings sliders.
// SYNC: same "px measured at the 13pt default, scaled by the slider" convention as
// GetallenasViewer / ClockViewer / MabViewer.
const PX_PER_EM_AT_DEFAULT = 17.33;
const em = (px: number) => `${(px / PX_PER_EM_AT_DEFAULT).toFixed(3)}em`;

export default function DeelbaarheidKleurViewer({ block, showSolutions }: Props) {
    const exercises: DeelbaarheidKleurExercise[] = block.deelbaarheidKleurExercises || [];
    const c = block.constraints as DeelbaarheidKleurConstraints;
    const viewModeRaw: string = c.viewMode ?? 'strip';
    // 'raster' used to be its own viewMode; it is now the strip mode's 'rechthoek' shape
    // (C1 step 6), kept accepted here so a block saved before this change still renders —
    // no persistence version bump needed for a value that still means the same thing.
    const legacyRaster = viewModeRaw === 'raster';
    const viewMode = legacyRaster ? 'strip' : viewModeRaw;
    const rasterVorm: string = c.rasterVorm ?? (legacyRaster ? 'rechthoek' : 'lijn');
    const isRechthoek = viewMode === 'strip' && rasterVorm === 'rechthoek';
    const showRest: boolean = (c.showRest ?? false) && !isRechthoek;
    const perRow: number = c.perRow ?? 10;
    const gap = block.verticalSpacing || 14;

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Nog geen oefeningen — klik Genereer)</div>;
    }

    const restLine = (n: number, divisor: number) => (
        <span style={{ fontSize: 'calc(var(--sheet-size-math) * 0.64)', display: 'inline-flex', alignItems: 'flex-end', gap: '2px', marginTop: '2px' }}>
            r={showSolutions ? <span style={{ ...solutionText }}>{n % divisor}</span> : <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '20px', height: '12px' }} />}
        </span>
    );

    return (
        <FragmentableGrid
            cols={1}
            rowGap={gap + 6}
            // Kleurraster ('rechthoek') is a compact grid that reads best centred alone in a
            // ½ column; the strip/markeren forms flow left like a text line and stay put.
            justifyItems={isRechthoek ? 'center' : undefined}
            items={exercises.map(ex => {
                const isMul = (n: number) => n % ex.divisor === 0;

                // ── STRIP / RECHTHOEK: consecutive grid, colour all multiples ──
                // (formerly the standalone 'raster' viewMode; merged into 'strip' as the
                // 'rechthoek' shape — same rendering, `em`-sized instead of fixed px so it
                // follows the Lettergrootte slider.)
                if (isRechthoek) {
                    const cols = ex.cols ?? 10;
                    return (
                        <div key={ex.id} className="print-exercise" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontFamily: mono, fontSize: 'calc(var(--sheet-size-text) * 0.7)' }}>Kleur de veelvouden van {ex.divisor}:</span>
                            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, ${em(42)})`, width: 'fit-content' }}>
                                {ex.numbers.map((num, i) => (
                                    <div key={i} style={{
                                        width: em(42), height: em(28), display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        border: '1px solid #000', boxSizing: 'border-box', fontFamily: mono, fontSize: 'calc(var(--sheet-size-math) * 0.7)',
                                        marginLeft: i % cols === 0 ? 0 : -1, marginTop: i >= cols ? -1 : 0,
                                        backgroundColor: showSolutions && isMul(num) ? FILL : 'white',
                                    }}>{formatMathNumber(num)}</div>
                                ))}
                            </div>
                        </div>
                    );
                }

                // ── MARKEREN: circle the multiples in a row ──
                if (viewMode === 'markeren') {
                    return (
                        <div key={ex.id} className="print-exercise" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontFamily: mono, fontSize: 'calc(var(--sheet-size-text) * 0.7)' }}>Omcirkel de veelvouden van {ex.divisor}:</span>
                            {/* `perRow` columns forced via a fixed grid squeezed the numbers into
                               overlapping text at ½/¼ instead of wrapping (BUGS.md). A flex item's
                               default min-width is its content size, so a flex-basis of 100%/perRow
                               with no shrink gives exactly `perRow` per line when that fits and
                               naturally wraps fewer per line once it doesn't — nowrap only survives
                               when the whole row actually fits. */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', rowGap: '0.6em', columnGap: '6px', fontFamily: mono, fontSize: 'calc(var(--sheet-size-math) * 1)' }}>
                                {ex.numbers.map((num, i) => {
                                    const ring = showSolutions && isMul(num);
                                    return (
                                        <span key={i} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', flex: `0 0 calc(100% / ${perRow})` }}>
                                            <span style={{ padding: '2px 8px', borderRadius: '50%', border: ring ? `2px solid ${SOL}` : '2px solid transparent', color: ring ? SOL : 'inherit' }}>{formatMathNumber(num)}</span>
                                            {showRest && restLine(num, ex.divisor)}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    );
                }

                // ── STRIP / LIJN: colour the multiples in a labelled number strip ──
                return (
                    <div key={ex.id} className="print-exercise" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontFamily: mono, fontSize: 'calc(var(--sheet-size-text) * 0.7)' }}>Kleur de veelvouden van {ex.divisor}:</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: showRest ? '4px' : '0', alignItems: 'flex-start' }}>
                            {ex.numbers.map((num, i) => (
                                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginLeft: showRest || i === 0 ? 0 : -1 }}>
                                    <div style={{
                                        width: em(46), height: em(34), display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        border: '1px solid #000', boxSizing: 'border-box', fontFamily: mono, fontSize: 'calc(var(--sheet-size-math) * 0.81)',
                                        backgroundColor: showSolutions && isMul(num) ? FILL : 'white',
                                    }}>{formatMathNumber(num)}</div>
                                    {showRest && restLine(num, ex.divisor)}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        />
    );
}
