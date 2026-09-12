import type { Fraction } from '../../services/math/types';

interface Props {
    value: Fraction;        // { whole?, n, d } — whole shown only for mixed numbers
    color?: string;         // solution colour; default black
    fontSize?: number;      // numerator/denominator size; default 15
    mono?: boolean;         // monospace (matches the fraction-shape viewers)
}

// The `fontSize` prop stays a plain px number (callers outside this sweep group pass
// literals like 15/16/20) — only the CSS it produces becomes a factor of
// --sheet-size-math, via the same px/17.33 table as every other sheet font size.
const toMathFactor = (px: number): number => Math.round((px / 17.33) * 100) / 100;

// Stacked numerator / bar / denominator, with an optional leading whole number for
// mixed numbers (e.g. 1¾). Single source for every vertical-fraction render.
export default function VerticalFraction({ value, color, fontSize = 15, mono = false }: Props) {
    const hasWhole = value.whole !== undefined && value.whole > 0;
    // cellMin stays raw px (layout geometry derived from the nominal size, not a font itself).
    const cellMin = `${fontSize + 9}px`;
    const fontFamily = mono ? 'Azeret Mono, monospace' : undefined;
    const digitFontSize = `calc(var(--sheet-size-math) * ${toMathFactor(fontSize)})`;
    const wholeFontSize = `calc(var(--sheet-size-math) * ${toMathFactor(fontSize * 1.2)})`;
    return (
        <div style={{ display: 'inline-flex', alignItems: 'center', fontFamily, ...(color ? { color } : {}) }}>
            {hasWhole && <span style={{ fontSize: wholeFontSize, marginRight: '4px', ...(color ? { color } : {}) }}>{value.whole}</span>}
            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', fontSize: digitFontSize, lineHeight: 1.1 }}>
                <span style={{ borderBottom: `1.5px solid ${color || '#000'}`, minWidth: cellMin, textAlign: 'center', padding: '0 4px' }}>{value.n}</span>
                <span style={{ minWidth: cellMin, textAlign: 'center', padding: '0 4px' }}>{value.d}</span>
            </div>
        </div>
    );
}
