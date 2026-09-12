import React from 'react';

// The Inspector's own field chrome, extracted so the per-family sections that used to live
// inside Inspector.tsx keep rendering identically now that they sit in their family plugin.
// Inspector's `S` re-exports these, so there is still ONE definition of each.
// Not the same as sharedPluginStyles: that is the config-plugin BODY canon (raised-thumb
// segments); these are the Differentiatie/Geavanceerd rows (accent-soft ring). See UI-GUIDE.
export const F = {
    label: { display: 'block', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--sp-2)', fontWeight: 500 } as React.CSSProperties,
    input: { width: '100%', padding: '7px 10px', backgroundColor: 'var(--bg-surface-2)', border: '1px solid var(--separator)', borderRadius: 'var(--radius-xs)', color: 'var(--text-main)', outline: 'none', boxSizing: 'border-box', fontSize: 'var(--text-sm)' } as React.CSSProperties,
    checkboxLabel: { display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', cursor: 'pointer', fontSize: 'var(--text-sm)', color: 'var(--text-main)' } as React.CSSProperties,
    checkbox: { accentColor: 'var(--accent)', width: '16px', height: '16px', cursor: 'pointer', flexShrink: 0 } as React.CSSProperties,
    switchRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-3)', padding: '3px 0' } as React.CSSProperties,
    switchText: { fontSize: 'var(--text-sm)', color: 'var(--text-main)' } as React.CSSProperties,
    // radioBtn = the separated bordered-button style used by the vertical list-row
    // selectors (level/scaffolding lists). True segmented groups use .seg-group/.seg-btn.
    radioBtn: (active: boolean): React.CSSProperties => ({ padding: '6px 10px', fontSize: 'var(--text-sm)', border: `1px solid ${active ? 'var(--accent)' : 'var(--separator)'}`, borderRadius: 'var(--radius-xs)', cursor: 'pointer', backgroundColor: active ? 'var(--accent-soft)' : 'transparent', color: active ? 'var(--accent)' : 'var(--text-muted)', fontWeight: active ? 600 : 500, flex: 1, whiteSpace: 'nowrap', transition: 'background-color var(--dur) var(--ease-out), color var(--dur) var(--ease-out), border-color var(--dur) var(--ease-out)' }),
    // Vertical stack of option rows (the list-style selectors).
    optionCol: { display: 'flex', flexDirection: 'column', gap: '4px' } as React.CSSProperties,
    // Full-width slider; --accent-purple is the block-settings slider colour.
    range: { width: '100%', accentColor: 'var(--accent-purple)', cursor: 'pointer' } as React.CSSProperties,
};
