// The left sidebar's inline styles, shared by the editor's sidebar and the Oefenmodus catalogue.

export const S = {
    aside: { width: '286px', minWidth: '286px', borderRight: '1px solid var(--separator)', height: '100%', display: 'flex', flexDirection: 'column' } as React.CSSProperties,
    headerCol: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sp-2)', padding: 'var(--sp-3) var(--sp-4)', color: 'var(--text-main)' } as React.CSSProperties,
    // Negative margin so the hover fill pads the wordmark without nudging it.
    logoBtn: { background: 'transparent', border: 'none', padding: '2px 4px', margin: '-2px -4px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'inline-flex' } as React.CSSProperties,
    divider: { border: 'none', height: '1px', backgroundColor: 'var(--separator)', margin: '0 var(--sp-4)' } as React.CSSProperties,
    tabSwitch: { margin: '0 var(--sp-4) var(--sp-2)' } as React.CSSProperties,
    previewCard: { position: 'fixed', zIndex: 400, width: '290px', background: 'var(--bg-surface)', border: '1px solid var(--separator)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-2)', padding: 'var(--sp-2)', pointerEvents: 'none' } as React.CSSProperties,
    previewLabel: { fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px', padding: '0 2px' } as React.CSSProperties,
    searchWrap: { padding: 'var(--sp-2) var(--sp-4)', display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' } as React.CSSProperties,
    gradeWrap: { padding: '0 var(--sp-4) var(--sp-2)' } as React.CSSProperties,
    searchInput: {
        flex: 1, padding: '6px 12px 6px 30px', fontSize: 'var(--text-sm)', fontFamily: 'inherit',
        backgroundColor: 'var(--bg-surface-2)', border: '1px solid var(--separator)', borderRadius: 'var(--radius-sm)',
        color: 'var(--text-main)', outline: 'none', boxSizing: 'border-box',
    } as React.CSSProperties,
    searchIcon: { position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' } as React.CSSProperties,
    noResults: { padding: 'var(--sp-3) var(--sp-5)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', fontStyle: 'italic' } as React.CSSProperties,
    navArea: { flex: 1, overflowY: 'auto', padding: 'var(--sp-2) var(--sp-1)' } as React.CSSProperties,
    // Truncate long nav labels with an ellipsis instead of colliding with the chevron.
    navText: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 } as React.CSSProperties,

    brandFoot: {
        flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'var(--sp-3)', border: 'none', borderTop: '1px solid var(--separator)',
        background: 'transparent', cursor: 'pointer', lineHeight: 0,
    } as React.CSSProperties,

    // SYNC: padding/font match leafBtn so a mode button is exactly one sidebar row tall.
    modeRow: { flex: 'none', display: 'flex', gap: 'var(--sp-1)', padding: 'var(--sp-1) var(--sp-2)', borderTop: '1px solid var(--separator)' } as React.CSSProperties,
    modeBtn: {
        flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--sp-2)',
        // Same chrome as the TopBar's secondary IconButtons (Menu, Bewaren): a
        // bordered box, so these read as buttons and not as two labels.
        background: 'var(--bg-surface)', border: '1px solid var(--separator)', borderRadius: 'var(--radius-sm)', height: 'var(--control-h)', padding: '0 10px',
        color: 'var(--text-main)', fontSize: 'var(--text-sm)', fontFamily: 'inherit', fontWeight: 600,
        cursor: 'pointer', whiteSpace: 'nowrap',
    } as React.CSSProperties,

    lockedPalette: { flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 } as React.CSSProperties,
    lockedBanner: { margin: 'var(--sp-1) var(--sp-4) var(--sp-2)', padding: 'var(--sp-2) var(--sp-3)', fontSize: 'var(--text-xs)', lineHeight: 1.4, color: 'var(--text-main)', background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-md)' } as React.CSSProperties,
    lockedListTitle: { padding: 'var(--sp-1) var(--sp-4)', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-muted)' } as React.CSSProperties,

    domainWrap: { marginBottom: 'var(--sp-3)' } as React.CSSProperties,

    // Domain section header — tinted band on the same rail that runs down the domain's
    // contents, so the band and the list read as one bracket. No dot: the rail already
    // carries the hue and the word already carries the domain, and a third marker for
    // the same fact is noise. The label stays normal text — orange or green on a 10%
    // tint of itself is unreadable (UI-GUIDE rule 7).
    sectionHeader: (soft: string, line: string): React.CSSProperties => ({
        display: 'flex', alignItems: 'center', gap: 'var(--sp-2)',
        padding: '6px 10px', margin: 'var(--sp-1) var(--sp-1) var(--sp-2) var(--sp-3)',
        borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
        borderLeft: `3px solid ${line}`,
        backgroundColor: soft,
        color: 'var(--text-main)', fontSize: 'var(--text-sm)', fontWeight: 700, letterSpacing: '0.01em',
    }),

    // Left rail in the domain tint: everything indented past it belongs to the domain
    // named directly above, so the grouping survives scrolling past the header.
    domainContent: (line: string): React.CSSProperties => ({
        paddingLeft: 'var(--sp-2)', marginLeft: 'var(--sp-3)', borderLeft: `3px solid ${line}`,
    }),

    // How many addable exercises sit under this header — depth without scrolling.
    countBadge: {
        flexShrink: 0, marginLeft: 'auto', padding: '0 6px', minWidth: '20px', textAlign: 'center',
        borderRadius: 'var(--radius-pill)', backgroundColor: 'var(--bg-surface-2)',
        color: 'var(--text-muted)', fontSize: 'var(--text-xs)', fontWeight: 600, lineHeight: '17px',
    } as React.CSSProperties,

    subdomainBtn: (open: boolean, _accent: string, placeholder?: boolean): React.CSSProperties => ({
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-1)',
        padding: '9px 12px', cursor: 'pointer', border: 'none', background: 'none',
        color: open && !placeholder ? 'var(--text-main)' : 'var(--text-muted)',
        fontSize: 'var(--text-sm)', fontWeight: 600, textAlign: 'left',
        transition: 'color var(--dur) var(--ease-out)',
        opacity: placeholder ? 0.45 : 1,
    }),
    subdomainContent: { paddingLeft: 'var(--sp-1)' } as React.CSSProperties,

    typeBtn: (open: boolean, _accent: string): React.CSSProperties => ({
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px', cursor: 'pointer', border: 'none', background: 'none',
        color: open ? 'var(--text-main)' : 'var(--text-muted)',
        fontSize: 'var(--text-sm)', fontWeight: 500, textAlign: 'left',
        transition: 'color var(--dur) var(--ease-out)',
    }),
    typeContent: { paddingLeft: 'var(--sp-1)' } as React.CSSProperties,

    // Hover (rounded fill + text lift) lives in index.css under .sidebar-leaf.
    leafBtn: {
        width: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--sp-2)',
        textAlign: 'left', background: 'none', border: 'none',
        color: 'var(--text-muted)', padding: '7px 10px', margin: '1px 6px',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer', fontSize: 'var(--text-sm)',
    } as React.CSSProperties,
    addBadge: {
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: '18px', height: '18px', borderRadius: 'var(--radius-xs)',
        backgroundColor: 'var(--bg-surface-2)', border: '1px solid var(--separator)',
        fontSize: '13px', fontWeight: 700, lineHeight: 1, flexShrink: 0, color: 'var(--text-muted)',
    } as React.CSSProperties,
    chevron: (open: boolean): React.CSSProperties => ({
        fontSize: '16px', lineHeight: 1, color: 'var(--text-muted)', flexShrink: 0,
        transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
        transition: 'transform var(--dur) var(--ease-out)', display: 'inline-block',
    }),

    placeholderLeaf: {
        width: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--sp-2)',
        textAlign: 'left', padding: '7px 10px', margin: '1px 6px',
        fontSize: 'var(--text-sm)', color: 'var(--text-muted)', opacity: 0.5, cursor: 'default',
    } as React.CSSProperties,
    placeholderBadge: {
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: '18px', height: '18px', borderRadius: 'var(--radius-xs)',
        backgroundColor: 'var(--bg-surface-2)', border: '1px solid var(--separator)',
        fontSize: '13px', fontWeight: 700, lineHeight: 1, flexShrink: 0, color: 'var(--text-muted)',
    } as React.CSSProperties,
    placeholderTypeBtn: (_open: boolean, _accent: string): React.CSSProperties => ({
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px', cursor: 'pointer', border: 'none', background: 'none',
        color: 'var(--text-muted)',
        fontSize: 'var(--text-sm)', fontWeight: 500, textAlign: 'left', opacity: 0.5,
        transition: 'color var(--dur) var(--ease-out)',
    }),

    footer: { padding: 'var(--sp-3) var(--sp-4)', borderTop: '1px solid var(--separator)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' } as React.CSSProperties,
    footerActions: { display: 'flex', gap: 'var(--sp-2)', alignItems: 'center' } as React.CSSProperties,
    footerText: { fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.4 } as React.CSSProperties,
    footerIconBtn: {
        width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
        border: '1px solid var(--separator)', backgroundColor: 'var(--bg-surface-2)',
        color: 'var(--text-muted)', fontSize: '14px', display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        textDecoration: 'none', fontWeight: 700,
    } as React.CSSProperties,
};
