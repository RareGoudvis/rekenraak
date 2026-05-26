import { useState, useRef, useEffect } from 'react';
import { useWorksheetStore } from './store/useWorksheetStore';
import Inspector from './components/configurator/Inspector';
import Sidebar from './components/layout/sidebar';
import TopBar from './components/layout/TopBar';
import ClockExerciseItem from './components/viewer/ClockExerciseItem';
import FractionExerciseItem from './components/viewer/FractionExerciseItem';
import MathBlockRenderer from './components/viewer/MathBlockRenderer';
import SplitsenViewer from './components/viewer/SplitsenViewer';
import CijferViewer from './components/viewer/CijferViewer';
import { usePrint } from './hooks/usePrint';
import { styles } from './styles/appStyles';

export default function App() {
  const a4Ref = useRef<HTMLDivElement>(null);
  const [pageBreaks, setPageBreaks] = useState<number[]>([]);
  const { handlePrint } = usePrint();

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

  const totalScore = blocks.reduce((sum, block) => sum + (block.totalPoints || 0), 0);

  useEffect(() => {
    if (!a4Ref.current) return;
    const PAGE_H = 1044;
    const totalH = a4Ref.current.scrollHeight;
    const breaks: number[] = [];
    let p = PAGE_H;
    while (p < totalH) { breaks.push(p); p += PAGE_H; }
    setPageBreaks(breaks);
  }, [blocks, docSettings]);

  return (
    <div className="print-root" style={styles.appContainer}>
      {/* LEFT SIDEBAR */}
      <div className="no-print"><Sidebar /></div>

      {/* CENTRAL WORK AREA */}
      <main className="print-main" style={styles.mainContent} onClick={() => setActiveSelection('document')}>

        <div className="no-print" onClick={(e) => e.stopPropagation()}>
          <TopBar onPrint={handlePrint} />
        </div>

        <div ref={a4Ref} className="print-area" style={styles.a4Sheet}>
          {/* ── HEADER ── */}
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%', padding: '12px', borderRadius: '6px', boxSizing: 'border-box', border: docSettings.headerStyle === 'kader' ? '1.5px solid #000' : '1px solid transparent' }}>
            {docSettings.titlePosition === 'right' ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', flex: 1, marginRight: `${docSettings.titleFieldsGap ?? 16}px` }}>
                  {headerData?.naam && <div style={{ display: 'flex', alignItems: 'flex-end', flex: '1 1 200px' }}><span style={styles.sheetHeaderLabel}>Naam:</span><div style={styles.sheetHeaderLine}></div></div>}
                  {headerData?.klas && <div style={{ display: 'flex', alignItems: 'flex-end', width: '90px' }}><span style={styles.sheetHeaderLabel}>Klas:</span><div style={styles.sheetHeaderLine}></div></div>}
                  {headerData?.nummer && <div style={{ display: 'flex', alignItems: 'flex-end', width: '80px' }}><span style={styles.sheetHeaderLabel}>Nr:</span><div style={styles.sheetHeaderLine}></div></div>}
                  {headerData?.datum && <div style={{ display: 'flex', alignItems: 'flex-end', flex: '1 1 140px' }}><span style={styles.sheetHeaderLabel}>Datum:</span><div style={styles.sheetHeaderLine}></div></div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                  {headerData?.titel && <h1 style={{ margin: '0 0 8px 0', fontSize: '22px', fontFamily: 'Azeret Mono, monospace', fontWeight: 'bold', textAlign: 'right' }}>{headerData.titel}</h1>}
                  {docSettings.showScores && totalScore > 0 && <div style={styles.scoreBox}>Score: &nbsp; &nbsp; &nbsp; / {totalScore}</div>}
                </div>
              </div>
            ) : docSettings.titlePosition === 'left' ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flexShrink: 0, marginRight: `${docSettings.titleFieldsGap ?? 16}px` }}>
                  {headerData?.titel && <h1 style={{ margin: '0 0 8px 0', fontSize: '22px', fontFamily: 'Azeret Mono, monospace', fontWeight: 'bold', textAlign: 'left' }}>{headerData.titel}</h1>}
                  {docSettings.showScores && totalScore > 0 && <div style={styles.scoreBox}>Score: &nbsp; &nbsp; &nbsp; / {totalScore}</div>}
                </div>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', flex: 1 }}>
                  {headerData?.naam && <div style={{ display: 'flex', alignItems: 'flex-end', flex: '1 1 200px' }}><span style={styles.sheetHeaderLabel}>Naam:</span><div style={styles.sheetHeaderLine}></div></div>}
                  {headerData?.klas && <div style={{ display: 'flex', alignItems: 'flex-end', width: '90px' }}><span style={styles.sheetHeaderLabel}>Klas:</span><div style={styles.sheetHeaderLine}></div></div>}
                  {headerData?.nummer && <div style={{ display: 'flex', alignItems: 'flex-end', width: '80px' }}><span style={styles.sheetHeaderLabel}>Nr:</span><div style={styles.sheetHeaderLine}></div></div>}
                  {headerData?.datum && <div style={{ display: 'flex', alignItems: 'flex-end', flex: '1 1 140px' }}><span style={styles.sheetHeaderLabel}>Datum:</span><div style={styles.sheetHeaderLine}></div></div>}
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
                    <h1 style={{ margin: 0, fontSize: '24px', fontFamily: 'Azeret Mono, monospace', fontWeight: 'bold' }}>{headerData.titel}</h1>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── BLOCKS ── */}
          <div style={{ width: '100%', marginTop: `${docSettings.headerContentGap ?? 12}px` }}>
            {blocks.map((block, index) => {
              const isActive = block.id === activeSelectionId;
              const isNotLastBlock = index < blocks.length - 1;

              return (
                <div key={block.id} className="print-block" onClick={(e) => { e.stopPropagation(); setActiveSelection(block.id); }} style={styles.blockContainer(isActive, isNotLastBlock, docSettings.showDividers)}>
                  {isActive && (
                    <div className="no-print" style={styles.blockControls}>
                      {index > 0 && <button onClick={(e) => { e.stopPropagation(); moveBlockUp(block.id); }} style={styles.iconBtn}>↑</button>}
                      {index < blocks.length - 1 && <button onClick={(e) => { e.stopPropagation(); moveBlockDown(block.id); }} style={styles.iconBtn}>↓</button>}
                      <button onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }} style={styles.deleteBtn}>🗑</button>
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
                      {block.instructionMode === 'aangepast' && block.customInstructionText && <span style={styles.badge('aangepast')}>{block.customInstructionText}</span>}
                      <span style={styles.instructionDisplay}>{block.instructionText || ''}</span>
                    </div>
                    {docSettings.showScores && (block.totalPoints || 0) > 0 && <div style={styles.pointsText}>__ / {block.totalPoints}</div>}
                  </div>

                  {block.typeId.startsWith('klok-') ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: `${block.verticalSpacing || 14}px` }}>
                      {!block.clockExercises || block.clockExercises.length === 0
                        ? <div className="no-print" style={styles.emptyStateText}>(Genereer oefeningen via het rechterpaneel)</div>
                        : block.clockExercises.map((ex) => <ClockExerciseItem key={ex.id} ex={ex} block={block} showSolutions={showSolutions} />)
                      }
                    </div>
                  ) : block.typeId === 'splitsen' ? (
                    <SplitsenViewer block={block} showSolutions={showSolutions} />
                  ) : block.typeId.startsWith('cijferen-') ? (
                    <CijferViewer block={block} showSolutions={showSolutions} />
                  ) : block.typeId === 'breuken' ? (() => {
                    const subType = block.constraints.subType || 'kleuren';
                    const answerFmt = block.constraints.answerFormat as string | undefined;
                    const is1Col = subType === 'lijnstuk' || subType === 'veelhoek' || (subType === 'hoeveelheid' && answerFmt === 'met-breukvragen');
                    const exList = block.fractionExercises || [];
                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: is1Col ? '1fr' : '1fr 1fr', gap: `${block.verticalSpacing || 14}px` }}>
                        {exList.length === 0
                          ? <div className="no-print" style={styles.emptyStateText}>(Genereer oefeningen via het rechterpaneel)</div>
                          : exList.map((ex) => (
                              <div key={ex.id} style={{ display: 'flex', justifyContent: 'center', padding: '8px', boxSizing: 'border-box' }}>
                                <FractionExerciseItem ex={ex} block={block} showSolutions={showSolutions} />
                              </div>
                            ))
                        }
                      </div>
                    );
                  })() : (
                    <MathBlockRenderer block={block} showSolutions={showSolutions} />
                  )}
                </div>
              );
            })}
          </div>

          {/* ── PAGE BREAK INDICATORS ── */}
          {pageBreaks.map((y) => (
            <div key={y} className="no-print" style={{ position: 'absolute', top: `${y}px`, left: 0, right: 0, borderTop: '2px dashed rgba(220,38,38,0.55)', zIndex: 5, pointerEvents: 'none' }}>
              <span style={{ position: 'absolute', right: '12px', top: '-16px', fontSize: '10px', color: 'rgba(220,38,38,0.6)', fontFamily: 'Azeret Mono, monospace', letterSpacing: '0.5px', userSelect: 'none' }}>— paginaeinde —</span>
            </div>
          ))}
        </div>

        {/* PRINT FOOTER */}
        <div className="print-footer-bar" style={{ fontFamily: "'Azeret Mono', monospace" }}>
          <span>
            {[
              footerData?.showSchool     ? (footerData.school      || 'School')     : null,
              footerData?.showKlas       ? (footerData.klas        || 'Klas')       : null,
              footerData?.showLeerkracht ? (footerData.leerkracht  || 'Leerkracht') : null,
            ].filter(Boolean).join(' | ')}
          </span>
          {footerData?.showPagina && <span>Pagina 1</span>}
        </div>
      </main>

      {/* RIGHT INSPECTOR */}
      <div className="no-print"><Inspector /></div>
    </div>
  );
}
