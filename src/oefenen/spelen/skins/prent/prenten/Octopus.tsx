import { Cheek, Eye, Prent, Tube } from './parts';
import { F } from './palette';

// An octopus juggling three balls under the sea.
const BALLS: [number, number, keyof typeof F][] = [[74, 92, 'red'], [200, 34, 'sun'], [326, 92, 'green']];

export default function Octopus() {
    return (
        <Prent label="octopus">
            <rect className="ns" x="0" y="0" width="400" height="300" style={F.sea} />
            <path d="M-10 266 Q200 250 410 268 L410 310 L-10 310 Z" style={F.cream} />
            <Tube d="M30 270 Q16 240 34 214 Q50 190 34 160" w={10} color="green" />
            <Tube d="M376 270 Q392 236 372 206" w={10} color="green" />
            {[[54, 220, 6], [70, 186, 9], [344, 170, 7], [360, 136, 10], [120, 150, 5]].map(([x, y, r]) => <circle key={`${x}-${y}`} cx={x} cy={y} r={r} style={F.ice} />)}
            {/* The juggling arc. */}
            <path className="ns" d="M88 84 Q200 -6 312 84" style={{ fill: 'none', stroke: 'var(--pf-white)', strokeWidth: 4, strokeDasharray: '4 12' }} />
            {/* Eight arms: four curl on the sand, four reach out to juggle. */}
            <Tube d="M158 186 Q132 236 102 246 Q84 252 90 234" w={22} color="purple" />
            <Tube d="M184 196 Q178 240 160 262" w={22} color="purple" />
            <Tube d="M216 196 Q222 240 240 262" w={22} color="purple" />
            <Tube d="M242 186 Q268 236 298 246 Q316 252 310 234" w={22} color="purple" />
            <Tube d="M150 168 Q104 184 80 160" w={22} color="purple" />
            <Tube d="M250 168 Q296 184 320 160" w={22} color="purple" />
            <Tube d="M146 140 Q96 136 80 108" w={22} color="purple" />
            <Tube d="M254 140 Q304 136 320 108" w={22} color="purple" />
            {/* The head. */}
            <ellipse cx="200" cy="140" rx="72" ry="66" style={F.purple} />
            {[[168, 92, 9], [232, 96, 7], [200, 82, 6]].map(([x, y, r]) => <circle key={x} className="ns" cx={x} cy={y} r={r} style={F.lilac} />)}
            <Eye x={176} y={136} r={15} dy={-3} />
            <Eye x={224} y={136} r={15} dy={-3} />
            <path d="M182 168 Q200 184 218 168" style={F.none} />
            <Cheek x={152} y={160} />
            <Cheek x={248} y={160} />
            {BALLS.map(([x, y, c]) => (
                <g key={x}>
                    <circle cx={x} cy={y} r="17" style={F[c]} />
                    <path className="ns" d={`M${x - 9} ${y - 2} A9 9 0 0 1 ${x - 1} ${y - 10}`} style={{ fill: 'none', stroke: 'var(--pf-white)', strokeWidth: 4 }} />
                </g>
            ))}
        </Prent>
    );
}
