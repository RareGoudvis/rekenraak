import { Cheek, Cloud, Eye, Prent } from './parts';
import { F } from './palette';

// A cow on a skateboard, zooming along the road.
export default function Koe() {
    return (
        <Prent label="koe">
            <rect className="ns" x="0" y="0" width="400" height="300" style={F.sky} />
            <Cloud x={30} y={36} s={0.8} />
            <Cloud x={200} y={22} s={0.6} />
            <path d="M-10 214 Q100 196 200 210 Q310 224 410 204 L410 262 L-10 262 Z" style={F.grass} />
            <rect x="-10" y="262" width="420" height="50" style={F.grey} />
            <path className="ns" d="M20 284 L60 284 M110 284 L150 284 M200 284 L240 284 M290 284 L330 284" style={{ fill: 'none', stroke: 'var(--pf-white)', strokeWidth: 5 }} />
            {/* Speed lines. */}
            <path d="M18 140 L64 140 M8 168 L52 168 M22 196 L66 196" style={F.none} />
            {/* The skateboard. */}
            <circle cx="132" cy="250" r="12" style={F.greyDark} />
            <circle cx="268" cy="250" r="12" style={F.greyDark} />
            <path d="M88 226 Q96 238 112 238 L288 238 Q304 238 312 226 Z" style={F.red} />
            {/* Tail, legs and udder behind the body. */}
            <path d="M104 154 Q80 160 78 190" style={F.none} />
            <ellipse cx="77" cy="196" rx="8" ry="11" style={F.ink} />
            {[118, 150, 222, 254].map(x => (
                <g key={x}>
                    <rect x={x} y="192" width="22" height="36" rx="6" style={F.white} />
                    <rect x={x} y="218" width="22" height="10" rx="3" style={F.ink} />
                </g>
            ))}
            <ellipse cx="200" cy="208" rx="16" ry="10" style={F.pink} />
            <ellipse cx="188" cy="166" rx="100" ry="50" style={F.white} />
            <path d="M140 124 Q166 116 178 132 Q184 152 160 156 Q136 156 140 124 Z" style={F.ink} />
            <path d="M214 176 Q236 166 250 180 Q252 200 230 202 Q210 198 214 176 Z" style={F.ink} />
            <path d="M100 160 Q112 150 120 166 Q118 182 102 178 Z" style={F.ink} />
            {/* The head: horns and ears behind, a pink snout. */}
            <path d="M266 76 Q254 62 258 46 Q272 56 280 72 Z M326 76 Q338 62 334 46 Q320 56 312 72 Z" style={F.cream} />
            <ellipse cx="242" cy="98" rx="20" ry="10" transform="rotate(20 242 98)" style={F.white} />
            <ellipse cx="350" cy="98" rx="20" ry="10" transform="rotate(-20 350 98)" style={F.white} />
            <ellipse cx="296" cy="112" rx="50" ry="46" style={F.white} />
            <path d="M262 90 Q270 72 290 74 Q284 92 266 100 Z" style={F.ink} />
            <ellipse cx="296" cy="142" rx="38" ry="24" style={F.pink} />
            <ellipse className="ns" cx="282" cy="138" rx="5" ry="7" style={F.ink} />
            <ellipse className="ns" cx="310" cy="138" rx="5" ry="7" style={F.ink} />
            <path d="M280 154 Q296 164 312 154" style={F.none} />
            <Eye x={278} y={106} r={11} dx={2} />
            <Eye x={314} y={106} r={11} dx={2} />
            <Cheek x={258} y={124} rx={7} ry={5} />
            <Cheek x={336} y={124} rx={7} ry={5} />
        </Prent>
    );
}
