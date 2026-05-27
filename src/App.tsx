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
import GeldViewer from './components/viewer/GeldViewer';
import GeldTekenenViewer from './components/viewer/GeldTekenenViewer';
import GeldWisselViewer from './components/viewer/GeldWisselViewer';
import GeldTeruggevenViewer from './components/viewer/GeldTeruggevenViewer';
import MabViewer from './components/viewer/MabViewer';
import AlphaPopup from './components/layout/AlphaPopup';
import HelpModal from './components/layout/HelpModal';
import { usePrint } from './hooks/usePrint';
import { styles } from './styles/appStyles';
import { loadAutosave, clearAutosave, decodeShareHash, RELEASE_SEEN_KEY } from './services/persistence';
import { RELEASE_VERSION, RELEASE_SUMMARY } from './config/version';

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
  const toggleBlockLock = useWorksheetStore((state) => state.toggleBlockLock);
  const duplicateBlock = useWorksheetStore((state) => state.duplicateBlock);
  const loadWorksheet = useWorksheetStore((state) => state.loadWorksheet);

  const [helpOpen, setHelpOpen] = useState(false);
  const [autosaveOffer, setAutosaveOffer] = useState<{ savedAt: string; titel: string } | null>(null);
  const [releaseBannerVisible, setReleaseBannerVisible] = useState(false);

  // Boot-time hooks: share-link, autosave-restore offer, release-banner check.
  // Each runs exactly once. Order matters — a shared link wins over an autosave.
  useEffect(() => {
    // 1. Shared link in URL hash.
    const shared = decodeShareHash(window.location.hash);
    if (shared) {
      if (window.confirm('Werkbundel gedeeld via link laden? Huidige werkbundel wordt vervangen.')) {
        loadWorksheet(shared);
      }
      window.history.replaceState(null, '', window.location.pathname);
      return;
    }
    // 2. Auto-save: only offer when current sheet is empty (fresh tab).
    const auto = loadAutosave();
    if (auto && useWorksheetStore.getState().blocks.length === 0) {
      setAutosaveOffer({ savedAt: auto.savedAt, titel: auto.payload.header?.titel || 'Naamloos' });
    }
    // 3. Release banner: shown until user dismisses this exact version.
    try {
      if (localStorage.getItem(RELEASE_SEEN_KEY) !== RELEASE_VERSION) setReleaseBannerVisible(true);
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Browser tab title follows the worksheet title.
  useEffect(() => {
    const t = headerData?.titel?.trim();
    document.title = t ? `${t} — Enderklas Builder` : 'Enderklas Builder';
  }, [headerData?.titel]);

  const acceptAutosave = () => {
    const auto = loadAutosave();
    if (auto) loadWorksheet(auto.payload);
    setAutosaveOffer(null);
  };
  const declineAutosave = () => {
    clearAutosave();
    setAutosaveOffer(null);
  };
  const dismissReleaseBanner = () => {
    try { localStorage.setItem(RELEASE_SEEN_KEY, RELEASE_VERSION); } catch { /* ignore */ }
    setReleaseBannerVisible(false);
  };

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
    <>
    <div className="mobile-block">
      <span>Deze tool werkt enkel op een groot scherm. Kom later nog eens terug.</span>
      <span className="mobile-block-hint">Tip: probeer landscape modus.</span>
    </div>
    <AlphaPopup />
    <div className="print-root" style={styles.appContainer}>
      {/* LEFT SIDEBAR */}
      <div className="no-print"><Sidebar /></div>

      {/* CENTRAL WORK AREA */}
      <main className="print-main" style={styles.mainContent} onClick={() => setActiveSelection('document')}>

        <div className="no-print" onClick={(e) => e.stopPropagation()}>
          <TopBar onPrint={handlePrint} onOpenHelp={() => setHelpOpen(true)} />
        </div>

        {autosaveOffer && (
          <div className="no-print" onClick={(e) => e.stopPropagation()} style={bannerStyles.autosave}>
            <span>📂 Vorige werkbundel ("{autosaveOffer.titel}") gevonden. Terughalen?</span>
            <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
              <button onClick={acceptAutosave} style={bannerStyles.bannerPrimary}>Ja, terughalen</button>
              <button onClick={declineAutosave} style={bannerStyles.bannerSecondary}>Nee, nieuw beginnen</button>
            </div>
          </div>
        )}

        {releaseBannerVisible && (
          <div className="no-print" onClick={(e) => e.stopPropagation()} style={bannerStyles.release}>
            <span>✨ Nieuw: {RELEASE_SUMMARY}. <button onClick={() => setHelpOpen(true)} style={bannerStyles.inlineLink}>Lees meer in Help</button>.</span>
            <button onClick={dismissReleaseBanner} style={bannerStyles.bannerClose} title="Verbergen">×</button>
          </div>
        )}

        <div ref={a4Ref} className="print-area" style={styles.a4Sheet}>
          {/* ── HEADER ── */}
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%', padding: '12px', borderRadius: '6px', boxSizing: 'border-box', border: docSettings.headerStyle === 'kader' ? '1.5px solid #000' : '1px solid transparent' }}>
            {(() => {
              const showScore = docSettings.showScores && totalScore > 0;
              const gap = docSettings.titleFieldsGap ?? 16;
              const topFields = (
                <div style={{ display: 'flex', gap: '16px', width: '100%' }}>
                  {headerData?.naam && <div style={{ display: 'flex', alignItems: 'flex-end', flex: '1 1 200px' }}><span style={styles.sheetHeaderLabel}>Naam:</span><div style={styles.sheetHeaderLine}></div></div>}
                  {headerData?.klas && <div style={{ display: 'flex', alignItems: 'flex-end', width: '90px' }}><span style={styles.sheetHeaderLabel}>Klas:</span><div style={styles.sheetHeaderLine}></div></div>}
                  {headerData?.nummer && <div style={{ display: 'flex', alignItems: 'flex-end', width: '80px' }}><span style={styles.sheetHeaderLabel}>Nr:</span><div style={styles.sheetHeaderLine}></div></div>}
                </div>
              );
              const datumField = headerData?.datum ? (
                <div style={{ display: 'flex', alignItems: 'flex-end', width: '100%' }}>
                  <span style={styles.sheetHeaderLabel}>Datum:</span><div style={styles.sheetHeaderLine}></div>
                </div>
              ) : null;
              const titleScore = (align: 'left' | 'right') => (headerData?.titel || showScore) ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: align === 'right' ? 'flex-end' : 'flex-start', justifyContent: (headerData?.titel && showScore) ? 'space-between' : (!showScore) ? 'center' : 'flex-end', flexShrink: 0, gridColumn: align === 'right' ? '2' : '1', gridRow: '1 / 3' }}>
                  {headerData?.titel && <h1 style={{ margin: 0, fontSize: '22px', fontFamily: 'Azeret Mono, monospace', fontWeight: 'bold', textAlign: align }}>{headerData.titel}</h1>}
                  {showScore && <div style={styles.scoreBox}>Score: &nbsp; &nbsp; &nbsp; / {totalScore}</div>}
                </div>
              ) : null;
              if (docSettings.titlePosition === 'right') return (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', columnGap: `${gap}px`, rowGap: '8px' }}>
                  <div style={{ gridColumn: '1', gridRow: '1', display: 'flex', alignItems: 'flex-end' }}>{topFields}</div>
                  {titleScore('right')}
                  {datumField && <div style={{ gridColumn: '1', gridRow: '2', display: 'flex', alignItems: 'flex-end' }}>{datumField}</div>}
                </div>
              );
              if (docSettings.titlePosition === 'left') return (
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: `${gap}px`, rowGap: '8px' }}>
                  {titleScore('left')}
                  <div style={{ gridColumn: '2', gridRow: '1', display: 'flex', alignItems: 'flex-end' }}>{topFields}</div>
                  {datumField && <div style={{ gridColumn: '2', gridRow: '2', display: 'flex', alignItems: 'flex-end' }}>{datumField}</div>}
                </div>
              );
              // center
              return (
                <>
                  {(headerData?.naam || headerData?.klas || headerData?.nummer) && (
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', marginBottom: '8px' }}>
                      {headerData?.naam && <div style={{ display: 'flex', alignItems: 'flex-end', flex: '1 1 200px' }}><span style={styles.sheetHeaderLabel}>Naam:</span><div style={styles.sheetHeaderLine}></div></div>}
                      {headerData?.klas && <div style={{ display: 'flex', alignItems: 'flex-end', width: '90px' }}><span style={styles.sheetHeaderLabel}>Klas:</span><div style={styles.sheetHeaderLine}></div></div>}
                      {headerData?.nummer && <div style={{ display: 'flex', alignItems: 'flex-end', width: '80px' }}><span style={styles.sheetHeaderLabel}>Nr:</span><div style={styles.sheetHeaderLine}></div></div>}
                    </div>
                  )}
                  {datumField && <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: '8px' }}>{datumField}</div>}
                  {(headerData?.titel || showScore) && (
                    <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '4px' }}>
                      {headerData?.titel && <h1 style={{ margin: 0, fontSize: '24px', fontFamily: 'Azeret Mono, monospace', fontWeight: 'bold', textAlign: 'center' }}>{headerData.titel}</h1>}
                      {showScore && <div style={{ ...styles.scoreBox, position: 'absolute', right: 0 }}>Score: &nbsp; &nbsp; &nbsp; / {totalScore}</div>}
                    </div>
                  )}
                </>
              );
            })()}
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
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleBlockLock(block.id); }}
                        title={block.locked ? 'Ontgrendel (massa-regeneratie zal dit blok wel vernieuwen)' : 'Vergrendel (massa-regeneratie laat dit blok ongemoeid)'}
                        style={styles.iconBtn}
                      >
                        {block.locked ? '🔒' : '🔓'}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); duplicateBlock(block.id); }}
                        title="Blok dupliceren"
                        style={styles.iconBtn}
                      >🗐</button>
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
                      {block.locked && <span className="no-print" title="Vergrendeld" style={{ fontSize: '13px' }}>🔒</span>}
                      <span style={styles.instructionDisplay}>
                          {docSettings.numberBlocks ? `${index + 1}. ` : ''}{block.instructionText || ''}
                      </span>
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
                  ) : block.typeId === 'geld-herkennen' ? (
                    <GeldViewer block={block} showSolutions={showSolutions} />
                  ) : block.typeId === 'geld-tekenen' ? (
                    <GeldTekenenViewer block={block} showSolutions={showSolutions} />
                  ) : block.typeId === 'geld-wissel' ? (
                    <GeldWisselViewer block={block} showSolutions={showSolutions} />
                  ) : block.typeId === 'geld-teruggeven' ? (
                    <GeldTeruggevenViewer block={block} showSolutions={showSolutions} />
                  ) : block.typeId === 'mab-herkennen' ? (
                    <MabViewer block={block} showSolutions={showSolutions} />
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
    {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
    </>
  );
}

