import type { CSSProperties } from 'react';
import type { WildKind } from './rule';

// Wildwaterrace's obstacles on the river (flat fills under the --spel-ink outline; motions in wildwaterrace.css). The
// river is seen from above at an angle and flows to the right; each obstacle is drawn with its near edge at x 0 and
// the lane's middle at y 0, in the lane's units. `state`: ahead (idle motion), clear (the raft got past), crash.

const v = (o: Record<string, string | number>) => o as CSSProperties;
export type ObState = 'ahead' | 'clear' | 'crash';

function Boulder({ x, y, r, k }: { x: number; y: number; r: number; k: number }) {
    return (
        <g transform={`translate(${x} ${y})`}>
            <ellipse className="ww-foam-ring" style={v({ '--i': k })} rx={r + 12} ry={(r + 12) * 0.5} />
            <path className="ww-rock" d={`M${-r} 2 C ${-r} ${-r * 0.9} ${r * 0.4} ${-r * 1.1} ${r} ${-r * 0.2} C ${r * 1.1} ${r * 0.4} ${-r * 0.4} ${r * 0.7} ${-r} 2 Z`} />
            <path className="ww-rock-shine" d={`M${-r * 0.5} ${-r * 0.4} q${r * 0.3} ${-r * 0.3} ${r * 0.6} ${-r * 0.2}`} />
        </g>
    );
}

function Rocks({ state }: { state: ObState }) {
    return (
        <g className={`ww-ob-rocks is-${state}`}>
            <Boulder x={34} y={-14} r={22} k={0} />
            <Boulder x={70} y={12} r={17} k={1} />
            <Boulder x={44} y={30} r={11} k={2} />
            <g className="ww-crab" transform="translate(34 -40)">
                <ellipse className="ww-crab-body" rx={8} ry={5} />
                <path className="ww-crab-claw" d="M-8 -2 l-6 -6 M8 -2 l6 -6" />
                <circle className="ww-crab-eye" cx={-3} cy={-6} r={1.6} /><circle className="ww-crab-eye" cx={3} cy={-6} r={1.6} />
            </g>
        </g>
    );
}

function Log({ state }: { state: ObState }) {
    return (
        <g className={`ww-ob-log is-${state}`} transform="translate(40 0)">
            <g className="ww-log-bob">
                <ellipse className="ww-foam-ring" style={v({ '--i': 0 })} rx={28} ry={50} />
                <rect className="ww-log" x={-14} y={-44} width={28} height={88} rx={14} />
                <ellipse className="ww-log-end" cx={0} cy={-38} rx={14} ry={7} />
                <path className="ww-log-ring" d="M-6 -38 a6 3 0 1 0 12 0 a6 3 0 1 0 -12 0" />
                <path className="ww-log-bark" d="M-8 -20 v14 M6 0 v18 M-4 26 v14" />
                <g className="ww-frog" transform="translate(0 6)">
                    <ellipse className="ww-frog-body" rx={9} ry={7} />
                    <circle className="ww-frog-eye" cx={-4} cy={-6} r={3.2} /><circle className="ww-frog-eye" cx={4} cy={-6} r={3.2} />
                    <circle className="ww-frog-pupil" cx={-4} cy={-6} r={1.4} /><circle className="ww-frog-pupil" cx={4} cy={-6} r={1.4} />
                </g>
            </g>
        </g>
    );
}

function Whirl({ state }: { state: ObState }) {
    return (
        <g className={`ww-ob-whirl is-${state}`} transform="translate(-30 0)">
            <ellipse className="ww-whirl-bed" rx={62} ry={34} />
            <g className="ww-whirl-spin">
                <path d="M0 0 m -6 0 a 6 4 0 1 1 12 0 a 13 8 0 1 1 -26 0 a 22 13 0 1 1 44 0 a 32 19 0 1 1 -64 0 a 44 26 0 1 1 88 0" />
            </g>
            <g className="ww-whirl-bits">{[0, 1, 2].map(k => <circle key={k} style={v({ '--k': k })} r={3} />)}</g>
        </g>
    );
}

