import { Cheek, Cloud, Eye, Prent } from './parts';
import { F } from './palette';

// An owl with a school backpack (and a pencil), on a branch.
export default function Uil() {
    return (
        <Prent label="uil">
            <rect className="ns" x="0" y="0" width="400" height="300" style={F.sky} />
            <Cloud x={24} y={40} s={0.8} />
            <Cloud x={300} y={70} s={0.7} />
            {/* The backpack behind the owl, a pencil sticking out. */}
            <path d="M96 64 L118 54 L136 104 L114 112 Z" style={F.sun} />
            <path d="M96 64 L118 54 L112 40 Z" style={F.tan} />
            <rect x="86" y="96" width="228" height="140" rx="30" style={F.red} />
            <path d="M176 96 Q200 70 224 96" style={{ fill: 'none', strokeWidth: 10 }} />
            <path className="ns" d="M176 96 Q200 70 224 96" style={{ fill: 'none', stroke: 'var(--pf-red)', strokeWidth: 4 }} />
            {/* The owl: ear tufts, body, face, belly. */}
            <path d="M138 92 L132 50 L170 78 Z M262 92 L268 50 L230 78 Z" style={F.brown} />
            <ellipse cx="200" cy="168" rx="84" ry="96" style={F.brown} />
            <ellipse cx="200" cy="212" rx="54" ry="48" style={F.tan} />
            <path d="M180 196 L186 202 L192 196 M208 196 L214 202 L220 196 M194 218 L200 224 L206 218 M178 234 L184 240 L190 234 M210 234 L216 240 L222 234" style={F.none} />
            <circle cx="168" cy="128" r="34" style={F.cream} />
            <circle cx="232" cy="128" r="34" style={F.cream} />
            <Eye x={168} y={128} r={22} dx={2} />
            <Eye x={232} y={128} r={22} dx={2} />
            <path d="M200 146 L212 160 L200 176 L188 160 Z" style={F.orange} />
            <Cheek x={146} y={164} />
            <Cheek x={254} y={164} />
            {/* The backpack's straps over the shoulders, then the wings. */}
            <path d="M150 94 Q136 150 150 226" style={{ fill: 'none', strokeWidth: 16 }} />
            <path className="ns" d="M150 94 Q136 150 150 226" style={{ fill: 'none', stroke: 'var(--pf-red)', strokeWidth: 9 }} />
            <path d="M250 94 Q264 150 250 226" style={{ fill: 'none', strokeWidth: 16 }} />
            <path className="ns" d="M250 94 Q264 150 250 226" style={{ fill: 'none', stroke: 'var(--pf-red)', strokeWidth: 9 }} />
            <ellipse cx="124" cy="200" rx="20" ry="48" transform="rotate(14 124 200)" style={F.brown} />
            <ellipse cx="276" cy="200" rx="20" ry="48" transform="rotate(-14 276 200)" style={F.brown} />
            {/* The branch with a leaf, the feet on it. */}
            <path d="M-10 258 Q200 246 410 262 L410 282 Q200 268 -10 280 Z" style={F.wood} />
            <path d="M340 262 Q356 236 378 240 Q370 262 340 262 Z" style={F.green} />
            <path d="M172 262 L172 250 M180 262 L180 248 M188 262 L188 250 M212 262 L212 250 M220 262 L220 248 M228 262 L228 250" style={{ fill: 'none', stroke: 'var(--pf-orange)', strokeWidth: 7 }} />
        </Prent>
    );
}
