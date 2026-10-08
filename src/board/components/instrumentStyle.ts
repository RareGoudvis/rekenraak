import type { CSSProperties } from 'react';

// Instrument colours, all tokens: a frosted light body keeps the black scale legible on a
// white and on a black board alike (the translucent "plastic" look).
export const IC = {
    body: 'color-mix(in srgb, var(--bg-surface) 72%, transparent)',
    tint: 'var(--accent-soft)',
    edge: 'var(--accent-strong)',
    selected: 'var(--accent)',
    tick: 'var(--text-main)',
    faint: 'var(--text-muted)',
    handle: 'var(--accent)',
    handleOn: 'var(--accent-on)',
} as const;

// Scale marks and labels never take pointers (the grip polygon under them does).
export const NO_POINTER: CSSProperties = { pointerEvents: 'none', userSelect: 'none' };
