import type { FractionExercise, MathBlock } from '../../services/math/types';
import FractionShapeSVG from './FractionShapeSVG';

interface Props {
    ex: FractionExercise;
    block: MathBlock;
    showSolutions: boolean;
}

export default function FractionExerciseItem({ ex, block, showSolutions }: Props) {
    const subType = ex.subType;
    const answerFormat: string = block.constraints.answerFormat || 'fraction-questions';
    const sol = (text: string) => <span style={{ color: '#e11d48', fontWeight: 'bold', fontSize: '14px' }}>{text}</span>;
    const blank = (w = 40) => <div style={{ borderBottom: '1.5px solid #000', width: `${w}px`, height: '18px', display: 'inline-block', margin: '0 2px' }} />;

    const vertFrac = (n: number, d: number, color?: string) => (
        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', fontSize: '13px', fontFamily: 'Azeret Mono, monospace', fontWeight: 'bold', lineHeight: 1.1, color: color || '#000' }}>
            <span style={{ borderBottom: `1.5px solid ${color || '#000'}`, minWidth: '16px', textAlign: 'center', paddingLeft: '3px', paddingRight: '3px' }}>{n}</span>
            <span style={{ minWidth: '16px', textAlign: 'center', paddingLeft: '3px', paddingRight: '3px' }}>{d}</span>
        </div>
    );

    // ── SHAPE-BASED (kleuren / herkennen) ────────────────────────────────────
    if (subType === 'kleuren' || subType === 'herkennen') {
        const showColored = subType === 'herkennen';
        const shape = (
            <FractionShapeSVG
                numerator={ex.numerator} denominator={ex.denominator}
                shape={ex.shape ?? 'rectangle'} coloredIndices={ex.coloredIndices ?? []}
                gridRows={ex.gridRows ?? 1} gridCols={ex.gridCols ?? ex.denominator}
                showColored={showColored} cellSize={38}
            />
        );

        if (subType === 'kleuren') {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontFamily: 'Azeret Mono, monospace', fontWeight: 'bold' }}>
                        <span>Kleur</span>
                        {vertFrac(ex.numerator, ex.denominator)}
                        <span>in:</span>
                    </div>
                    <div style={{ minHeight: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {shape}
                    </div>
                </div>
            );
        }

        // herkennen — build answer area based on format
        let answerArea: React.ReactNode;
        if (answerFormat === 'fraction-questions') {
            const qLine = (text: string, answer: React.ReactNode) => (
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '4px' }}>
                    <span>{text}</span>
                    {answer}
                </div>
            );
            return (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%' }}>
                    <div style={{ minHeight: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {shape}
                    </div>
                    <div style={{ fontSize: '12px', fontFamily: 'Azeret Mono, monospace', width: '100%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {qLine('In hoeveel gelijke delen is de figuur verdeeld?', showSolutions ? sol(String(ex.denominator)) : blank(28))}
                        {qLine('Hoeveel gelijke delen zijn ingekleurd?', showSolutions ? sol(String(ex.numerator)) : blank(28))}
                    </div>
                </div>
            );
        } else if (answerFormat === 'phrase') {
            answerArea = (
                <div style={{ fontSize: '12px', fontFamily: 'Azeret Mono, monospace', lineHeight: '2', marginTop: '6px' }}>
                    <div>
                        Er zijn {showSolutions ? sol(String(ex.numerator)) : <span style={{ borderBottom: '1.5px solid #000', display: 'inline-block', width: '24px' }}>&nbsp;</span>} van de{' '}
                        {ex.denominator} gelijke delen gekleurd. Dat is{' '}
                        {showSolutions ? vertFrac(ex.numerator, ex.denominator, '#e11d48')
                            : <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', fontSize: '13px', verticalAlign: 'middle' }}>
                                <div style={{ borderBottom: '1.5px solid #000', minWidth: '24px', height: '16px' }} />
                                <div style={{ minWidth: '24px', height: '16px' }} />
                              </div>
                        }.
                    </div>
                </div>
            );
        } else if (answerFormat === 'blank-fraction') {
            answerArea = (
                <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', marginTop: '8px', fontSize: '20px', fontFamily: 'Azeret Mono, monospace', fontWeight: 'bold' }}>
                    <div style={{ borderBottom: '2px solid #000', minWidth: '32px', textAlign: 'center', paddingBottom: '2px', color: showSolutions ? '#e11d48' : 'transparent' }}>{ex.numerator}</div>
                    <div style={{ minWidth: '32px', textAlign: 'center', paddingTop: '2px', color: showSolutions ? '#e11d48' : 'transparent' }}>{ex.denominator}</div>
                </div>
            );
        } else {
            answerArea = <div style={{ marginTop: '8px' }}>{showSolutions ? sol(`${ex.numerator}/${ex.denominator}`) : blank(80)}</div>;
        }

        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '100%' }}>
                {shape}
                {answerArea}
            </div>
        );
    }

    // ── AMOUNT CONCREET (hoeveelheid) ───────────────────────────────────────
    if (subType === 'hoeveelheid') {
        const total = ex.total ?? 0;
        const coloredCount = Math.round(total * ex.numerator / ex.denominator);
        const objSize = 22, objGap = 4, perRow = 10;

        const objEl = (idx: number, colored: boolean) => ex.objectShape === 'circle'
            ? <svg key={idx} width={objSize} height={objSize}><circle cx={objSize/2} cy={objSize/2} r={objSize/2-1.5} fill={colored ? '#93c5fd' : 'white'} stroke="#000" strokeWidth={1.5}/></svg>
            : <svg key={idx} width={objSize} height={objSize}><rect x={1.5} y={1.5} width={objSize-3} height={objSize-3} fill={colored ? '#93c5fd' : 'white'} stroke="#000" strokeWidth={1.5}/></svg>;

        const simpleGrid = (
            <div style={{ display: 'flex', flexDirection: 'column', gap: `${objGap}px` }}>
                {Array.from({ length: Math.ceil(total / perRow) }, (_, r) => (
                    <div key={r} style={{ display: 'flex', gap: `${objGap}px` }}>
                        {Array.from({ length: Math.min(perRow, total - r * perRow) }, (_, c) => {
                            const idx = r * perRow + c;
                            return objEl(idx, showSolutions && idx < coloredCount);
                        })}
                    </div>
                ))}
            </div>
        );

        const fracLabel = (
            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', fontSize: '14px', fontFamily: 'Azeret Mono, monospace', lineHeight: 1.2 }}>
                <span style={{ borderBottom: '1.5px solid #000', minWidth: '18px', textAlign: 'center', paddingLeft: '4px', paddingRight: '4px' }}>{ex.numerator}</span>
                <span style={{ minWidth: '18px', textAlign: 'center', paddingLeft: '4px', paddingRight: '4px' }}>{ex.denominator}</span>
            </div>
        );

        const questionLine = (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', fontFamily: 'Azeret Mono, monospace' }}>
                {fracLabel}<span>van {total} =</span>{showSolutions ? sol(String(coloredCount)) : blank()}
            </div>
        );

        const calcLines = (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', fontFamily: 'Azeret Mono, monospace', marginTop: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    {blank(28)}<span>:</span>{blank(24)}<span>=</span>{blank(28)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    {blank(24)}<span>×</span>{blank(28)}<span>=</span>{blank(28)}
                </div>
            </div>
        );

        const gridWrap = (
            <div style={{ minHeight: '52px', display: 'flex', alignItems: 'center' }}>
                {simpleGrid}
            </div>
        );

        if (answerFormat === 'met-hulp') {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', minHeight: '52px' }}>
                        {simpleGrid}
                    </div>
                    {calcLines}
                </div>
            );
        }

        if (answerFormat === 'met-breukvragen') {
            const qRow = (question: string, answer: React.ReactNode) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '11px', fontFamily: 'Azeret Mono, monospace', width: '195px', flexShrink: 0 }}>{question}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '13px', fontFamily: 'Azeret Mono, monospace' }}>{answer}</div>
                </div>
            );
            const instruction = (
                <div style={{ fontSize: '12px', fontFamily: 'Azeret Mono, monospace', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>Verdeel en kleur</span>{vertFrac(ex.numerator, ex.denominator)}<span>van deze hoeveelheid:</span>
                </div>
            );
            return (
                <div style={{ display: 'flex', gap: '16px', width: '100%' }}>
                    <div style={{ flexShrink: 0 }}>
                        {instruction}
                        {gridWrap}
                    </div>
                    <div style={{ flex: 1, marginTop: '18px' }}>
                        {qRow('Hoe groot is het geheel?', blank())}
                        {qRow('In hoeveel gelijke delen verdeel ik?', blank())}
                        {qRow('Hoe groot is één deel?', <>{blank(28)}<span>:</span>{blank(24)}<span>=</span>{blank(28)}</>)}
                        {qRow('Hoeveel gelijke delen neem ik?', blank())}
                        {qRow('Hoeveel is dat samen?', <>{blank(24)}<span>×</span>{blank(28)}<span>=</span>{blank(28)}</>)}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontFamily: 'Azeret Mono, monospace', marginTop: '4px' }}>
                            {showSolutions ? vertFrac(ex.numerator, ex.denominator, '#e11d48') : vertFrac(ex.numerator, ex.denominator)}
                            <span> van </span>{blank(28)}<span> is </span>{blank(28)}
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '52px' }}>
                    {simpleGrid}
                </div>
                {questionLine}
                <div style={{ borderBottom: '1.5px solid #000', width: '100%', height: '20px' }} />
                <div style={{ borderBottom: '1.5px solid #000', width: '100%', height: '20px' }} />
            </div>
        );
    }

    // ── AMOUNT RECHTHOEK (hoeveelheid-rechthoek) ─────────────────────────────
    if (subType === 'hoeveelheid-rechthoek') {
        const total = ex.total ?? 0;
        const rectCalcLines = (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', fontFamily: 'Azeret Mono, monospace', marginTop: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    {blank(28)}<span>:</span>{blank(24)}<span>=</span>{blank(28)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    {blank(24)}<span>×</span>{blank(28)}<span>=</span>{blank(28)}
                </div>
            </div>
        );
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontFamily: 'Azeret Mono, monospace' }}>
                    {vertFrac(ex.numerator, ex.denominator)}<span> van {total} =</span>{blank()}
                </div>
                <div style={{ border: '2px solid #000', width: '100%', minHeight: '113px', backgroundColor: 'white' }} />
                {answerFormat === 'met-berekening' && rectCalcLines}
            </div>
        );
    }

    // ── AMOUNT ABSTRACT (hoeveelheid-abstract) ───────────────────────────────
    if (subType === 'hoeveelheid-abstract') {
        const total = ex.total ?? 0;
        const groupSize = parseFloat((total / ex.denominator).toFixed(4));
        const coloredCount = parseFloat((groupSize * ex.numerator).toFixed(4));
        const answerMode: string = block.constraints.answerMode ?? 'berekeningslijnen';
        const sv = (v: number) => showSolutions ? sol(String(v)) : blank(28);

        const questionLine = (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontFamily: 'Azeret Mono, monospace', flexWrap: 'wrap' }}>
                {vertFrac(ex.numerator, ex.denominator)}<span> van {total} is</span>{showSolutions ? sol(String(coloredCount)) : blank(36)}
            </div>
        );

        if (answerMode === 'structuurlijnen') {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {questionLine}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontFamily: 'Azeret Mono, monospace' }}>
                            {blank(56)}<span>:</span>{blank(56)}<span>=</span>{blank(72)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontFamily: 'Azeret Mono, monospace' }}>
                            {blank(56)}<span>×</span>{blank(56)}<span>=</span>{blank(72)}
                        </div>
                    </div>
                </div>
            );
        }

        if (answerMode === 'blanco') {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {questionLine}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <div style={{ borderBottom: '1.5px solid #000', width: '227px', height: '22px' }} />
                        <div style={{ borderBottom: '1.5px solid #000', width: '227px', height: '22px' }} />
                    </div>
                </div>
            );
        }

        const calcRow = (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontFamily: 'Azeret Mono, monospace', flexWrap: 'wrap' }}>
                {sv(total)}<span>:</span>{sv(ex.denominator)}<span>=</span>{sv(groupSize)}
                <span style={{ margin: '0 6px' }}>en</span>
                {sv(ex.numerator)}<span>×</span>{sv(groupSize)}<span>=</span>{showSolutions ? sol(String(coloredCount)) : blank(28)}
            </div>
        );
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {questionLine}
                {calcRow}
            </div>
        );
    }

    // ── LIJNSTUK ─────────────────────────────────────────────────────────────
    if (subType === 'lijnstuk') {
        const cm = ex.lineLength ?? 10;
        const answerMode: string = block.constraints.answerMode ?? 'berekeningslijnen';
        const partLength = parseFloat((cm / ex.denominator).toFixed(2));
        const arcLength  = parseFloat((partLength * ex.numerator).toFixed(2));

        const lineEl = (
            <div style={{ width: `${cm * 38}px`, display: 'flex', alignItems: 'center', margin: '10px 0' }}>
                <div style={{ width: '2px', height: '16px', backgroundColor: '#000' }} />
                <div style={{ flex: 1, height: '2px', backgroundColor: '#000' }} />
                <div style={{ width: '2px', height: '16px', backgroundColor: '#000' }} />
            </div>
        );

        const instructions = (
            <div style={{ fontSize: '12px', fontFamily: 'Azeret Mono, monospace', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span>Verdeel het lijnstuk in gelijke delen.</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Teken een boogje boven{' '}
                    <span style={{ display: 'inline-flex', verticalAlign: 'middle' }}>{vertFrac(ex.numerator, ex.denominator)}</span>
                    {' '}van het lijnstuk.
                </span>
            </div>
        );

        if (answerMode === 'structuurlijnen') {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                    {instructions}
                    {lineEl}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontFamily: 'Azeret Mono, monospace' }}>
                            {blank(56)}<span>:</span>{blank(56)}<span>=</span>{blank(72)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontFamily: 'Azeret Mono, monospace' }}>
                            {blank(56)}<span>×</span>{blank(56)}<span>=</span>{blank(72)}
                        </div>
                    </div>
                </div>
            );
        }

        if (answerMode === 'blanco') {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                    {instructions}
                    {lineEl}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <div style={{ borderBottom: '1.5px solid #000', width: '227px', height: '22px' }} />
                        <div style={{ borderBottom: '1.5px solid #000', width: '227px', height: '22px' }} />
                    </div>
                </div>
            );
        }

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                {instructions}
                {lineEl}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', fontSize: '13px', fontFamily: 'Azeret Mono, monospace', marginTop: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        {showSolutions ? sol(String(cm)) : blank(28)}<span>:</span>{showSolutions ? sol(String(ex.denominator)) : blank(24)}<span>=</span>{showSolutions ? sol(String(partLength)) : blank(28)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        {showSolutions ? sol(String(ex.numerator)) : blank(24)}<span>×</span>{showSolutions ? sol(String(partLength)) : blank(28)}<span>=</span>{showSolutions ? sol(String(arcLength)) : blank(28)}
                    </div>
                </div>
            </div>
        );
    }

    // ── VEELHOEK ─────────────────────────────────────────────────────────────
    if (subType === 'veelhoek') {
        const w = ex.rectangleWidth ?? 3;
        const h = ex.rectangleHeight ?? 3;
        const cellSize = 32;
        const totalCells = w * h;
        const cellsPerPart = totalCells / ex.denominator;

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                <div style={{ fontSize: '13px', fontFamily: 'Azeret Mono, monospace', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Verdeel en kleur <span style={{ display: 'inline-flex' }}>{vertFrac(ex.numerator, ex.denominator)}</span> van deze figuur.
                </div>
                <div style={{ outline: '3px solid #000', width: 'fit-content' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${w}, ${cellSize}px)` }}>
                        {Array.from({ length: totalCells }, (_, i) => (
                            <div key={i} style={{
                                width: `${cellSize}px`, height: `${cellSize}px`,
                                border: '0.5px solid #93c5fd', boxSizing: 'border-box',
                                backgroundColor: showSolutions && i < cellsPerPart * ex.numerator ? '#93c5fd' : 'white',
                            }} />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return <></>;
}
