import { useWorksheetStore } from './store/useWorksheetStore';
import Inspector from './components/configurator/Inspector';
import { APP_STRUCTURE } from './config/appstructure';
import type { Fraction } from './services/math/types';
import logo from './assets/enderklas-logo.png';

// 🔥 NIEUW: Importeer de PDF generator en je PDF component
import { PDFDownloadLink } from '@react-pdf/renderer';
import { WorksheetPDF } from './components/pdf/WorksheetPDF';

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
// HOOFD COMPONENT
// ============================================================================

export default function App() {
  const blocks = useWorksheetStore((state) => state.blocks);
  const headerData = useWorksheetStore((state) => state.header);
  const footerData = useWorksheetStore((state) => state.footer);
  const showSolutions = useWorksheetStore((state) => state.showSolutions);
  const activeSelectionId = useWorksheetStore((state) => state.activeBlockId);

  const activeBlock = blocks.find(b => b.id === activeSelectionId);

  const addBlockFromType = useWorksheetStore((state) => state.addBlockFromType);
  const removeBlock = useWorksheetStore((state) => state.removeBlock);
  const moveBlockUp = useWorksheetStore((state) => state.moveBlockUp);
  const moveBlockDown = useWorksheetStore((state) => state.moveBlockDown);
  const setActiveSelection = useWorksheetStore((state) => state.setActiveSelection);
  const updateBlockInstruction = useWorksheetStore((state) => state.updateBlockInstruction);
  const updateBlockLayout = useWorksheetStore((state) => state.updateBlockLayout);
  const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);
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

      {/* =========================================================
                LINKER SIDEBAR
                ========================================================= */}
      <aside style={styles.leftSidebar}>
        <div style={styles.sidebarHeader}>
          <div style={{ ...styles.logoPlaceholder, padding: '5px', overflow: 'hidden' }}>
            <img src={logo} alt="Enderklas Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <h2 style={styles.sidebarTitle}>Enderklas Builder</h2>
          <p style={styles.sidebarSubtitle}>Basisonderwijs Vlaanderen</p>
        </div>

        <hr style={styles.divider} />

        <div style={styles.sidebarContent}>
          {APP_STRUCTURE.map((domain) => (
            <div key={domain.id} style={{ marginBottom: '24px' }}>
              <h3 style={styles.domainTitle}>{domain.label}</h3>
              {domain.subdomains.map((subdomain) => (
                <div key={subdomain.id} style={{ marginBottom: '16px' }}>
                  <h4 style={styles.subdomainTitle}>{subdomain.label}</h4>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {subdomain.types.map((type) => (
                      <li key={type.id}>
                        <button onClick={() => addBlockFromType(type.id, type.label)} style={styles.selectorBtn}>
                          + {type.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div style={styles.sidebarFooter}>
          <button onClick={() => setActiveSelection('document')} style={styles.settingsBtn}>
            Algemene Instellingen
          </button>

          {/* 🔥 DIT GENEREERT DE PDF VIA DE ENGINE */}
          <PDFDownloadLink
            document={<WorksheetPDF blocks={blocks} headerData={headerData} footerData={footerData} showSolutions={false} />}
            fileName={`${headerData.titel || 'Oefenbundel'}.pdf`}
            style={{ textDecoration: 'none' }}
          >
            {({ loading }) => (
              <button style={styles.printBtnPrimary} disabled={loading}>
                {loading ? '⏳ PDF genereren...' : 'Download oefenbundel'}
              </button>
            )}
          </PDFDownloadLink>

          <PDFDownloadLink
            document={<WorksheetPDF blocks={blocks} headerData={headerData} footerData={footerData} showSolutions={true} />}
            fileName={`${headerData.titel || 'Oefenbundel'}_Oplossingen.pdf`}
            style={{ textDecoration: 'none' }}
          >
            {({ loading }) => (
              <button style={styles.printBtnSecondary} disabled={loading}>
                {loading ? '⏳ PDF genereren...' : 'Download oplossingen'}
              </button>
            )}
          </PDFDownloadLink>
        </div>
      </aside>

      {/* =========================================================
                CENTRALE WERKOMGEVING
                ========================================================= */}
      <main style={styles.mainContent}>

        <div className="no-print opdracht-settings-panel" style={styles.opdrachtSettingsContainer}>
          {activeBlock ? (
            <div style={styles.settingsGrid}>
              <div>
                <label style={styles.panelLabel}>Opdracht Titel:</label>
                <input type="text" value={activeBlock.instructionText || ''} onChange={(e) => updateBlockInstruction(activeBlock.id, e.target.value)} style={styles.panelInput} />
              </div>
              <div>
                <label style={styles.panelLabel}>Instructie Modus:</label>
                <div style={styles.btnGroup}>
                  {(['geen', 'mag', 'moet'] as const).map(mode => (
                    <button key={mode} onClick={() => updateBlockSettings(activeBlock.id, { instructionMode: mode })} style={styles.panelRadioBtn(activeBlock.instructionMode === mode || (!activeBlock.instructionMode && mode === 'geen'))}>
                      {mode === 'geen' ? 'Geen' : mode.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={styles.panelLabel}>Weergave Stijl:</label>
                <div style={styles.btnGroup}>
                  {(['inline-short', 'inline-long', 'stepped'] as const).map(layout => (
                    <button key={layout} onClick={() => updateBlockLayout(activeBlock.id, layout)} style={styles.panelRadioBtn(activeBlock.layoutPreset === layout)}>
                      {layout === 'inline-short' ? 'Kort' : layout === 'inline-long' ? 'Lang' : 'Stappen'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={styles.panelLabel}>Aantal Oefeningen:</label>
                <input type="number" min="1" value={activeBlock.numberOfExercises || 10} onChange={(e) => updateBlockSettings(activeBlock.id, { numberOfExercises: Number(e.target.value) })} style={styles.panelInput} />
              </div>
              <div>
                <label style={styles.panelLabel}>Punten:</label>
                <input type="number" step="0.5" min="0" value={activeBlock.totalPoints || 0} onChange={(e) => updateBlockSettings(activeBlock.id, { totalPoints: Number(e.target.value) })} style={styles.panelInput} />
              </div>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <label style={styles.panelLabel}>Spatiëring ({activeBlock.verticalSpacing || 14}px):</label>
                  <input type="range" min="8" max="40" value={activeBlock.verticalSpacing || 14} onChange={(e) => updateBlockSettings(activeBlock.id, { verticalSpacing: Number(e.target.value) })} style={{ width: '100%', accentColor: 'var(--accent-purple)' }} />
                </div>
                {activeBlock.layoutPreset === 'stepped' && (
                  <div style={{ width: '60px' }}>
                    <label style={styles.panelLabel}>Lijntjes:</label>
                    <input type="number" min="1" max="10" value={activeBlock.steppedLines || 3} onChange={(e) => updateBlockSettings(activeBlock.id, { steppedLines: Number(e.target.value) })} style={styles.panelInput} />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={styles.panelEmptyState}>Selecteer een oefeningenblok op het blad om de Opdrachtinstellingen te activeren.</div>
          )}
        </div>

        <div className="print-area" style={styles.a4Sheet}>
          <div onClick={(e) => { e.stopPropagation(); setActiveSelection('document'); }} style={styles.clickableZone(activeSelectionId === 'document', '100%')}>
            {headerData?.titel && (
              <div style={{ textAlign: 'center', marginBottom: '32px', width: '100%' }}>
                <h1 style={{ margin: 0, fontSize: '24px', fontFamily: 'sans-serif', fontWeight: 'bold' }}>{headerData.titel}</h1>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', width: '380px' }}>
                {headerData?.naam && <div style={{ display: 'flex', alignItems: 'flex-end', flex: '1 1 200px' }}><span style={styles.sheetHeaderLabel}>Naam:</span><div style={styles.sheetHeaderLine}></div></div>}
                {headerData?.klas && <div style={{ display: 'flex', alignItems: 'flex-end', width: '90px' }}><span style={styles.sheetHeaderLabel}>Klas:</span><div style={styles.sheetHeaderLine}></div></div>}
                {headerData?.nummer && <div style={{ display: 'flex', alignItems: 'flex-end', width: '80px' }}><span style={styles.sheetHeaderLabel}>Nr:</span><div style={styles.sheetHeaderLine}></div></div>}
                {headerData?.datum && <div style={{ display: 'flex', alignItems: 'flex-end', flex: '1 1 140px' }}><span style={styles.sheetHeaderLabel}>Datum:</span><div style={styles.sheetHeaderLine}></div></div>}
              </div>
              {totalScore > 0 && <div style={styles.scoreBox}>Score: &nbsp; &nbsp; &nbsp; / {totalScore}</div>}
            </div>
          </div>

          <div style={{ width: '100%', marginTop: '12px' }}>
            {blocks.map((block, index) => {
              const isActive = block.id === activeSelectionId;
              const isNotLastBlock = index < blocks.length - 1;

              return (
                <div key={block.id} onClick={(e) => { e.stopPropagation(); setActiveSelection(block.id); }} style={styles.blockContainer(isActive, isNotLastBlock)}>
                  {isActive && (
                    <div className="no-print" style={styles.blockControls}>
                      {index > 0 && <button onClick={(e) => { e.stopPropagation(); moveBlockUp(block.id); }} style={styles.iconBtn}>↑</button>}
                      {index < blocks.length - 1 && <button onClick={(e) => { e.stopPropagation(); moveBlockDown(block.id); }} style={styles.iconBtn}>↓</button>}
                      <button onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }} style={styles.deleteBtn}>X</button>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: '12px' }}>
                      {block.instructionMode === 'mag' && <span style={styles.badge('mag')}>MAG</span>}
                      {block.instructionMode === 'moet' && <span style={styles.badge('moet')}>MOET</span>}
                      <span style={styles.instructionDisplay}>{block.instructionText || ''}</span>
                    </div>
                    {(block.totalPoints || 0) > 0 && <div style={styles.pointsText}>__ / {block.totalPoints}</div>}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: block.layoutPreset === 'inline-short' ? '1fr 1fr' : '1fr', columnGap: '50px', rowGap: `${block.verticalSpacing || 14}px` }}>
                    {!block.exercises || block.exercises.length === 0 ? (
                      <div className="no-print" style={styles.emptyStateText}>(Genereer oefeningen via het rechterpaneel)</div>
                    ) : (
                      block.exercises.map((ex) => {
                        if (!ex || !ex.operands) return null;
                        const isMissing1 = ex.missingTerm === 'operand1';
                        const isMissing2 = ex.missingTerm === 'operand2';
                        const isFrac = isFraction(ex.operands[0]);

                        return (
                          <div key={ex.id} style={styles.exerciseRow}>
                            <div style={{ display: 'flex', alignItems: 'center', minWidth: '150px', height: isFrac ? '40px' : '24px' }}>
                              {renderTerm(ex.operands[0], isMissing1, block.id, ex.id, 0)}
                              <span style={{ margin: '0 6px' }}>{ex.operator || '+'}</span>
                              {renderTerm(ex.operands[1], isMissing2, block.id, ex.id, 1)}
                            </div>

                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginLeft: '8px', gap: `${(block.verticalSpacing || 14) * 0.8}px` }}>
                              {(!isMissing1 && !isMissing2) ? (
                                Array.from({ length: block.layoutPreset === 'stepped' ? (block.steppedLines || 1) : 1 }).map((_, i) => (
                                  <div key={i} style={{ display: 'flex', alignItems: 'center', width: '100%', height: '24px', marginTop: i === 0 && isFrac ? '8px' : '0' }}>
                                    <span style={{ marginRight: '10px', visibility: i === 0 ? 'visible' : 'hidden' }}>=</span>
                                    {(i === 0 && showSolutions) ? renderAnswer(ex.answer) : <div style={styles.workLine(block.layoutPreset)}></div>}
                                  </div>
                                ))
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', width: '100%', height: '24px', marginTop: isFrac ? '8px' : '0' }}>
                                  <span style={{ marginRight: '10px' }}>=</span>
                                  {renderAnswer(ex.answer)}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div onClick={(e) => { e.stopPropagation(); setActiveSelection('document'); }} style={styles.clickableZone(activeSelectionId === 'document', '100%', true)}>
            <div style={{ fontFamily: 'sans-serif' }}>{footerData?.school || 'School'} &nbsp;|&nbsp; {footerData?.klas || 'Klas'} &nbsp;|&nbsp; {footerData?.leerkracht || 'Leerkracht'}</div>
            {/* Dit blijft hier voor de preview. In de PDF regelt WorksheetPDF.tsx de paginanummers! */}
            <div style={{ fontFamily: 'sans-serif' }}>Pagina 1</div>
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
  leftSidebar: { width: '280px', minWidth: '280px', backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '12px', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' } as React.CSSProperties,
  sidebarHeader: { padding: '24px 20px 16px 20px' } as React.CSSProperties,
  logoPlaceholder: { width: '100%', height: '75px', border: '0px dashed var(--border-color)', borderRadius: '0px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', backgroundColor: 'var(--bg-panel)' } as React.CSSProperties,
  logoText: { fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold', letterSpacing: '1px' } as React.CSSProperties,
  sidebarTitle: { margin: 0, fontSize: '18px', color: 'var(--text-main)', fontWeight: 700 } as React.CSSProperties,
  sidebarSubtitle: { margin: '4px 0 0 0', fontSize: '12px', color: 'var(--accent-purple)', fontWeight: 600 } as React.CSSProperties,
  divider: { border: 'none', height: '1px', backgroundColor: 'var(--border-color)', margin: '0 20px' } as React.CSSProperties,
  sidebarContent: { flex: 1, overflowY: 'auto', padding: '20px' } as React.CSSProperties,
  domainTitle: { fontSize: '14px', textTransform: 'uppercase', color: 'var(--accent-purple)', letterSpacing: '1px', margin: '0 0 12px 0', fontWeight: 700 } as React.CSSProperties,
  subdomainTitle: { fontSize: '14px', color: 'var(--text-main)', margin: '0 0 8px 0', fontWeight: 600 } as React.CSSProperties,
  selectorBtn: { width: '100%', textAlign: 'left', background: 'none', border: 'none', color: 'var(--text-muted)', padding: '6px 8px 6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s' } as React.CSSProperties,
  sidebarFooter: { padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.1)' } as React.CSSProperties,
  settingsBtn: { width: '100%', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', backgroundColor: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border-color)' } as React.CSSProperties,
  printBtnPrimary: { width: '100%', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', border: 'none', backgroundColor: '#ffffff', color: '#111115' } as React.CSSProperties,
  printBtnSecondary: { width: '100%', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', border: 'none', backgroundColor: 'var(--accent-purple)', color: '#ffffff' } as React.CSSProperties,
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
  clickableZone: (isActive: boolean, width: string, isFooter: boolean = false): React.CSSProperties => ({
    display: 'flex', flexDirection: isFooter ? 'row' : 'column', justifyContent: isFooter ? 'space-between' : 'flex-start', width: width, cursor: 'pointer', padding: '12px', borderRadius: '6px', transition: 'all 0.2s', boxSizing: 'border-box',
    backgroundColor: isActive ? 'rgba(155, 48, 255, 0.04)' : 'transparent', border: isActive ? '1px dashed var(--accent-purple)' : '1px dashed transparent',
    ...(isFooter && { marginTop: 'auto', borderTop: isActive ? '1px dashed var(--accent-purple)' : '1px solid #000', paddingTop: '12px', fontSize: '11px', color: '#444' })
  }),
  blockContainer: (isActive: boolean, isNotLastBlock: boolean): React.CSSProperties => ({
    padding: '16px', position: 'relative', cursor: 'pointer', borderRadius: '8px', boxSizing: 'border-box', margin: '4px', marginBottom: '12px', transition: 'all 0.2s',
    border: isActive ? '2px dashed var(--accent-purple)' : '2px dashed transparent',
    borderBottom: !isActive && isNotLastBlock ? '1px solid #e5e5e5' : (isActive ? '2px dashed var(--accent-purple)' : 'none'),
    backgroundColor: isActive ? 'rgba(155, 48, 255, 0.02)' : 'transparent',
  }),
  blockControls: { position: 'absolute', right: '12px', top: '12px', display: 'flex', gap: '6px', zIndex: 10 } as React.CSSProperties,
  iconBtn: { background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '4px', cursor: 'pointer', padding: '4px 10px', fontSize: '14px', fontWeight: 'bold' } as React.CSSProperties,
  deleteBtn: { background: '#ff4d4d', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', padding: '4px 10px', fontSize: '12px', fontWeight: 'bold' } as React.CSSProperties,
  badge: (type: 'mag' | 'moet'): React.CSSProperties => ({ backgroundColor: type === 'mag' ? '#4ade80' : '#f87171', color: type === 'mag' ? '#14532d' : '#7f1d1d', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', border: type === 'mag' ? '1px solid #22c55e' : '1px solid #ef4444' }),
  instructionDisplay: { fontSize: '16px', fontWeight: 'bold', color: '#000', fontFamily: 'sans-serif' } as React.CSSProperties,
  pointsText: { fontSize: '14px', fontWeight: 'bold', fontFamily: 'sans-serif', marginRight: '24px', color: '#000' } as React.CSSProperties,
  exerciseRow: { display: 'flex', alignItems: 'flex-start', fontSize: '17px', fontFamily: 'monospace' } as React.CSSProperties,
  mathInput: { width: '70px', textAlign: 'center', fontSize: '17px', fontFamily: 'monospace', border: '1px solid transparent', background: 'transparent', outline: 'none', color: '#000', padding: 0 } as React.CSSProperties,
  mathDottedLine: { borderBottom: '1.5px dotted #000', width: '40px', margin: '0 6px', display: 'inline-block', height: '16px' } as React.CSSProperties,
  workLine: (layout: string | undefined): React.CSSProperties => ({ borderBottom: '1.5px solid #000', minWidth: '55px', width: layout === 'inline-long' ? '100%' : (layout === 'stepped' ? '100%' : '75px') }),
  solutionText: { color: '#e11d48', fontWeight: 'bold', padding: '0 4px', fontSize: '18px' } as React.CSSProperties,
  fractionWrapper: { display: 'inline-flex', flexDirection: 'column', alignItems: 'center', margin: '0 4px', fontSize: '15px' } as React.CSSProperties,
  fractionTop: { borderBottom: '1.5px solid #000', padding: '0 4px', minWidth: '24px', textAlign: 'center' } as React.CSSProperties,
  fractionBottom: { padding: '0 4px', minWidth: '24px', textAlign: 'center' } as React.CSSProperties,
  wholeNumberStyle: { fontSize: '18px', marginRight: '4px', fontWeight: 'bold', color: '#000' } as React.CSSProperties,
  emptyStateText: { padding: '8px 0', fontStyle: 'italic', color: '#999', fontSize: '14px' } as React.CSSProperties,
};