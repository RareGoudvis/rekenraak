export const styles = {
  appContainer: { display: 'flex', width: '100vw', height: '100vh', padding: 'var(--sp-4)', gap: 'var(--sp-4)', overflow: 'hidden', backgroundColor: 'var(--bg-base)' } as React.CSSProperties,
  // Full-width-topbar shell: a column (topbar on top, panels row below).
  appShell: { display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: 'var(--bg-base)' } as React.CSSProperties,
  appBody: { display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' } as React.CSSProperties,
  mainContent: { position: 'relative', flex: 1, backgroundColor: 'var(--bg-base)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' } as React.CSSProperties,
  // Worksheet stays white ink-on-paper (it prints); only the screen-side shadow/radius soften.
  // marginTop clears the sticky topbar so the sheet's full top border is visible (print resets margin:0).
  // height:auto (not max-content): the child is a real <table>, whose intrinsic max-content
  // height is unreliable — the sheet would stop at its basic size while content overflows
  // below the white card. `auto` sizes the sheet to the table's actual laid-out height.
  a4Sheet: { backgroundColor: '#ffffff', color: '#000000', width: '100%', maxWidth: '920px', minHeight: '1130px', height: 'auto', flex: '0 0 auto', marginTop: 'var(--sp-3)', padding: '34px 50px 45px', boxShadow: 'var(--shadow-3)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', position: 'relative', boxSizing: 'border-box' } as React.CSSProperties,
  sheetHeaderLabel: { fontSize: '13px', fontWeight: 'bold' as const, marginRight: '6px', color: '#000', fontFamily: 'Azeret Mono, monospace' } as React.CSSProperties,
  sheetHeaderLine: { flex: 1, borderBottom: '1.5px solid #000', height: '16px' } as React.CSSProperties,
  scoreBox: { border: '2px solid #000', padding: '8px 14px', fontSize: '15px', fontWeight: 'bold', borderRadius: '4px', fontFamily: 'Azeret Mono, monospace' } as React.CSSProperties,
  // Selection is screen-only (cleared before print). Apple-style: soft accent-soft
  // fill + a clean 1px accent ring, not a dashed outline. The #e5e5e5 inter-block
  // divider is left intact — it lives on the white sheet and prints.
  blockContainer: (isActive: boolean, isNotLastBlock: boolean, showDividers: boolean = true, blockSpacing: number = 12): React.CSSProperties => ({
    padding: '16px', position: 'relative', cursor: 'pointer', borderRadius: 'var(--radius-md)', boxSizing: 'border-box', margin: '4px', marginBottom: `${blockSpacing}px`, transition: 'box-shadow var(--dur) var(--ease-out), background-color var(--dur) var(--ease-out)',
    // All four sides as longhand (not `border` shorthand) so toggling only the
    // bottom divider never trips React's shorthand/longhand mix warning.
    borderTop: '1px solid transparent',
    borderLeft: '1px solid transparent',
    borderRight: '1px solid transparent',
    borderBottom: !isActive && isNotLastBlock && showDividers ? '1px solid #e5e5e5' : '1px solid transparent',
    boxShadow: isActive ? '0 0 0 1.5px var(--accent)' : 'none',
    backgroundColor: isActive ? 'var(--accent-soft)' : 'transparent',
  }),
  // paddingLeft (not marginLeft) keeps the controls' hit area touching the block's right edge —
  // no dead gap that would drop the :hover state as the pointer travels to the buttons.
  blockControls: { position: 'absolute', left: '100%', top: '0', paddingLeft: 'var(--sp-2)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)', zIndex: 10 } as React.CSSProperties,
  // Hairline + breathing room that pushes the danger (delete) button clear of the move buttons.
  blockControlsDivider: { height: '1px', alignSelf: 'stretch', backgroundColor: 'var(--separator)', margin: 'var(--sp-2) 4px var(--sp-1)' } as React.CSSProperties,
  iconBtn: { background: 'var(--bg-surface-2)', border: '1px solid var(--separator)', color: 'var(--text-main)', borderRadius: 'var(--radius-xs)', cursor: 'pointer', padding: '4px 10px', fontSize: '14px', fontWeight: 'bold' } as React.CSSProperties,
  deleteBtn: { background: 'var(--danger)', border: 'none', color: 'var(--accent-on)', borderRadius: 'var(--radius-xs)', cursor: 'pointer', padding: '4px 10px', fontSize: '12px', fontWeight: 'bold' } as React.CSSProperties,
  badge: (_type: 'mag' | 'moet' | 'plus' | 'aangepast'): React.CSSProperties => ({ backgroundColor: 'white', color: '#000', padding: '2px 6px', borderRadius: '3px', fontSize: '11px', fontWeight: 'bold', border: '1.5px solid #000' }),
  instructionDisplay: { fontSize: '16px', fontWeight: 'bold', color: '#000', fontFamily: 'Azeret Mono, monospace' } as React.CSSProperties,
  pointsText: { fontSize: '14px', fontWeight: 'bold', fontFamily: 'Azeret Mono, monospace', marginRight: '24px', color: '#000' } as React.CSSProperties,
  emptyStateText: { padding: '8px 0', fontStyle: 'italic', color: '#999', fontSize: '14px' } as React.CSSProperties,
};
