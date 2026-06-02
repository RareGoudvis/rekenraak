// Shared rekenraak wordmark. Inline SVG so 'reken' tracks --text-main and 'raak'
// tracks --accent across themes. text-anchor=middle (x=160, viewBox center) because
// the viewBox is wider than the glyphs — left-anchoring would shift it visually left.
export default function Wordmark({ height = 30 }: { height?: number }) {
    return (
        <svg viewBox="0 0 320 70" style={{ height, width: 'auto', display: 'block' }} role="img" aria-label="rekenraak">
            <text x="160" y="52" textAnchor="middle" fontFamily="'Roboto', system-ui, -apple-system, sans-serif"
                  fontSize="56" fontWeight={700} letterSpacing="-1" fill="var(--text-main)">
                reken<tspan fill="var(--accent)">raak</tspan>
            </text>
        </svg>
    );
}