function Drop({ state }: { state: ObState }) {
    return (
        <g className={`ww-ob-drop is-${state}`} transform="translate(-10 0)">
            {/* A step in the river across the lane: a lip of foam, the water lower behind it. */}
            <path className="ww-step-low" d="M8 -46 Q50 -56 96 -40 Q110 0 96 40 Q50 56 8 46 Z" />
            <path className="ww-step-edge" d="M0 -48 Q6 -24 0 0 Q6 24 0 48" />
            <g className="ww-step-foam">{[-36, -12, 12, 36].map((y, k) => <ellipse key={y} style={v({ '--k': k })} cx={14} cy={y} rx={12} ry={8} />)}</g>
            <g className="ww-step-streaks">{[-30, -6, 18, 40].map((y, k) => <path key={y} style={v({ '--k': k })} d={`M20 ${y} l40 0`} />)}</g>
        </g>
    );
}

function Croc({ state }: { state: ObState }) {
    return (
        <g className={`ww-ob-croc is-${state}`} transform="translate(50 6)">
            <g className="ww-croc-bob">
                <ellipse className="ww-foam-ring" style={v({ '--i': 1 })} rx={50} ry={18} />
                {/* Its back and tail in the water, the head toward the raft, eyes up, a big friendly grin. */}
                <path className="ww-croc-back" d="M10 4 C 30 -8 60 -6 78 2 C 64 8 30 12 10 4 Z" />
                {[24, 40, 56].map(x => <path key={x} className="ww-croc-ridge" d={`M${x} -4 l4 -6 l4 6`} />)}
                <g className="ww-croc-head">
                    <path className="ww-croc-jaw" d="M12 6 C -10 8 -30 8 -38 4 C -32 12 -8 16 12 12 Z" />
                    <g className="ww-croc-top">
                        <path className="ww-croc-snout" d="M14 2 C -6 -2 -30 -2 -38 2 C -30 -10 -4 -14 14 -10 Z" />
                        <path className="ww-croc-teeth" d="M-30 1 l3 4 l3 -4 l3 4 l3 -4 l3 4 l3 -4" />
                        <circle className="ww-croc-nostril" cx={-32} cy={-2} r={1.6} />
                        <g className="ww-croc-eyes">
                            <circle className="ww-croc-eyeball" cx={4} cy={-14} r={7} /><circle className="ww-croc-eyeball" cx={14} cy={-12} r={6} />
                            <circle className="ww-croc-pupil" cx={2} cy={-14} r={3} /><circle className="ww-croc-pupil" cx={12} cy={-12} r={2.6} />
                        </g>
                    </g>
                </g>
            </g>
            {state === 'crash' && <g transform="translate(-36 -10)"><g className="ww-chomp"><path className="ww-blade-bit" d="M0 0 q8 -14 0 -26 q-8 12 0 26 Z" /></g></g>}
        </g>
    );
}

function Branch({ state }: { state: ObState }) {
    return (
        <g className={`ww-ob-branch is-${state}`} transform="translate(10 0)">
            {/* A tree on the far bank leans over the lane: its low branch hangs at helmet height. */}
            <g className="ww-branch-sway">
                <path className="ww-branch-wood" d="M44 -90 C 38 -70 32 -50 26 -26" />
                <path className="ww-branch-wood is-twig" d="M30 -70 L8 -52 M28 -46 L48 -34" />
                {[[26, -30, 16], [6, -50, 14], [48, -36, 13], [36, -60, 15], [16, -76, 12]].map(([x, y, r], k) => (
                    <circle key={k} className="ww-branch-leaf" style={v({ '--k': k })} cx={x} cy={y} r={r} />
                ))}
                <g className="ww-nest" transform="translate(30 -20)"><path d="M-10 0 q10 8 20 0 q-10 -4 -20 0 Z" /></g>
            </g>
            {state === 'crash' && <g className="ww-leaves">{[0, 1, 2, 3, 4, 5].map(k => <path key={k} style={v({ '--k': k, '--a': `${k * 55}deg` })} d="M0 0 q8 -6 14 0 q-6 6 -14 0 Z" />)}</g>}
        </g>
    );
}

export function WildObstacle({ kind, state }: { kind: WildKind; state: ObState }) {
    switch (kind) {
        case 'rocks': return <Rocks state={state} />;
        case 'log': return <Log state={state} />;
        case 'whirl': return <Whirl state={state} />;
        case 'drop': return <Drop state={state} />;
        case 'croc': return <Croc state={state} />;
        case 'branch': return <Branch state={state} />;
    }
}