const bannerStyles = {
  autosave: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '10px 16px', marginBottom: '12px',
    backgroundColor: 'rgba(155, 48, 255, 0.10)',
    border: '1px solid var(--accent-purple)',
    borderRadius: '8px',
    fontSize: '13px', color: 'var(--text-main)',
    fontFamily: "'Azeret Mono', monospace",
  } as React.CSSProperties,
  release: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '8px 16px', marginBottom: '12px',
    backgroundColor: 'var(--bg-panel)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    fontSize: '12px', color: 'var(--text-muted)',
    fontFamily: "'Azeret Mono', monospace",
  } as React.CSSProperties,
  bannerPrimary: {
    padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 700, fontSize: '12px',
    border: 'none', backgroundColor: 'var(--accent-purple)', color: '#fff',
  } as React.CSSProperties,
  bannerSecondary: {
    padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px',
    border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)',
  } as React.CSSProperties,
  bannerClose: {
    marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)',
    fontSize: '18px', cursor: 'pointer', padding: '0 4px', lineHeight: 1,
  } as React.CSSProperties,
  inlineLink: {
    background: 'none', border: 'none', padding: 0, color: 'var(--accent-purple)',
    textDecoration: 'underline', cursor: 'pointer', font: 'inherit',
  } as React.CSSProperties,
};
