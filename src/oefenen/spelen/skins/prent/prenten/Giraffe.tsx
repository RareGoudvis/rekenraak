import { Cheek, Cloud, Prent, Sun } from './parts';
import { F } from './palette';

// A giraffe with sunglasses, on a sunny savanna.
export default function Giraffe() {
    return (
        <Prent label="giraf">
            <rect className="ns" x="0" y="0" width="400" height="300" style={F.sky} />
            <Sun x={345} y={58} r={30} />
            <Cloud x={40} y={40} s={0.9} />
            <Cloud x={250} y={110} s={0.6} />
            <path d="M-10 238 Q120 214 230 230 Q330 244 410 226 L410 310 L-10 310 Z" style={F.grass} />
            {/* Body, partly behind the grass edge, and the neck up to the head. */}
            <ellipse cx="262" cy="270" rx="100" ry="52" style={F.gold} />
            <path d="M188 262 L150 116 L196 108 L246 240 Z" style={F.gold} />
            <path d="M196 108 L206 106 L258 236 L246 240 Z" style={F.brown} />
            {[[178, 170, 11, 8], [196, 212, 12, 9], [168, 128, 8, 6], [214, 246, 10, 8], [270, 246, 14, 10], [312, 262, 12, 9], [236, 276, 11, 8]].map(([x, y, rx, ry]) => (
                <ellipse key={`${x}-${y}`} cx={x} cy={y} rx={rx} ry={ry} style={F.brown} />
            ))}
            {/* Horns and ears behind the head. */}
            <path d="M150 62 L144 34 M194 62 L200 34" style={{ fill: 'none', strokeWidth: 12 }} />
            <path d="M150 62 L144 34 M194 62 L200 34" className="ns" style={{ fill: 'none', stroke: 'var(--pf-gold)', strokeWidth: 5 }} />
            <circle cx="144" cy="32" r="8" style={F.brown} />
            <circle cx="200" cy="32" r="8" style={F.brown} />
            <ellipse cx="116" cy="76" rx="22" ry="10" transform="rotate(-24 116 76)" style={F.gold} />
            <ellipse cx="228" cy="76" rx="22" ry="10" transform="rotate(24 228 76)" style={F.gold} />
            {/* The head with its muzzle. */}
            <ellipse cx="172" cy="96" rx="50" ry="40" style={F.gold} />
            <ellipse cx="172" cy="124" rx="38" ry="22" style={F.tan} />
            <ellipse className="ns" cx="160" cy="118" rx="4" ry="3" style={F.ink} />
            <ellipse className="ns" cx="184" cy="118" rx="4" ry="3" style={F.ink} />
            <path d="M152 130 Q172 146 192 130" style={F.none} />
            <Cheek x={132} y={110} />
            <Cheek x={212} y={110} />
            {/* The sunglasses, a shine on each lens. */}
            <path d="M126 86 L112 78 M218 86 L232 78" style={F.none} />
            <rect x="128" y="78" width="38" height="26" rx="10" style={F.ink} />
            <rect x="178" y="78" width="38" height="26" rx="10" style={F.ink} />
            <path d="M166 88 Q172 82 178 88" style={F.none} />
            <path className="ns" d="M136 86 L146 84 M186 86 L196 84" style={{ fill: 'none', stroke: 'var(--pf-white)', strokeWidth: 4 }} />
        </Prent>
    );
}
