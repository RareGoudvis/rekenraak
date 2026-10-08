import { useEffect, useRef } from 'react';
import { useBoardStore } from '../useBoardStore';
import { PATTERN_LABELS, BACKGROUND_SCALES, backgroundStyle } from '../backgrounds';
import type { BackgroundPattern, BoardBackground } from '../boardTypes';

// Tiles show the board at this fraction of its real size: small enough that a 96px tile
// holds a full Cornell cue column (240px) and a whole 4-line writing group.
const PREVIEW_ZOOM = 0.3;
// Every tile grid is three wide, so ArrowUp/ArrowDown step one row.
const COLS = 3;

// The bar's "Achtergrond" popover: every pattern, scale and board colour as a live
// preview tile. A pick applies at once; the bar closes the popover (Escape / outside).
export default function BackgroundPicker() {
    const background = useBoardStore((s) => s.pages[s.activePageIdx].background);
    const setBackground = useBoardStore((s) => s.setBackground);
    const rootRef = useRef<HTMLDivElement>(null);
    const scale = background.scale ?? 1;
    // Blanco has no size, so its scale tiles would be three identical blanks: show the grid instead.
    const scalePattern: BackgroundPattern = background.pattern === 'blanco' ? 'raster' : background.pattern;

    // Land keyboard focus on the current pattern so the arrows work straight away.
    useEffect(() => {
        rootRef.current?.querySelector<HTMLButtonElement>('[data-bg-tile][aria-pressed="true"]')?.focus();
    }, []);

    const onKeyDown = (e: React.KeyboardEvent) => {
        const tiles = Array.from(rootRef.current?.querySelectorAll<HTMLButtonElement>('[data-bg-tile]') ?? []);
        const i = tiles.indexOf(document.activeElement as HTMLButtonElement);
        if (i < 0) return;
        const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: COLS, ArrowUp: -COLS }[e.key];
        if (step) {
            e.preventDefault();
            tiles[Math.max(0, Math.min(tiles.length - 1, i + step))].focus();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            tiles[i].click();
        }
    };

    const tile = (key: string, label: string, preview: BoardBackground, on: boolean, pick: () => void) => (
        <button
            key={key} type="button" data-bg-tile aria-pressed={on} aria-label={label} title={label}
            className="ui-hover" style={{ ...S.tile, ...(on ? S.tileOn : {}) }} onClick={pick}
        >
            <span style={{ ...S.swatch, ...backgroundStyle(preview, PREVIEW_ZOOM) }} />
            <span style={{ ...S.label, ...(on ? S.labelOn : {}) }}>{label.replace(/^.*?: /, '')}</span>
        </button>
    );

    return (
        <div ref={rootRef} role="dialog" aria-label="Achtergrond" style={S.root} onKeyDown={onKeyDown}>
            <div style={S.title}>Achtergrond</div>

            <div style={S.section}>Patroon</div>
            <div style={S.grid}>
                {(Object.keys(PATTERN_LABELS) as BackgroundPattern[]).map(p =>
                    tile(`p-${p}`, `Patroon: ${PATTERN_LABELS[p]}`, { ...background, pattern: p }, background.pattern === p,
                        () => setBackground({ ...background, pattern: p })))}
            </div>

            <div style={S.section}>Grootte</div>
            <div style={S.grid}>
                {BACKGROUND_SCALES.map(sc =>
                    tile(`s-${sc.value}`, `Grootte: ${sc.label}`, { ...background, pattern: scalePattern, scale: sc.value }, scale === sc.value,
                        () => setBackground({ ...background, scale: sc.value })))}
            </div>

            <div style={S.section}>Bord</div>
            <div style={S.grid}>
                {tile('d-light', 'Bord: Licht', { ...background, dark: false }, !background.dark, () => setBackground({ ...background, dark: false }))}
                {tile('d-dark', 'Bord: Donker', { ...background, dark: true }, background.dark, () => setBackground({ ...background, dark: true }))}
            </div>
        </div>
    );
}

const S = {
    root: { display: 'flex', flexDirection: 'column', gap: '4px' } as React.CSSProperties,
    title: {
        padding: '4px 6px 2px', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-main)',
        fontFamily: "'Azeret Mono', monospace", userSelect: 'none',
    } as React.CSSProperties,
    section: {
        padding: '6px 6px 0', fontSize: '10px', letterSpacing: '0.8px', textTransform: 'uppercase',
        color: 'var(--text-muted)', fontFamily: "'Azeret Mono', monospace", userSelect: 'none',
    } as React.CSSProperties,
    grid: { display: 'grid', gridTemplateColumns: `repeat(${COLS}, 106px)`, gap: '6px', padding: '2px' } as React.CSSProperties,
    tile: {
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
        padding: '4px', borderRadius: 'var(--radius-sm)', border: '1px solid transparent',
        background: 'transparent', color: 'var(--text-main)', cursor: 'pointer',
    } as React.CSSProperties,
    // Ring, not fill: the swatch itself must stay the exact board colour.
    tileOn: { border: '1px solid var(--accent)', boxShadow: '0 0 0 1px var(--accent)' } as React.CSSProperties,
    // 96×64 = a 3:2 slice of the board at PREVIEW_ZOOM.
    swatch: {
        display: 'block', width: '96px', height: '64px', borderRadius: 'var(--radius-xs)',
        border: '1px solid var(--border-color)', boxSizing: 'border-box',
    } as React.CSSProperties,
    label: { fontSize: 'var(--text-xs)', lineHeight: 1.2, textAlign: 'center', minHeight: '14px' } as React.CSSProperties,
    labelOn: { fontWeight: 600 } as React.CSSProperties,
};
