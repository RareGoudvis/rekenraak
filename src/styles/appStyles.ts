// Sheet entries below (scoreBox/badge/instructionDisplay/pointsText) are factors of the
// sheet tokens (--sheet-size-math / --sheet-size-text) so print scales with the docSettings
// sliders; app-chrome entries (appContainer, panels, hero*) are untouched screen sizing.
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
  scoreBox: { border: '2px solid #000', padding: '8px 14px', fontSize: 'calc(var(--sheet-size-math) * 0.87)', fontWeight: 'bold', borderRadius: '4px', fontFamily: 'Azeret Mono, monospace' } as React.CSSProperties,
  // Selection is screen-only (cleared before print). Apple-style: soft accent-soft
  // fill + a clean 1px accent ring, not a dashed outline. The #e5e5e5 inter-block
  // divider is left intact — it lives on the white sheet and prints.
  // blockSpacing is the GRID's gap, not the block's: adding it here too doubled every
  // gutter and the packer only ever budgeted one of them.
  blockContainer: (isActive: boolean, isNotLastBlock: boolean, showDividers: boolean = true): React.CSSProperties => ({
    // Vertical padding only, no horizontal inset: an opdracht kader has to line up with
    // the koptekst and voettekst kaders, which sit on the page's 53px content edge. The
    // old 16px padding + 4px margin + 1px border pushed it 21px in on each side.
    // It also makes cellWidthPx() honest — it always returned the full cell width.
    padding: '16px 0', position: 'relative', cursor: 'pointer', borderRadius: 'var(--radius-md)', boxSizing: 'border-box', margin: '4px 0', transition: 'box-shadow var(--dur) var(--ease-out), background-color var(--dur) var(--ease-out)',
    // All four sides as longhand (not `border` shorthand) so toggling only the
    // bottom divider never trips React's shorthand/longhand mix warning.
    borderTop: '1px solid transparent',
    borderLeft: '0 solid transparent',
    borderRight: '0 solid transparent',
    borderBottom: !isActive && isNotLastBlock && showDividers ? '1px solid #e5e5e5' : '1px solid transparent',
    // Selection sits just OUTSIDE the block so the opdracht kader is not hugged by the
    // fill, but the content stays on the page's content edge (padding would move it and
    // break the kader's alignment with the koptekst). Hence an outset shadow: a 1.5px
    // Tint only, no outline. The soft fill plus its halo already separates the block from
    // the white page; a ring on top of that just draws a hard blue box around the work.
    //
    // Order matters. The ring is listed FIRST so it paints on top; --accent-soft is only
    // 12% alpha, so a soft band listed first would let the solid ring read straight
    // through it and the whole thing reads as one thick blue border.
    boxShadow: isActive ? '0 0 0 7px var(--accent-soft)' : 'none',
    backgroundColor: isActive ? 'var(--accent-soft)' : 'transparent',
  }),
  // BlockControlsRail portals to <body> and positions itself with `position: fixed` off
  // the block's own getBoundingClientRect (top/left set inline, per-instance) — that's
  // what keeps the rail out of .page-sheet-body's overflow:hidden when the block sits at
  // the bottom of the page. Only top/left vary per block; the box itself stays here.
  blockControls: { position: 'fixed', display: 'flex', flexDirection: 'column', gap: '4px', zIndex: 50 } as React.CSSProperties,
  // Hairline + breathing room between the rail's three groups (drag/lock/duplicate/split,
  // page-break/up/down, delete) — kept tight so nine compact buttons don't read as tall
  // as a second toolbar.
  blockControlsDivider: { height: '1px', alignSelf: 'stretch', backgroundColor: 'var(--separator)', margin: '3px 2px' } as React.CSSProperties,
  iconBtn: { background: 'var(--bg-surface-2)', border: '1px solid var(--separator)', color: 'var(--text-main)', borderRadius: 'var(--radius-xs)', cursor: 'pointer', padding: '4px 10px', fontSize: '14px', fontWeight: 'bold' } as React.CSSProperties,
  deleteBtn: { background: 'var(--danger)', border: 'none', color: 'var(--accent-on)', borderRadius: 'var(--radius-xs)', cursor: 'pointer', padding: '4px 10px', fontSize: '12px', fontWeight: 'bold' } as React.CSSProperties,
  badge: (_type: 'mag' | 'moet' | 'plus' | 'aangepast'): React.CSSProperties => ({ backgroundColor: 'white', color: '#000', padding: '2px 6px', borderRadius: '3px', fontSize: 'calc(var(--sheet-size-text) * 0.55)', fontWeight: 'bold', border: '1.5px solid #000' }),
  // The owner wants the opdracht title bigger: it now sits at the base text token (1x), not a fraction of it.
  // fontSize is INHERITED from the .print-opdracht container (App.tsx), which is where the
  // Blad tab's "Tekengrootte" slider writes — a size of its own here silently beat the
  // slider. The container's default is the same var(--sheet-size-text) it used to set.
  instructionDisplay: { fontSize: 'inherit', fontWeight: 700, color: '#000', fontFamily: 'var(--font-sheet-text)' } as React.CSSProperties,
  pointsText: { fontSize: 'calc(var(--sheet-size-math) * 0.81)', fontWeight: 'bold', fontFamily: 'Azeret Mono, monospace', marginRight: '24px', color: '#000' } as React.CSSProperties,
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
