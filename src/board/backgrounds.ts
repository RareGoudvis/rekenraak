import type { BoardBackground, BackgroundPattern } from './boardTypes';

// Background layer styles for the board surface. Pure CSS gradients — crisp at
// any size, no assets, printable if boards ever go to paper.
export const PATTERN_LABELS: Record<BackgroundPattern, string> = {
    blanco: 'Blanco',
    raster: 'Raster',
    lijnen: 'Lijnen',
    schrijflijnen: 'Schrijflijnen (2)',
    schrijflijnen4: 'Schrijflijnen (4)',
    cornell: 'Cornell',
};

export const BACKGROUND_SCALES: Array<{ value: number; label: string }> = [
    { value: 0.75, label: 'Klein' },
    { value: 1, label: 'Normaal' },
    { value: 1.5, label: 'Groot' },
];

// `zoom` shrinks the whole layout for a preview tile (the bar's background picker) while
// lines stay 1px, so a miniature still reads like the board instead of fading to grey.
export function backgroundStyle(bg: BoardBackground, zoom = 1): React.CSSProperties {
    const base = bg.dark ? '#1c2430' : '#ffffff';
    const line = bg.dark ? 'rgba(255,255,255,0.16)' : 'rgba(30,64,175,0.18)';
    const accent = bg.dark ? 'rgba(255,120,120,0.45)' : 'rgba(220,38,38,0.45)';
    // x-height band of the 4-line writing pattern: light blue, deliberately subtle.
    const band = bg.dark ? 'rgba(125,211,252,0.14)' : 'rgba(186,230,253,0.35)';
    const k = (bg.scale ?? 1) * zoom;   // pattern size multiplier (Klein/Normaal/Groot) × preview zoom
    const at = (v: number) => Math.round(v * k);
    const px = (v: number) => `${at(v)}px`;
    // A 1px line from the scaled offset: rounding start and end separately collapsed some
    // lines to 0px (schrijflijnen4 at Klein lost two of its four lines).
    const ln = (v: number) => `${line} ${at(v)}px, ${line} ${at(v) + 1}px`;
    const after = (v: number) => `${at(v) + 1}px`;
    // The Cornell cue column is a fixed board width (not a pattern size), so only the preview zooms it.
    const cue = Math.round(240 * zoom);

    switch (bg.pattern) {
        case 'raster':
            return {
                backgroundColor: base,
                backgroundImage: `linear-gradient(${line} 1px, transparent 1px), linear-gradient(90deg, ${line} 1px, transparent 1px)`,
                backgroundSize: `${px(40)} ${px(40)}`,
            };
        case 'lijnen':
            return {
                backgroundColor: base,
                backgroundImage: `linear-gradient(${line} 1px, transparent 1px)`,
                backgroundSize: `100% ${px(44)}`,
                backgroundPosition: `0 ${px(43)}`,
            };
        case 'schrijflijnen':
            // Writing-line pairs: baseline + midline per group (primary-school style).
            return {
                backgroundColor: base,
                backgroundImage: `repeating-linear-gradient(180deg,
                    transparent 0px, transparent ${px(47)},
                    ${ln(47)},
                    transparent ${after(47)}, transparent ${px(63)},
                    ${ln(63)})`,
            };
        case 'schrijflijnen4':
            // Four lines per group; the x-height zone (between the middle two) gets a
            // light-blue band — the classic handwriting layout.
            return {
                backgroundColor: base,
                backgroundImage: `repeating-linear-gradient(180deg,
                    ${line} 0px, ${line} 1px,
                    transparent 1px, transparent ${px(30)},
                    ${ln(30)},
                    ${band} ${after(30)}, ${band} ${px(60)},
                    ${ln(60)},
                    transparent ${after(60)}, transparent ${px(90)},
                    ${ln(90)},
                    transparent ${after(90)}, transparent ${px(126)})`,
            };
        case 'cornell':
            // Left cue column (accent line at 240px) + note lines.
            return {
                backgroundColor: base,
                backgroundImage: `linear-gradient(90deg, transparent ${cue - 1}px, ${accent} ${cue - 1}px, ${accent} ${cue + 1}px, transparent ${cue + 1}px),
                    linear-gradient(${line} 1px, transparent 1px)`,
                backgroundSize: `100% 100%, 100% ${px(44)}`,
                backgroundPosition: `0 0, 0 ${px(43)}`,
            };
        case 'blanco':
        default:
            return { backgroundColor: base };
    }
}
