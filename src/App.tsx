import { useWorksheetStore } from './store/useWorksheetStore';
import Inspector from './components/configurator/Inspector';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import type { Fraction, ClockExercise, MathBlock, FractionExercise } from './services/math/types';
import type { ClockType, ExerciseMode, HandChoice } from './services/clock/clockTypes';
import AnalogClockSVG from './components/viewer/AnalogClockSVG';
import FractionShapeSVG from './components/viewer/FractionShapeSVG';

import { pdf } from '@react-pdf/renderer';
import { WorksheetPDF } from './components/pdf/WorksheetPDF';

import { useState } from 'react';


// ============================================================================
// TYPE GUARDS & FORMATTERS
// ============================================================================

const isFraction = (val: any): val is Fraction => {
  return typeof val === 'object' && val !== null && 'n' in val && 'd' in val;
};

const formatMathNumber = (num: number | string | undefined): string => {
  if (num === undefined || num === '') return '';
  const str = String(num);
  const [integerPart, decimalPart] = str.split('.');

  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  if (decimalPart !== undefined) {
    return `${formattedInteger},${decimalPart}`;
  }
  return formattedInteger;
};

// ============================================================================
// CLOCK EXERCISE RENDERER (preview)
// ============================================================================

function renderClockExerciseItem(ex: ClockExercise, block: MathBlock, showSolutions: boolean): React.ReactElement {
    const clockType = (block.constraints.clockType || 'analoog') as ClockType;
    const exerciseMode = (block.constraints.exerciseMode || 'lezen') as ExerciseMode;
    const is24hour = block.constraints.is24hour || false;
    const handChoice = (block.constraints.handChoice || 'beide') as HandChoice;

    const clock = (showH: boolean, showM: boolean) => (
        <AnalogClockSVG hours={ex.hours} minutes={ex.minutes} showHourHand={showH} showMinuteHand={showM} is24hour={is24hour} size={110} />
    );

    const digitalBox = (
        <div style={{ border: '2px solid #000', padding: '5px 10px', fontFamily: 'monospace', fontSize: '18px', fontWeight: 'bold', letterSpacing: '3px' }}>
            {ex.digitalText}
        </div>
    );

    const timeLabel = (
        <span style={{ fontSize: '13px', fontWeight: 'bold', fontFamily: 'sans-serif', textAlign: 'center' }}>
            {ex.timeText}
        </span>
    );

    const blankLine = <div style={{ borderBottom: '1.5px solid #000', width: '90%', height: '18px' }} />;
    const sol = (text: string) => <span style={{ color: '#e11d48', fontWeight: 'bold', fontSize: '12px' }}>{text}</span>;

    let inner: React.ReactNode;

    if (exerciseMode === 'tekenen') {
        let showH = showSolutions, showM = showSolutions;
        if (!showSolutions) {
            showH = handChoice === 'minuut';
            showM = handChoice === 'uur';
        }
        inner = <>{clockType === 'digitaal' ? digitalBox : timeLabel}{clock(showH, showM)}</>;
    } else if (exerciseMode === 'lezen') {
        const display = clockType === 'analoog' ? clock(true, true) : digitalBox;
        inner = <>{display}{showSolutions ? sol(ex.timeText) : blankLine}</>;
    } else {
        if (clockType === 'analoog') {
            inner = (
                <>
                    {clock(true, true)}
                    {showSolutions
                        ? sol(ex.digitalText)
                        : <div style={{ border: '1.5px solid #000', width: '65px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', fontSize: '12px', color: '#aaa' }}>__:__</div>
                    }
                </>
            );
        } else {
            inner = <>{digitalBox}{showSolutions ? sol(ex.timeText) : blankLine}</>;
        }
    }

    return (
        <div key={ex.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '8px', boxSizing: 'border-box' }}>
            {inner}
        </div>
    );
}

// ============================================================================
// UNIFIED FRACTION EXERCISE RENDERER
// ============================================================================

