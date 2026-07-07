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

export function backgroundStyle(bg: BoardBackground): React.CSSProperties {
    const base = bg.dark ? '#1c2430' : '#ffffff';
    const line = bg.dark ? 'rgba(255,255,255,0.16)' : 'rgba(30,64,175,0.18)';
    const accent = bg.dark ? 'rgba(255,120,120,0.45)' : 'rgba(220,38,38,0.45)';
    // x-height band of the 4-line writing pattern: light blue, deliberately subtle.
    const band = bg.dark ? 'rgba(125,211,252,0.14)' : 'rgba(186,230,253,0.35)';
    const k = bg.scale ?? 1;   // pattern size multiplier (Klein/Normaal/Groot)
    const px = (v: number) => `${Math.round(v * k)}px`;

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
                    ${line} ${px(47)}, ${line} ${px(48)},
                    transparent ${px(48)}, transparent ${px(63)},
                    ${line} ${px(63)}, ${line} ${px(64)})`,
            };
        case 'schrijflijnen4':
            // Four lines per group; the x-height zone (between the middle two) gets a
            // light-blue band — the classic handwriting layout.
            return {
                backgroundColor: base,
                backgroundImage: `repeating-linear-gradient(180deg,
                    ${line} 0px, ${line} 1px,
                    transparent 1px, transparent ${px(30)},
                    ${line} ${px(30)}, ${line} ${px(31)},
                    ${band} ${px(31)}, ${band} ${px(60)},
                    ${line} ${px(60)}, ${line} ${px(61)},
                    transparent ${px(61)}, transparent ${px(90)},
                    ${line} ${px(90)}, ${line} ${px(91)},
                    transparent ${px(91)}, transparent ${px(126)})`,
            };
        case 'cornell':
            // Left cue column (accent line at 240px) + note lines.
            return {
                backgroundColor: base,
                backgroundImage: `linear-gradient(90deg, transparent 239px, ${accent} 239px, ${accent} 241px, transparent 241px),
                    linear-gradient(${line} 1px, transparent 1px)`,
                backgroundSize: `100% 100%, 100% ${px(44)}`,
                backgroundPosition: `0 0, 0 ${px(43)}`,
            };
        case 'blanco':
        default:
            return { backgroundColor: base };
    }
}
