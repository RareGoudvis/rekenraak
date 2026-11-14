import { Cheek, Eye, Prent } from './parts';
import { F } from './palette';

// A hippo in a bubble bath, with a rubber duck.
const FOAM: [number, number, number][] = [
    [74, 188, 22], [108, 182, 26], [146, 188, 24], [184, 182, 26], [222, 188, 24], [258, 180, 26], [296, 188, 24], [330, 184, 22],
];
const BUBBLES: [number, number, number][] = [[64, 120, 12], [92, 84, 8], [312, 96, 10], [346, 58, 14], [120, 40, 9], [276, 40, 7]];

export default function Nijlpaard() {
    return (
        <Prent label="nijlpaard">
            <rect className="ns" x="0" y="0" width="400" height="300" style={F.ice} />
            <path className="ns" d="M0 60 L400 60 M0 120 L400 120 M0 180 L400 180 M80 0 L80 240 M160 0 L160 240 M240 0 L240 240 M320 0 L320 240"
                style={{ fill: 'none', stroke: 'var(--pf-white)', strokeWidth: 4 }} />
            <rect x="-10" y="240" width="420" height="70" style={F.sky} />
            {/* The hippo's head, peeking out of the foam: ears and eye bumps first. */}
            <g transform="translate(0 -22)">
                <ellipse cx="146" cy="74" rx="14" ry="11" style={F.lilac} />
                <ellipse cx="254" cy="74" rx="14" ry="11" style={F.lilac} />
                <ellipse cx="200" cy="130" rx="76" ry="62" style={F.lilac} />
                <circle cx="172" cy="88" r="20" style={F.lilac} />
                <circle cx="228" cy="88" r="20" style={F.lilac} />
                <path className="ns" d="M156 96 Q200 110 244 96 L244 120 L156 120 Z" style={F.lilac} />
                <Eye x={172} y={88} r={12} dy={2} />
                <Eye x={228} y={88} r={12} dy={2} />
                <ellipse cx="200" cy="148" rx="66" ry="40" style={F.pink} />
                <ellipse className="ns" cx="178" cy="136" rx="6" ry="9" style={F.ink} />
                <ellipse className="ns" cx="222" cy="136" rx="6" ry="9" style={F.ink} />
                <path d="M172 162 Q200 180 228 162" style={F.none} />
                <Cheek x={146} y={146} />
                <Cheek x={254} y={146} />
            </g>
            {/* The tub with its feet; the foam over the rim. */}
            <ellipse cx="108" cy="262" rx="14" ry="10" style={F.sun} />
            <ellipse cx="292" cy="262" rx="14" ry="10" style={F.sun} />
            <path d="M54 180 L346 180 Q350 246 290 256 L110 256 Q50 246 54 180 Z" style={F.white} />
            <rect x="42" y="174" width="316" height="18" rx="9" style={F.white} />
            {FOAM.map(([x, y, r]) => <circle key={x} cx={x} cy={y} r={r} style={F.white} />)}
            <path className="ns" d="M60 180 L340 180 L340 196 L60 196 Z" style={F.white} />
            {/* A rubber duck on the foam. */}
            <ellipse cx="318" cy="160" rx="22" ry="14" style={F.sun} />
            <circle cx="330" cy="138" r="13" style={F.sun} />
            <path d="M341 136 L354 140 L341 144 Z" style={F.orange} />
            <circle className="ns" cx="333" cy="134" r="2.5" style={F.ink} />
            {BUBBLES.map(([x, y, r]) => (
                <g key={`${x}-${y}`}>
                    <circle cx={x} cy={y} r={r} style={F.white} />
                    <path className="ns" d={`M${x - r * 0.5} ${y - r * 0.1} A${r * 0.5} ${r * 0.5} 0 0 1 ${x - r * 0.05} ${y - r * 0.55}`} style={{ fill: 'none', stroke: 'var(--pf-sky)', strokeWidth: 3 }} />
                </g>
            ))}
        </Prent>
    );
}
