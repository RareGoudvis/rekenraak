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
  // The sheet column owns the top bar, so both scroll/size independently of the panels.
  centreColumn: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100%' } as React.CSSProperties,
  a4Sheet: { backgroundColor: '#ffffff', color: '#000000', width: '100%', maxWidth: '920px', minHeight: '1130px', height: 'auto', flex: '0 0 auto', marginTop: 'var(--sp-3)', padding: '34px 50px 45px', boxShadow: 'var(--shadow-3)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', position: 'relative', boxSizing: 'border-box' } as React.CSSProperties,
  sheetHeaderLabel: { fontSize: '13px', fontWeight: 700 as const, marginRight: '6px', color: '#000', fontFamily: 'var(--font-sheet-text)' } as React.CSSProperties,
  sheetHeaderLine: { flex: 1, borderBottom: '1.5px solid #000', height: '16px' } as React.CSSProperties,
  scoreBox: { border: '2px solid #000', padding: '8px 14px', fontSize: '15px', fontWeight: 'bold', borderRadius: '4px', fontFamily: 'Azeret Mono, monospace' } as React.CSSProperties,
  // Selection is screen-only (cleared before print). Apple-style: soft accent-soft
  // fill + a clean 1px accent ring, not a dashed outline. The #e5e5e5 inter-block
  // divider is left intact — it lives on the white sheet and prints.
  blockContainer: (isActive: boolean, isNotLastBlock: boolean, showDividers: boolean = true, blockSpacing: number = 12): React.CSSProperties => ({
    // Vertical padding only, no horizontal inset: an opdracht kader has to line up with
    // the koptekst and voettekst kaders, which sit on the page's 53px content edge. The
    // old 16px padding + 4px margin + 1px border pushed it 21px in on each side.
    // It also makes cellWidthPx() honest — it always returned the full cell width.
    padding: '16px 0', position: 'relative', cursor: 'pointer', borderRadius: 'var(--radius-md)', boxSizing: 'border-box', margin: '4px 0', marginBottom: `${blockSpacing}px`, transition: 'box-shadow var(--dur) var(--ease-out), background-color var(--dur) var(--ease-out)',
    // All four sides as longhand (not `border` shorthand) so toggling only the
    // bottom divider never trips React's shorthand/longhand mix warning.
    borderTop: '1px solid transparent',
    borderLeft: '0 solid transparent',
    borderRight: '0 solid transparent',
    borderBottom: !isActive && isNotLastBlock && showDividers ? '1px solid #e5e5e5' : '1px solid transparent',
    // Selection sits just OUTSIDE the block so the opdracht kader is not hugged by the
    // fill, but the content stays on the page's content edge (padding would move it and
    // break the kader's alignment with the koptekst). Hence an outset shadow: a 1.5px
    // 1px hairline on the edge, then 6px of pale tint beyond it. The tint does the work;
    // the outline only has to mark where the block ends.
    //
    // Order matters. The ring is listed FIRST so it paints on top; --accent-soft is only
    // 12% alpha, so a soft band listed first would let the solid ring read straight
    // through it and the whole thing reads as one thick blue border.
    boxShadow: isActive
      ? '0 0 0 1px var(--accent), 0 0 0 7px var(--accent-soft)'
      : 'none',
    backgroundColor: isActive ? 'var(--accent-soft)' : 'transparent',
  }),
  // paddingLeft (not marginLeft) keeps the controls' hit area touching the block's right edge —
  // no dead gap that would drop the :hover state as the pointer travels to the buttons.
  // paddingLeft clears the 5px selection halo (see blockContainer) and still leaves the
  // 34px button inside the sheet's 53px side margin.
  blockControls: { position: 'absolute', left: '100%', top: '0', paddingLeft: 'var(--sp-3)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)', zIndex: 10 } as React.CSSProperties,
  // Hairline + breathing room that pushes the danger (delete) button clear of the move buttons.
  blockControlsDivider: { height: '1px', alignSelf: 'stretch', backgroundColor: 'var(--separator)', margin: 'var(--sp-2) 4px var(--sp-1)' } as React.CSSProperties,
  iconBtn: { background: 'var(--bg-surface-2)', border: '1px solid var(--separator)', color: 'var(--text-main)', borderRadius: 'var(--radius-xs)', cursor: 'pointer', padding: '4px 10px', fontSize: '14px', fontWeight: 'bold' } as React.CSSProperties,
  deleteBtn: { background: 'var(--danger)', border: 'none', color: 'var(--accent-on)', borderRadius: 'var(--radius-xs)', cursor: 'pointer', padding: '4px 10px', fontSize: '12px', fontWeight: 'bold' } as React.CSSProperties,
  badge: (_type: 'mag' | 'moet' | 'plus' | 'aangepast'): React.CSSProperties => ({ backgroundColor: 'white', color: '#000', padding: '2px 6px', borderRadius: '3px', fontSize: '11px', fontWeight: 'bold', border: '1.5px solid #000' }),
  instructionDisplay: { fontSize: '16px', fontWeight: 700, color: '#000', fontFamily: 'var(--font-sheet-text)' } as React.CSSProperties,
  pointsText: { fontSize: '14px', fontWeight: 'bold', fontFamily: 'Azeret Mono, monospace', marginRight: '24px', color: '#000' } as React.CSSProperties,
  emptyStateText: { padding: '8px 0', fontStyle: 'italic', color: '#999', fontSize: '14px' } as React.CSSProperties,
  // Cold-load hero shown only when blocks.length === 0. Lives ON the white A4 sheet, so
  // it uses ink colors (not theme --text-* tokens, which go white-on-white in dark mode);
  // --accent stays readable on white across all three themes. no-print hides it on paper.
  heroEmpty: { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '80px 24px 64px', color: '#1a1a1a' } as React.CSSProperties,
  heroTitle: { margin: 0, fontSize: '26px', lineHeight: 1.25, fontWeight: 'bold', fontFamily: 'Azeret Mono, monospace', color: '#1a1a1a', maxWidth: '600px' } as React.CSSProperties,
  heroPitch: { margin: '16px 0 0', fontSize: '16px', lineHeight: 1.5, color: '#555', maxWidth: '480px' } as React.CSSProperties,
  heroBullets: { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px 20px', margin: '28px 0 0', padding: 0, listStyle: 'none' } as React.CSSProperties,
  heroBullet: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 600, color: '#333' } as React.CSSProperties,
  heroHint: { margin: '36px 0 0', fontSize: '13px', fontStyle: 'italic', color: '#999', maxWidth: '420px' } as React.CSSProperties,
};