function renderFractionExercise(ex: FractionExercise, block: MathBlock, showSolutions: boolean): React.ReactElement {
    const subType = ex.subType;
    const answerFormat: string = block.constraints.answerFormat || 'fraction-questions';
    const sol = (text: string) => <span style={{ color: '#e11d48', fontWeight: 'bold', fontSize: '14px' }}>{text}</span>;
    const blank = (w = 40) => <div style={{ borderBottom: '1.5px solid #000', width: `${w}px`, height: '18px', display: 'inline-block', margin: '0 2px' }} />;

    // ── vertical fraction helper ──────────────────────────────────────────────
    const vertFrac = (n: number, d: number, color?: string) => (
        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', fontSize: '13px', fontFamily: 'monospace', fontWeight: 'bold', lineHeight: 1.1, color: color || '#000' }}>
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
                    <div style={{ fontSize: '13px', fontFamily: 'sans-serif', fontWeight: 'bold' }}>
                        Kleur {ex.numerator}/{ex.denominator} in:
                    </div>
                    {shape}
                </div>
            );
        }

        // herkennen — build answer area based on format
        let answerArea: React.ReactNode;
        if (answerFormat === 'fraction-questions') {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%' }}>
                    {shape}
                    <div style={{ fontSize: '12px', fontFamily: 'sans-serif', lineHeight: '1.8', width: '100%' }}>
                        <div>In hoeveel gelijke delen is de figuur verdeeld? {showSolutions ? sol(String(ex.denominator)) : blank(28)}</div>
                        <div>Hoeveel gelijke delen zijn ingekleurd? {showSolutions ? sol(String(ex.numerator)) : blank(28)}</div>
                        <div style={{ marginTop: '4px' }}>
                            {showSolutions
                                ? vertFrac(ex.numerator, ex.denominator, '#e11d48')
                                : <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', fontSize: '13px' }}>
                                    <div style={{ borderBottom: '1.5px solid #000', minWidth: '24px', height: '16px' }} />
                                    <div style={{ minWidth: '24px', height: '16px' }} />
                                  </div>
                            }
                        </div>
                    </div>
                </div>
            );
        } else if (answerFormat === 'phrase') {
            answerArea = (
                <div style={{ fontSize: '12px', fontFamily: 'sans-serif', lineHeight: '2', marginTop: '6px' }}>
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
                <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', marginTop: '8px', fontSize: '20px', fontFamily: 'monospace', fontWeight: 'bold' }}>
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
            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', fontSize: '14px', fontFamily: 'monospace', lineHeight: 1.2 }}>
                <span style={{ borderBottom: '1.5px solid #000', minWidth: '18px', textAlign: 'center', paddingLeft: '4px', paddingRight: '4px' }}>{ex.numerator}</span>
                <span style={{ minWidth: '18px', textAlign: 'center', paddingLeft: '4px', paddingRight: '4px' }}>{ex.denominator}</span>
            </div>
        );

        const questionLine = (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', fontFamily: 'monospace' }}>
                {fracLabel}<span>van {total} =</span>{showSolutions ? sol(String(coloredCount)) : blank()}
            </div>
        );

        const calcLines = (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', fontFamily: 'monospace', marginTop: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    {blank(28)}<span>:</span>{blank(24)}<span>=</span>{blank(28)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    {blank(24)}<span>×</span>{blank(28)}<span>=</span>{blank(28)}
                </div>
            </div>
        );

        // ── Met hulplijnen ──
        if (answerFormat === 'met-hulp') {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    {simpleGrid}
                    {calcLines}
                </div>
            );
        }

        // ── Met breukvragen ──
        if (answerFormat === 'met-breukvragen') {
            const qRow = (question: string, answer: React.ReactNode) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '11px', fontFamily: 'sans-serif', minWidth: '160px' }}>{question}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '13px', fontFamily: 'monospace' }}>{answer}</div>
                </div>
            );
            const instruction = (
                <div style={{ fontSize: '12px', fontFamily: 'sans-serif', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>Verdeel en kleur</span>{vertFrac(ex.numerator, ex.denominator)}<span>van deze hoeveelheid:</span>
                </div>
            );
            return (
                <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                    <div style={{ flexShrink: 0 }}>
                        {instruction}
                        {simpleGrid}
                    </div>
                    <div style={{ flex: 1, marginTop: '18px' }}>
                        {qRow('Hoe groot is het geheel?', blank())}
                        {qRow('In hoeveel gelijke delen verdeel ik?', blank())}
                        {qRow('Hoe groot is één deel?', <>{blank(28)}<span>:</span>{blank(24)}<span>=</span>{blank(28)}</>)}
                        {qRow('Hoeveel gelijke delen neem ik?', blank())}
                        {qRow('Hoeveel is dat samen?', <>{blank(24)}<span>×</span>{blank(28)}<span>=</span>{blank(28)}</>)}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontFamily: 'monospace', marginTop: '4px' }}>
                            {showSolutions ? vertFrac(ex.numerator, ex.denominator, '#e11d48') : vertFrac(ex.numerator, ex.denominator)}
                            <span> van </span>{blank(28)}<span> is </span>{blank(28)}
                        </div>
                    </div>
                </div>
            );
        }

        // ── Zonder hulp ──
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {simpleGrid}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', fontFamily: 'monospace', marginTop: '4px' }}>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontFamily: 'monospace' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontFamily: 'monospace', flexWrap: 'wrap' }}>
                {vertFrac(ex.numerator, ex.denominator)}<span> van {total} is</span>{showSolutions ? sol(String(coloredCount)) : blank(36)}
            </div>
        );

        if (answerMode === 'structuurlijnen') {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {questionLine}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontFamily: 'monospace' }}>
                            {blank(56)}<span>:</span>{blank(56)}<span>=</span>{blank(72)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontFamily: 'monospace' }}>
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

        // berekeningslijnen
        const calcRow = (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontFamily: 'monospace', flexWrap: 'wrap' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', margin: '10px 0' }}>
                <div style={{ width: '2px', height: '16px', backgroundColor: '#000' }} />
                <div style={{ flex: 1, height: '2px', backgroundColor: '#000' }} />
                <div style={{ width: '2px', height: '16px', backgroundColor: '#000' }} />
            </div>
        );

        const instructions = (
            <div style={{ fontSize: '12px', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', gap: '2px' }}>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontFamily: 'monospace' }}>
                            {blank(56)}<span>:</span>{blank(56)}<span>=</span>{blank(72)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontFamily: 'monospace' }}>
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

        // berekeningslijnen (default)
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                {instructions}
                {lineEl}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontFamily: 'monospace', marginTop: '4px' }}>
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
                <div style={{ fontSize: '13px', fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', gap: '4px' }}>
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

// ============================================================================
// HOOFD COMPONENT
// ============================================================================

export default function App() {

  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownloadPDF = async (showSolutions: boolean) => {
    setIsGenerating(true);
    try {
      const fileName = `${headerData.titel || 'Oefenbundel'}${showSolutions ? '_Oplossingen' : ''}.pdf`;
      const doc = <WorksheetPDF blocks={blocks} headerData={headerData} footerData={footerData} showSolutions={showSolutions} docSettings={docSettings} />;
      const blob = await pdf(doc).toBlob();

      if ('showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: fileName,
            types: [{ description: 'PDF-bestand', accept: { 'application/pdf': ['.pdf'] } }],
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
        } catch (saveErr: any) {
          if (saveErr.name !== 'AbortError') throw saveErr;
        }
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('PDF generatie mislukt:', error);
      alert(`PDF generatie mislukt:\n${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const blocks = useWorksheetStore((state) => state.blocks);
  const headerData = useWorksheetStore((state) => state.header);
  const footerData = useWorksheetStore((state) => state.footer);
  const docSettings = useWorksheetStore((state) => state.docSettings);
  const showSolutions = useWorksheetStore((state) => state.showSolutions);
  const activeSelectionId = useWorksheetStore((state) => state.activeBlockId);

  const removeBlock = useWorksheetStore((state) => state.removeBlock);
  const moveBlockUp = useWorksheetStore((state) => state.moveBlockUp);
  const moveBlockDown = useWorksheetStore((state) => state.moveBlockDown);
  const setActiveSelection = useWorksheetStore((state) => state.setActiveSelection);
  const updateExercise = useWorksheetStore((state) => state.updateExercise);

  const totalScore = blocks.reduce((sum, block) => sum + (block.totalPoints || 0), 0);

  const renderTerm = (val: number | Fraction | undefined, isMissing: boolean, blockId: string, exId: string, opIdx: number) => {
    if (val === undefined) return null;

    if (isMissing) {
      if (showSolutions) {
        if (isFraction(val)) {
          const hasWhole = val.whole !== undefined && val.whole > 0;
          return <span style={styles.solutionText}>{hasWhole ? `${val.whole} ${val.n}/${val.d}` : `${val.n}/${val.d}`}</span>;
        }
        return <span style={styles.solutionText}>{formatMathNumber(val)}</span>;
      }
      return <div style={styles.mathDottedLine}></div>;
    }

    if (isFraction(val)) {
      const hasWhole = val.whole !== undefined && val.whole > 0;
      return (
        <div style={{ display: 'inline-flex', alignItems: 'center' }}>
          {hasWhole && <span style={styles.wholeNumberStyle}>{val.whole}</span>}
          <div style={styles.fractionWrapper}>
            <span style={styles.fractionTop}>{val.n}</span>
            <span style={styles.fractionBottom}>{val.d}</span>
          </div>
        </div>
      );
    }

    return (
      <input
        type="text"
        value={formatMathNumber(val)}
        onChange={(e) => {
          const cleanVal = e.target.value.replace(/\s/g, '').replace(',', '.');
          const nVal = Number(cleanVal);
          if (!isNaN(nVal)) {
            const currentEx = blocks.find(b => b.id === blockId)?.exercises.find(ex => ex.id === exId);
            if (currentEx) {
              const newOps = opIdx === 0 ? [nVal, currentEx.operands[1]] : [currentEx.operands[0], nVal];
              updateExercise(blockId, exId, { operands: newOps });
            }
          }
        }}
        style={styles.mathInput}
      />
    );
  };

  const renderGiven = (val: number | Fraction | undefined) => {
    if (val === undefined) return null;
    if (isFraction(val)) {
      const hasWhole = val.whole !== undefined && val.whole > 0;
      return (
        <div style={{ display: 'inline-flex', alignItems: 'center' }}>
          {hasWhole && <span style={styles.wholeNumberStyle}>{val.whole}</span>}
          <div style={styles.fractionWrapper}>
            <span style={styles.fractionTop}>{val.n}</span>
            <span style={styles.fractionBottom}>{val.d}</span>
          </div>
        </div>
      );
    }
    return <span style={{ fontFamily: 'monospace', fontSize: '17px', color: '#000' }}>{formatMathNumber(val as number)}</span>;
  };

  const renderAnswer = (val: number | Fraction | undefined) => {
    if (val === undefined) return null;

    if (isFraction(val)) {
      const hasWhole = val.whole !== undefined && val.whole > 0;
      return (
        <div style={{ display: 'inline-flex', alignItems: 'center', color: '#e11d48', fontWeight: 'bold' }}>
          {hasWhole && <span style={{ ...styles.wholeNumberStyle, color: '#e11d48' }}>{val.whole}</span>}
          <div style={styles.fractionWrapper}>
            <span style={{ ...styles.fractionTop, borderBottomColor: '#e11d48' }}>{val.n}</span>
            <span style={styles.fractionBottom}>{val.d}</span>
          </div>
        </div>
      );
    }
    return <span style={styles.solutionText}>{formatMathNumber(val)}</span>;
  };

  return (
    <div className="print-root" style={styles.appContainer}>
      {/* font inladen voor preview/}
      <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;700&display=swap');
            `}</style>

      {/* =========================================================
                LINKER SIDEBAR
                ========================================================= */}
      <Sidebar />

      {/* =========================================================
                CENTRALE WERKOMGEVING
                ========================================================= */}
      <main style={styles.mainContent} onClick={() => setActiveSelection('document')}>

        <div onClick={(e) => e.stopPropagation()}>
          <TopBar onDownloadPDF={handleDownloadPDF} isGenerating={isGenerating} />
        </div>

        <div className="print-area" style={styles.a4Sheet}>
          <div onClick={(e) => { e.stopPropagation(); setActiveSelection('document'); }} style={styles.clickableZone(activeSelectionId === 'document', '100%', false, docSettings.headerStyle === 'kader')}>
            {docSettings.titlePosition === 'right' ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', flex: 1, marginRight: '16px' }}>
                  {headerData?.naam && <div style={{ display: 'flex', alignItems: 'flex-end', flex: '1 1 200px' }}><span style={styles.sheetHeaderLabel}>Naam:</span><div style={styles.sheetHeaderLine}></div></div>}
                  {headerData?.klas && <div style={{ display: 'flex', alignItems: 'flex-end', width: '90px' }}><span style={styles.sheetHeaderLabel}>Klas:</span><div style={styles.sheetHeaderLine}></div></div>}
                  {headerData?.nummer && <div style={{ display: 'flex', alignItems: 'flex-end', width: '80px' }}><span style={styles.sheetHeaderLabel}>Nr:</span><div style={styles.sheetHeaderLine}></div></div>}
                  {headerData?.datum && <div style={{ display: 'flex', alignItems: 'flex-end', flex: '1 1 140px' }}><span style={styles.sheetHeaderLabel}>Datum:</span><div style={styles.sheetHeaderLine}></div></div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                  {headerData?.titel && <h1 style={{ margin: '0 0 8px 0', fontSize: '22px', fontFamily: 'sans-serif', fontWeight: 'bold', textAlign: 'right' }}>{headerData.titel}</h1>}
                  {docSettings.showScores && totalScore > 0 && <div style={styles.scoreBox}>Score: &nbsp; &nbsp; &nbsp; / {totalScore}</div>}
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', width: '380px' }}>
                    {headerData?.naam && <div style={{ display: 'flex', alignItems: 'flex-end', flex: '1 1 200px' }}><span style={styles.sheetHeaderLabel}>Naam:</span><div style={styles.sheetHeaderLine}></div></div>}
                    {headerData?.klas && <div style={{ display: 'flex', alignItems: 'flex-end', width: '90px' }}><span style={styles.sheetHeaderLabel}>Klas:</span><div style={styles.sheetHeaderLine}></div></div>}
                    {headerData?.nummer && <div style={{ display: 'flex', alignItems: 'flex-end', width: '80px' }}><span style={styles.sheetHeaderLabel}>Nr:</span><div style={styles.sheetHeaderLine}></div></div>}
                    {headerData?.datum && <div style={{ display: 'flex', alignItems: 'flex-end', flex: '1 1 140px' }}><span style={styles.sheetHeaderLabel}>Datum:</span><div style={styles.sheetHeaderLine}></div></div>}
                  </div>
                  {docSettings.showScores && totalScore > 0 && <div style={styles.scoreBox}>Score: &nbsp; &nbsp; &nbsp; / {totalScore}</div>}
                </div>
                {headerData?.titel && (
                  <div style={{ textAlign: 'center', marginBottom: '20px', width: '100%' }}>
                    <h1 style={{ margin: 0, fontSize: '24px', fontFamily: 'sans-serif', fontWeight: 'bold' }}>{headerData.titel}</h1>
                  </div>
                )}
              </>
            )}
          </div>

          <div style={{ width: '100%', marginTop: '12px' }}>
            {blocks.map((block, index) => {
              const isActive = block.id === activeSelectionId;
              const isNotLastBlock = index < blocks.length - 1;

              return (
                <div key={block.id} onClick={(e) => { e.stopPropagation(); setActiveSelection(block.id); }} style={styles.blockContainer(isActive, isNotLastBlock, docSettings.showDividers)}>
                  {isActive && (
                    <div className="no-print" style={styles.blockControls}>
                      {index > 0 && <button onClick={(e) => { e.stopPropagation(); moveBlockUp(block.id); }} style={styles.iconBtn}>↑</button>}
                      {index < blocks.length - 1 && <button onClick={(e) => { e.stopPropagation(); moveBlockDown(block.id); }} style={styles.iconBtn}>↓</button>}
                      <button onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }} style={styles.deleteBtn}>X</button>
                    </div>
                  )}

                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px',
                    ...(docSettings.opdrachtTitelStyle === 'boxed' ? { border: '1.5px solid #000', padding: '4px 8px', borderRadius: '3px' } : {}),
                    ...(docSettings.opdrachtTitelStyle === 'underlined' ? { borderBottom: '2px solid #000', paddingBottom: '4px' } : {}),
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: '12px' }}>
                      {block.instructionMode === 'mag' && <span style={styles.badge('mag')}>MAG</span>}
                      {block.instructionMode === 'moet' && <span style={styles.badge('moet')}>MOET</span>}
                      {block.instructionMode === 'plus' && <span style={styles.badge('plus')}>★</span>}
                      <span style={styles.instructionDisplay}>{block.instructionText || ''}</span>
                    </div>
                    {docSettings.showScores && (block.totalPoints || 0) > 0 && <div style={styles.pointsText}>__ / {block.totalPoints}</div>}
                  </div>

                  {block.typeId.startsWith('klok-') ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: `${block.verticalSpacing || 14}px` }}>
                      {!block.clockExercises || block.clockExercises.length === 0 ? (
                        <div className="no-print" style={styles.emptyStateText}>(Genereer oefeningen via het rechterpaneel)</div>
                      ) : (
                        block.clockExercises.map((ex) => renderClockExerciseItem(ex, block, showSolutions))
                      )}
                    </div>
                  ) : block.typeId === 'breuken' ? (() => {
                    const subType = block.constraints.subType || 'kleuren';
                    const is1Col  = subType === 'lijnstuk' || subType === 'veelhoek' || subType === 'hoeveelheid' || subType === 'hoeveelheid-rechthoek' || subType === 'hoeveelheid-abstract';
                    const exList  = block.fractionExercises || [];
                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: is1Col ? '1fr' : '1fr 1fr', gap: `${block.verticalSpacing || 14}px` }}>
                        {exList.length === 0
                          ? <div className="no-print" style={styles.emptyStateText}>(Genereer oefeningen via het rechterpaneel)</div>
                          : exList.map((ex) => (
                              <div key={ex.id} style={{ display: 'flex', justifyContent: 'center', padding: '8px', boxSizing: 'border-box' }}>
                                {renderFractionExercise(ex, block, showSolutions)}
                              </div>
                            ))
                        }
                      </div>
                    );
                  })() : (
                    <div style={{ display: 'grid', gridTemplateColumns: block.layoutPreset === 'inline-short' ? '1fr 1fr' : '1fr', columnGap: '50px', rowGap: `${block.verticalSpacing || 14}px` }}>
                      {!block.exercises || block.exercises.length === 0 ? (
                        <div className="no-print" style={styles.emptyStateText}>(Genereer oefeningen via het rechterpaneel)</div>
                      ) : (
                        block.exercises.map((ex) => {
                          if (!ex || !ex.operands) return null;

                          // MET REST
                          if (ex.remainder !== undefined) {
                            const helpBlank = <div style={{ borderBottom: '1.5px dotted #000', width: '40px', height: '18px', display: 'inline-block', margin: '0 2px' }} />;
                            const qPart = showSolutions
                              ? <span style={{ color: '#e11d48', fontWeight: 'bold' }}>{formatMathNumber(ex.answer as number)}</span>
                              : <div style={{ borderBottom: '1.5px solid #000', width: '40px', height: '18px', display: 'inline-block' }} />;
                            const rPart = showSolutions
                              ? <span style={{ color: '#e11d48', fontWeight: 'bold' }}>{String(ex.remainder)}</span>
                              : <div style={{ borderBottom: '1.5px solid #000', width: '30px', height: '18px', display: 'inline-block' }} />;
                            return (
                              <div key={ex.id} style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '17px', fontFamily: 'monospace', height: '24px' }}>
                                <span>(</span>{helpBlank}<span>)</span>
                                <span style={{ margin: '0 4px' }}>{formatMathNumber(ex.operands[0] as number)}</span>
                                <span>:</span>
                                <span style={{ margin: '0 4px' }}>{formatMathNumber(ex.operands[1] as number)}</span>
                                <span style={{ margin: '0 4px' }}>=</span>
                                {qPart}
                                <span style={{ margin: '0 4px', fontStyle: 'italic' }}>r</span>
                                {rPart}
                              </div>
                            );
                          }

                          // NORMAL MATH
                          const isMissing1 = ex.missingTerm === 'operand1';
                          const isMissing2 = ex.missingTerm === 'operand2';

                          return (
                            <div key={ex.id} style={styles.exerciseRow}>
                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                <div style={{ width: '85px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                                  {renderTerm(ex.operands[0], isMissing1, block.id, ex.id, 0)}
                                </div>
                                <span style={{ width: '26px', textAlign: 'center', flexShrink: 0 }}>{ex.operator || '+'}</span>
                                <div style={{ width: '85px', display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                                  {renderTerm(ex.operands[1], isMissing2, block.id, ex.id, 1)}
                                </div>
                              </div>

                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginLeft: '8px', gap: `${(block.verticalSpacing || 14) * 0.8}px` }}>
                                {(!isMissing1 && !isMissing2) ? (
                                  Array.from({ length: block.layoutPreset === 'stepped' ? (block.steppedLines || 1) : 1 }).map((_, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'flex-end', width: '100%', height: '32px' }}>
                                      <span style={{ marginRight: '10px', visibility: i === 0 ? 'visible' : 'hidden' }}>=</span>
                                      {(i === 0 && showSolutions) ? renderAnswer(ex.answer) : <div style={styles.workLine(block.layoutPreset)}></div>}
                                    </div>
                                  ))
                                ) : (
                                  <div style={{ display: 'flex', alignItems: 'center', width: '100%', height: '24px' }}>
                                    <span style={{ marginRight: '10px' }}>=</span>
                                    {renderGiven(ex.answer)}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="no-print" style={{ position: 'absolute', top: '1044px', left: 0, right: 0, borderTop: '2px dashed rgba(220,38,38,0.55)', zIndex: 5, pointerEvents: 'none' }}>
            <span style={{ position: 'absolute', right: '12px', top: '-16px', fontSize: '10px', color: 'rgba(220,38,38,0.6)', fontFamily: 'sans-serif', letterSpacing: '0.5px', userSelect: 'none' }}>— paginaeinde —</span>
          </div>

          <div onClick={(e) => { e.stopPropagation(); setActiveSelection('document'); }} style={styles.clickableZone(activeSelectionId === 'document', '100%', true)}>
            <div style={{ fontFamily: 'sans-serif' }}>
              {[
                footerData?.showSchool ? (footerData?.school || 'School') : null,
                footerData?.showKlas ? (footerData?.klas || 'Klas') : null,
                footerData?.showLeerkracht ? (footerData?.leerkracht || 'Leerkracht') : null,
              ].filter(Boolean).join(' | ')}
            </div>
            {footerData?.showPagina && <div style={{ fontFamily: 'sans-serif' }}>Pagina 1</div>}
          </div>
        </div>
      </main>

      <Inspector />
    </div>
  );
}

// ============================================================================
// STYLES
// ============================================================================
const styles = {
  appContainer: { display: 'flex', width: '100vw', height: '100vh', padding: '16px', gap: '16px', overflow: 'hidden', backgroundColor: 'var(--bg-dark)' } as React.CSSProperties,
  mainContent: { position: 'relative', flex: 1, backgroundColor: 'var(--bg-dark)', borderRadius: '12px', overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' } as React.CSSProperties,
  opdrachtSettingsContainer: { position: 'sticky', top: '16px', zIndex: 100, display: 'flex', flexWrap: 'wrap', padding: '16px 24px', width: '100%', maxWidth: '800px', backgroundColor: 'rgba(21, 21, 25, 0.90)', backdropFilter: 'blur(12px)', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '16px', boxSizing: 'border-box', boxShadow: '0 10px 30px rgba(0,0,0,0.6)' } as React.CSSProperties,
  settingsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', width: '100%', alignItems: 'start' } as React.CSSProperties,
  panelLabel: { display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600 } as React.CSSProperties,
  panelInput: { width: '100%', padding: '8px', backgroundColor: '#1a1a1f', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white', outline: 'none', fontSize: '13px', boxSizing: 'border-box' } as React.CSSProperties,
  btnGroup: { display: 'flex', gap: '4px', backgroundColor: '#1a1a1f', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-color)' } as React.CSSProperties,
  panelRadioBtn: (active: boolean): React.CSSProperties => ({ padding: '6px 12px', fontSize: '12px', border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: active ? 'var(--accent-purple)' : 'transparent', color: active ? 'white' : 'var(--text-muted)', fontWeight: active ? 'bold' : 'normal', flex: 1 }),
  panelEmptyState: { width: '100%', padding: '8px 0', fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center' } as React.CSSProperties,
  a4Sheet: { backgroundColor: '#ffffff', color: '#000000', width: '100%', maxWidth: '800px', minHeight: '1130px', height: 'max-content', flex: '0 0 auto', padding: '40px 50px', boxShadow: '0 8px 30px rgba(0,0,0,0.5)', borderRadius: '4px', display: 'flex', flexDirection: 'column', position: 'relative', boxSizing: 'border-box' } as React.CSSProperties,
  sheetHeaderLabel: { fontSize: '13px', fontWeight: 'bold' as const, marginRight: '6px', color: '#000', fontFamily: 'sans-serif' } as React.CSSProperties,
  sheetHeaderLine: { flex: 1, borderBottom: '1.5px solid #000', height: '16px' } as React.CSSProperties,
  scoreBox: { border: '2px solid #000', padding: '8px 14px', fontSize: '15px', fontWeight: 'bold', borderRadius: '4px', fontFamily: 'sans-serif' } as React.CSSProperties,
  clickableZone: (isActive: boolean, width: string, isFooter: boolean = false, hasKader: boolean = false): React.CSSProperties => ({
    display: 'flex', flexDirection: isFooter ? 'row' : 'column', justifyContent: isFooter ? 'space-between' : 'flex-start', width: width, cursor: 'pointer', padding: '12px', borderRadius: '6px', transition: 'all 0.2s', boxSizing: 'border-box',
    backgroundColor: isActive ? 'rgba(155, 48, 255, 0.04)' : 'transparent',
    border: isActive ? '1px dashed var(--accent-purple)' : (hasKader ? '1.5px solid #000' : '1px dashed transparent'),
    ...(isFooter && { marginTop: 'auto', borderTop: isActive ? '1px dashed var(--accent-purple)' : '1px solid #000', paddingTop: '12px', fontSize: '11px', color: '#444' })
  }),
  blockContainer: (isActive: boolean, isNotLastBlock: boolean, showDividers: boolean = true): React.CSSProperties => ({
    padding: '16px', position: 'relative', cursor: 'pointer', borderRadius: '8px', boxSizing: 'border-box', margin: '4px', marginBottom: '12px', transition: 'all 0.2s',
    border: isActive ? '2px dashed var(--accent-purple)' : '2px dashed transparent',
    borderBottom: !isActive && isNotLastBlock && showDividers ? '1px solid #e5e5e5' : (isActive ? '2px dashed var(--accent-purple)' : 'none'),
    backgroundColor: isActive ? 'rgba(155, 48, 255, 0.02)' : 'transparent',
  }),
  blockControls: { position: 'absolute', right: '12px', top: '12px', display: 'flex', gap: '6px', zIndex: 10 } as React.CSSProperties,
  iconBtn: { background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '4px', cursor: 'pointer', padding: '4px 10px', fontSize: '14px', fontWeight: 'bold' } as React.CSSProperties,
  deleteBtn: { background: '#ff4d4d', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', padding: '4px 10px', fontSize: '12px', fontWeight: 'bold' } as React.CSSProperties,
  badge: (type: 'mag' | 'moet' | 'plus'): React.CSSProperties => ({ backgroundColor: type === 'mag' ? '#4ade80' : type === 'moet' ? '#f87171' : '#3b82f6', color: type === 'mag' ? '#14532d' : type === 'moet' ? '#7f1d1d' : '#eff6ff', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', border: type === 'mag' ? '1px solid #22c55e' : type === 'moet' ? '1px solid #ef4444' : '1px solid #2563eb' }),
  instructionDisplay: { fontSize: '16px', fontWeight: 'bold', color: '#000', fontFamily: 'sans-serif' } as React.CSSProperties,
  pointsText: { fontSize: '14px', fontWeight: 'bold', fontFamily: 'sans-serif', marginRight: '24px', color: '#000' } as React.CSSProperties,
  exerciseRow: { display: 'flex', alignItems: 'flex-end', fontSize: '17px', fontFamily: 'monospace' } as React.CSSProperties,
  mathInput: { width: '70px', textAlign: 'center', fontSize: '17px', fontFamily: 'Roboto Mono, monospace', border: '1px solid transparent', background: 'transparent', outline: 'none', color: '#000', padding: 0 } as React.CSSProperties,
  mathDottedLine: { borderBottom: '1.5px dotted #000', width: '40px', margin: '0 6px', display: 'inline-block', height: '16px' } as React.CSSProperties,
  workLine: (layout: string | undefined): React.CSSProperties => ({ borderBottom: '1.5px solid #000', minWidth: '55px', width: layout === 'inline-long' ? '100%' : (layout === 'stepped' ? '100%' : '75px') }),
  solutionText: { color: '#e11d48', fontWeight: 'bold', padding: '0 4px', fontSize: '18px' } as React.CSSProperties,
  fractionWrapper: { display: 'inline-flex', flexDirection: 'column', alignItems: 'center', margin: '0 4px', fontSize: '15px' } as React.CSSProperties,
  fractionTop: { borderBottom: '1.5px solid #000', padding: '0 4px', minWidth: '24px', textAlign: 'center' } as React.CSSProperties,
  fractionBottom: { padding: '0 4px', minWidth: '24px', textAlign: 'center' } as React.CSSProperties,
  wholeNumberStyle: { fontSize: '18px', marginRight: '4px', fontWeight: 'bold', color: '#000' } as React.CSSProperties,
  emptyStateText: { padding: '8px 0', fontStyle: 'italic', color: '#999', fontSize: '14px' } as React.CSSProperties,
};