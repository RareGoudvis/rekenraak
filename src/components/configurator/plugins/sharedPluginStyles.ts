import React from 'react';

// Shared config-plugin controls. One edit here re-skins every *Config.tsx at once,
// so all design-system values come from CSS tokens (see assets/theme.css).
// Selection reads as a calm accent-soft "thumb" (tint + accent text + 1px accent
// ring), not a heavy solid fill — closer to Apple's segmented/selected style. The
// 1px var(--accent) ring is what keeps the active state legible in the colorblind
// theme (where accent-soft is a faint gray).
export const sharedPluginStyles = {
    container: {} as React.CSSProperties,

    section: {
        marginBottom: 'var(--sp-5)'
    } as React.CSSProperties,

    // Hairline between two logical groups (e.g. getalopbouw | bruginstellingen).
    divider: {
        height: '1px', border: 'none', background: 'var(--separator)',
        margin: 'var(--sp-4) 0'
    } as React.CSSProperties,

    // Grey sub-panel wrapping a self-contained cluster (e.g. tafel selection).
    sectionBox: {
        backgroundColor: 'var(--bg-surface-2)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--separator)',
        padding: 'var(--sp-4)'
    } as React.CSSProperties,

    // PopupSelect (dropdown for value pickers). Trigger mirrors radioBtn's calm
    // accent-soft selected look; menu is a token-styled popover.
    selectTrigger: {
        width: '100%', padding: '6px 10px', fontSize: 'var(--text-sm)', fontWeight: 500,
        borderRadius: 'var(--radius-sm)', cursor: 'pointer',
        border: '1px solid var(--separator)', backgroundColor: 'var(--bg-surface-2)',
        color: 'var(--text-main)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-2)',
        transition: 'border-color var(--dur) var(--ease-out)',
    } as React.CSSProperties,
    selectMenu: {
        position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50,
        maxHeight: '260px', overflowY: 'auto',
        background: 'var(--bg-surface)', border: '1px solid var(--separator)',
        borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-2)', padding: '4px',
    } as React.CSSProperties,
    selectItem: (active: boolean): React.CSSProperties => ({
        padding: '7px 10px', fontSize: 'var(--text-sm)', borderRadius: 'var(--radius-xs)',
        cursor: 'pointer', textAlign: 'left',
        backgroundColor: active ? 'var(--accent-soft)' : 'transparent',
        color: active ? 'var(--accent)' : 'var(--text-main)',
        fontWeight: active ? 600 : 500,
    }),

    // Field label — titles a SINGLE control (e.g. "Maximum uitkomst").
    label: {
        display: 'block',
        fontSize: 'var(--text-sm)',
        fontWeight: 500,
        color: 'var(--text-muted)',
        marginBottom: 'var(--sp-2)'
    } as React.CSSProperties,

    // Group header — titles a CLUSTER of controls (e.g. "Bruginstellingen",
    // "Specifieke getalopbouw"). The one bold tier; everything else is `label`.
    groupLabel: {
        display: 'block',
        fontSize: 'var(--text-base)',
        fontWeight: 600,
        color: 'var(--text-main)',
        margin: '0 0 var(--sp-3)'
    } as React.CSSProperties,

    // ── Text tiers (use these instead of inline fontSize/color one-offs) ──
    // Explanatory paragraph under a control ("Leeg = vrije opbouw.").
    hint: {
        fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontStyle: 'italic',
        margin: 'var(--sp-2) 0 0', lineHeight: 1.4,
    } as React.CSSProperties,
    // Secondary description INSIDE a radio/option button (deemphasised).
    optionHint: {
        fontSize: '10px', opacity: 0.8, fontWeight: 400, lineHeight: 1.3,
    } as React.CSSProperties,
    // Inline mini-label ("Getal 1:", "van", "tot", a single place key).
    miniLabel: {
        fontSize: 'var(--text-xs)', color: 'var(--text-muted)',
    } as React.CSSProperties,
    // Numeric <input> text (the bold figures in fraction / range fields).
    numInput: {
        fontSize: 'var(--text-base)', fontWeight: 700,
    } as React.CSSProperties,

    buttonGroup: {
        display: 'flex',
        gap: '6px',
        flexWrap: 'wrap' // wrap onto a new line when the sidebar gets narrow
    } as React.CSSProperties,

    // Single-select segment. Active = macOS raised thumb (lighter surface + soft lift +
    // PRIMARY-text label), matching the .seg-btn control. Colorblind distinction comes
    // from --seg-thumb-shadow (a 2px black ring in that theme).
    radioBtn: (active: boolean): React.CSSProperties => ({
        flex: 1,
        padding: '6px 10px',
        fontSize: 'var(--text-sm)',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        // Unselected uses a --separator border (not transparent) so the button stays
        // visible in the colorblind theme, where every surface is white.
        border: `1px solid ${active ? 'var(--seg-thumb-border)' : 'var(--separator)'}`,
        backgroundColor: active ? 'var(--seg-thumb)' : 'var(--bg-surface-2)',
        color: active ? 'var(--text-main)' : 'var(--text-muted)',
        fontWeight: active ? 600 : 500,
        boxShadow: active ? 'var(--seg-thumb-shadow)' : 'none',
        textAlign: 'center',
        transition: 'background-color var(--dur) var(--ease-out), color var(--dur) var(--ease-out), border-color var(--dur) var(--ease-out), box-shadow var(--dur) var(--ease-out)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    }),

    // Independently-toggleable chip (multi-select), pill-shaped.
    pill: (active: boolean): React.CSSProperties => ({
        padding: '6px 12px',
        fontSize: 'var(--text-sm)',
        borderRadius: 'var(--radius-pill)',
        cursor: 'pointer',
        border: `1px solid ${active ? 'var(--accent)' : 'var(--separator)'}`,
        backgroundColor: active ? 'var(--accent-soft)' : 'var(--bg-surface-2)',
        color: active ? 'var(--accent)' : 'var(--text-muted)',
        fontWeight: active ? 600 : 500,
        transition: 'background-color var(--dur) var(--ease-out), color var(--dur) var(--ease-out), border-color var(--dur) var(--ease-out)',
    }),

    // Label + single Aan/Uit toggle button on one row.
    onOffRow: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 'var(--sp-3)', marginBottom: 'var(--sp-2)',
    } as React.CSSProperties,
    onOffLabel: { fontSize: 'var(--text-sm)', color: 'var(--text-main)' } as React.CSSProperties,
    // ON state earns a solid accent fill — it's a binary switch, so a strong signal reads best.
    onOffBtn: (on: boolean): React.CSSProperties => ({
        flexShrink: 0, minWidth: '54px', padding: '6px 14px', fontSize: 'var(--text-sm)', fontWeight: 600,
        borderRadius: 'var(--radius-pill)', cursor: 'pointer',
        border: `1px solid ${on ? 'var(--accent)' : 'var(--separator)'}`,
        backgroundColor: on ? 'var(--accent)' : 'var(--bg-surface-2)',
        color: on ? 'var(--accent-on)' : 'var(--text-muted)',
        transition: 'background-color var(--dur) var(--ease-out), color var(--dur) var(--ease-out), border-color var(--dur) var(--ease-out)',
    }),

    // Place-value mask cell (D/H/T/E and friends). One canonical 28×28 toggle —
    // same tint+ring selected treatment as radioBtn/pill (the 1px accent ring is
    // what keeps "on" legible in the colorblind theme).
    maskBtn: (active: boolean): React.CSSProperties => ({
        width: '28px', height: '28px', fontSize: 'var(--text-xs)', fontWeight: 700, cursor: 'pointer',
        borderRadius: 'var(--radius-xs)',
        border: `1px solid ${active ? 'var(--accent)' : 'var(--separator)'}`,
        backgroundColor: active ? 'var(--accent-soft)' : 'var(--bg-surface-2)',
        color: active ? 'var(--accent)' : 'var(--text-muted)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background-color var(--dur) var(--ease-out), color var(--dur) var(--ease-out), border-color var(--dur) var(--ease-out)',
    }),

    // Bridge / 3-way segment (GEEN/MAG/MOET): flex:1 segment, same raised-thumb selection.
    bridgeBtn: (active: boolean): React.CSSProperties => ({
        flex: 1, padding: '6px 4px', fontSize: 'var(--text-xs)', fontWeight: active ? 600 : 500, cursor: 'pointer',
        borderRadius: 'var(--radius-xs)', textAlign: 'center',
        border: `1px solid ${active ? 'var(--seg-thumb-border)' : 'var(--separator)'}`,
        backgroundColor: active ? 'var(--seg-thumb)' : 'var(--bg-surface-2)',
        color: active ? 'var(--text-main)' : 'var(--text-muted)',
        boxShadow: active ? 'var(--seg-thumb-shadow)' : 'none',
        transition: 'background-color var(--dur) var(--ease-out), color var(--dur) var(--ease-out), border-color var(--dur) var(--ease-out), box-shadow var(--dur) var(--ease-out)',
    }),
};
