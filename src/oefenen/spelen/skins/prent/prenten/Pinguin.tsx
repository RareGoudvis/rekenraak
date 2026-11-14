import { Cheek, Eye, Prent } from './parts';
import { F } from './palette';

// A penguin with a big ice cream, in the snow.
export default function Pinguin() {
    return (
        <Prent label="pinguin">
            <rect className="ns" x="0" y="0" width="400" height="300" style={F.ice} />
            {[[40, 40], [90, 90], [30, 150], [360, 60], [330, 160], [380, 120], [250, 30], [130, 30]].map(([x, y]) => (
                <circle key={`${x}-${y}`} className="ns" cx={x} cy={y} r="4" style={F.white} />
            ))}
            <path d="M-10 250 Q100 226 200 240 Q300 254 410 232 L410 310 L-10 310 Z" style={F.white} />
            {/* Feet, the left flipper, the body and the white belly. */}
            <ellipse cx="160" cy="276" rx="26" ry="11" style={F.orange} />
            <ellipse cx="226" cy="276" rx="26" ry="11" style={F.orange} />
            <ellipse cx="112" cy="190" rx="17" ry="44" transform="rotate(22 112 190)" style={F.dark} />
            <ellipse cx="192" cy="172" rx="84" ry="102" style={F.dark} />
            <ellipse cx="192" cy="196" rx="58" ry="74" style={F.white} />
            {/* The ice cream: a cone, two scoops and a cherry; the right flipper holds it up. */}
            <path d="M286 112 L330 112 L308 186 Z" style={F.tan} />
            <path className="ns" d="M296 126 L318 150 M318 126 L298 160 M302 116 L326 140 M290 118 L312 172" style={{ fill: 'none', stroke: 'var(--pf-brown)', strokeWidth: 3 }} />
            <circle cx="308" cy="98" r="24" style={F.pink} />
            <circle cx="308" cy="66" r="20" style={F.mint} />
            <circle cx="308" cy="42" r="8" style={F.red} />
            <path d="M308 34 Q312 24 320 22" style={F.none} />
            <ellipse cx="282" cy="158" rx="16" ry="42" transform="rotate(-42 282 158)" style={F.dark} />
            {/* The face. */}
            <Eye x={170} y={118} r={14} dx={3} dy={-1} />
            <Eye x={214} y={118} r={14} dx={4} dy={-1} />
            <path d="M178 140 Q192 134 206 140 L192 158 Z" style={F.orange} />
            <Cheek x={150} y={146} />
            <Cheek x={234} y={146} />
        </Prent>
    );
}
