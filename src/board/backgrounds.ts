import type { BoardBackground, BackgroundPattern } from './boardTypes';

// Background layer styles for the board surface. Pure CSS gradients — crisp at
// any size, no assets, printable if boards ever go to paper.
export const PATTERN_LABELS: Record<BackgroundPattern, string> = {
    blanco: 'Blanco',
    raster: 'Raster',
    lijnen: 'Lijnen',
    schrijflijnen: 'Schrijflijnen',
    cornell: 'Cornell',
};

export function backgroundStyle(bg: BoardBackground): React.CSSProperties {
    const base = bg.dark ? '#1c2430' : '#ffffff';
    const line = bg.dark ? 'rgba(255,255,255,0.16)' : 'rgba(30,64,175,0.18)';
    const accent = bg.dark ? 'rgba(255,120,120,0.45)' : 'rgba(220,38,38,0.45)';

    switch (bg.pattern) {
        case 'raster':
            return {
                backgroundColor: base,
                backgroundImage: `linear-gradient(${line} 1px, transparent 1px), linear-gradient(90deg, ${line} 1px, transparent 1px)`,
                backgroundSize: '40px 40px',
            };
        case 'lijnen':
            return {
                backgroundColor: base,
                backgroundImage: `linear-gradient(${line} 1px, transparent 1px)`,
                backgroundSize: '100% 44px',
                backgroundPosition: '0 43px',
            };
        case 'schrijflijnen':
            // Writing-line pairs: baseline + midline per 72px group (primary-school style).
            return {
                backgroundColor: base,
                backgroundImage: `repeating-linear-gradient(180deg,
                    transparent 0px, transparent 47px,
                    ${line} 47px, ${line} 48px,
                    transparent 48px, transparent 63px,
                    ${line} 63px, ${line} 64px)`,
            };
        case 'cornell':
            // Left cue column (accent line at 240px) + note lines.
            return {
                backgroundColor: base,
                backgroundImage: `linear-gradient(90deg, transparent 239px, ${accent} 239px, ${accent} 241px, transparent 241px),
                    linear-gradient(${line} 1px, transparent 1px)`,
                backgroundSize: '100% 100%, 100% 44px',
                backgroundPosition: '0 0, 0 43px',
            };
        case 'blanco':
        default:
            return { backgroundColor: base };
    }
}
