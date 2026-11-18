import type { CSSProperties } from 'react';
import type { DraakKind } from './rule';

// Drakenrace's obstacles in the sky (flat fills under the --spel-ink outline; motions in drakenrace.css). Each is
// drawn with its near edge at x 0 and the lane's flying height at y 0, in the lane's units; `state` picks its
// moment: ahead (idle motion), clear (the dragon got past) or crash (the dragon flew into it). The storm is the
// one the other dragon sent (its glow in that dragon's colour).

const v = (o: Record<string, string | number>) => o as CSSProperties;
export type ObState = 'ahead' | 'clear' | 'crash';

const PUFFS = [[-40, 6, 26], [-14, -12, 32], [20, -16, 34], [52, -4, 28], [74, 10, 20], [14, 12, 36]] as const;

/** A cloud of puffs round its belly's middle (x 40): grumpy grey, or the dark storm. */
function Cloud({ state, storm }: { state: ObState; storm: boolean }) {
    const awake = storm || state !== 'ahead';
    return (
        <g className={`dk-ob-cloud${storm ? ' is-storm' : ''} is-${state}`} transform="translate(40 -6)">
            <g className="dk-cloud-float">
                {storm && <g className="dk-cloud-halo">{PUFFS.map(([x, y, r]) => <circle key={x} cx={x} cy={y} r={r + 8} />)}</g>}
                <g className="dk-cloud-rim">{PUFFS.map(([x, y, r]) => <circle key={x} cx={x} cy={y} r={r} />)}<rect x={-62} y={8} width={150} height={26} rx={13} /></g>
                <g className="dk-cloud-body">
                    {PUFFS.map(([x, y, r], k) => <circle key={x} className="dk-cloud-puff" style={v({ '--k': k, '--dx': `${(x - 14) * 2.2}px`, '--dy': `${(y - 4) * 3 - 20}px` })} cx={x} cy={y} r={r} />)}
                    <rect x={-62} y={8} width={150} height={26} rx={13} />
                </g>
                <ellipse className="dk-cloud-shade" cx={14} cy={26} rx={66} ry={8} />
                {awake ? (
                    <g className="dk-cloud-face">
                        <path className="dk-cloud-brow" d={storm ? 'M-4 -14 L8 -8 M36 -8 L48 -14' : 'M-4 -10 L8 -12 M36 -12 L48 -10'} />
                        <ellipse className="dk-cloud-eye" cx={4} cy={-2} rx={5} ry={6} />
                        <ellipse className="dk-cloud-eye" cx={40} cy={-2} rx={5} ry={6} />
                        <path className="dk-cloud-mouth" d={storm ? 'M10 14 Q22 6 34 14' : 'M12 14 Q22 10 32 14'} />
                    </g>
                ) : (
                    <g className="dk-cloud-face">
                        <path className="dk-cloud-lid" d="M-2 0 Q4 5 10 0 M34 0 Q40 5 46 0" />
                        <path className="dk-cloud-mouth" d="M16 14 Q22 16 28 14" />
                    </g>
                )}
                {/* Rain under it, and the crackle along its belly. */}
                <g className="dk-rain">{[-40, -14, 12, 38, 62].map((x, k) => <path key={x} style={v({ '--k': k })} d={`M${x} 36 l-4 12`} />)}</g>
                <g className="dk-crackle"><path d="M-30 32 L -24 42 L -18 34 L -12 44" /><path d="M40 34 L 46 44 L 52 36 L 58 46" /></g>
            </g>
            {state === 'crash' && <path className="dk-zapbolt" d="M10 30 L-6 60 L6 62 L-16 100" />}
        </g>
    );
}

/** A castle tower standing up from far below, its roof and pennant over the flying height. */
function Tower({ state }: { state: ObState }) {
    return (
        <g className={`dk-ob-tower is-${state}`}>
            {/* It stands up from below the lane: its roof just under the flying height, so a dragon swoops over it. */}
            <rect className="dk-stone" x={14} y={34} width={86} height={240} />
            {[0, 1, 2, 3, 4, 5].map(r => <path key={r} className="dk-mortar" d={`M14 ${64 + r * 38} h86 M${r % 2 ? 40 : 58} ${64 + r * 38} v38`} />)}
            <path className="dk-stone" d="M6 34 h102 v-18 h-14 v8 h-16 v-8 h-14 v8 h-16 v-8 h-14 v8 h-14 v-8 h-14 Z" />
            <path className="dk-tower-roof" d="M8 16 L57 -26 L106 16 Z" />
            <path className="dk-mortar" d="M57 -26 V-50" />
            <g transform="translate(57 -50)"><path className="dk-pennant" d="M0 0 L26 7 L0 14 Z" /></g>
            <path className="dk-window" d="M44 66 a13 13 0 0 1 26 0 v24 h-26 Z" />
            <g className="dk-window-face"><circle cx={52} cy={78} r={2.4} /><circle cx={62} cy={78} r={2.4} /></g>
            {state === 'crash' && <g className="dk-bonk-dust">{[0, 1, 2, 3].map(k => <circle key={k} style={v({ '--k': k })} cx={10} cy={-10 + k * 10} r={9} />)}</g>}
        </g>
    );
}

/** A small bird, wings up (flaps by CSS). */
function Bird({ x, y, k }: { x: number; y: number; k: number }) {
    return (
        <g transform={`translate(${x} ${y})`}>
            <g className="dk-bird" style={v({ '--k': k, '--fx': `${(k % 2 ? 1 : -1) * (30 + k * 12)}px`, '--fy': `${-60 - k * 14}px` })}>
                <g className="dk-bird-bob">
                    <path className="dk-bird-wing is-far" d="M0 -2 Q-10 -18 -20 -14 Q-12 -6 -2 2 Z" />
                    <ellipse className="dk-bird-body" cx={0} cy={0} rx={12} ry={8} />
                    <circle className="dk-bird-body" cx={-10} cy={-5} r={6} />
                    <path className="dk-bird-beak" d="M-15 -6 L-23 -4 L-15 -2 Z" />
                    <circle className="dk-bird-eye" cx={-11} cy={-6} r={1.6} />
                    <path className="dk-bird-wing" d="M2 -2 Q-4 -22 -16 -20 Q-8 -8 4 2 Z" />
                    <path className="dk-bird-tail" d="M11 -2 L22 -6 L20 4 Z" />
                </g>
            </g>
        </g>
    );
}

/** A flock of birds flying the other way (toward the dragon), chirping. */
function Birds({ state }: { state: ObState }) {
    const flock = [[20, -20], [48, -42], [52, 6], [80, -24], [86, 20]] as const;
    return (
        <g className={`dk-ob-birds is-${state}`}>
            {flock.map(([x, y], k) => <Bird key={k} x={x} y={y} k={k} />)}
            <g className="dk-notes">{[0, 1].map(k => <path key={k} style={v({ '--k': k })} className="dk-note" d={`M${40 + k * 40} ${-60 - k * 6} v-12 l8 -3 v12 M${40 + k * 40} ${-60 - k * 6} a3 2.4 0 1 1 -0.1 0`} />)}</g>
            {state === 'crash' && <g className="dk-feathers">{[0, 1, 2, 3, 4, 5].map(k => <path key={k} style={v({ '--k': k, '--a': `${k * 60}deg` })} className="dk-feather" d="M0 0 q6 -10 0 -20 q-6 10 0 20 Z M0 0 v-18" />)}</g>}
        </g>
    );
}

/** A floating island with a tree full of apples, a little waterfall off its edge. */
function Island({ state }: { state: ObState }) {
    return (
        <g className={`dk-ob-island is-${state}`} transform="translate(70 26) scale(.8)">
            <g className="dk-island-float">
                <path className="dk-fall" d="M42 2 L42 120 L54 120 L52 2 Z" />
                <path className="dk-rock" d="M-74 0 C -64 44 -24 76 2 104 C 24 66 58 40 74 0 Z" />
                <path className="dk-rock-line" d="M-36 14 L-22 42 M26 12 L12 48" />
                <ellipse className="dk-grass" cx={0} cy={0} rx={78} ry={13} />
                <g transform="translate(-6 -6)">
                    <g className="dk-tree">
                        <rect className="dk-trunk" x={-6} y={-60} width={12} height={60} rx={4} />
                        <circle className="dk-leaf" cx={0} cy={-84} r={34} />
                        <circle className="dk-leaf" cx={-26} cy={-62} r={22} />
                        <circle className="dk-leaf" cx={26} cy={-62} r={22} />
                        {[[-14, -86], [12, -70], [-28, -60], [20, -96]].map(([x, y], k) => <circle key={k} className="dk-apple" cx={x} cy={y} r={5} />)}
                    </g>
                </g>
                {state === 'crash' && <g className="dk-leaves">{[0, 1, 2, 3, 4, 5, 6].map(k => <path key={k} style={v({ '--k': k, '--a': `${180 + k * 26}deg` })} className="dk-leaf-bit" d="M0 0 q8 -6 14 0 q-6 6 -14 0 Z" />)}</g>}
            </g>
        </g>
    );
}

/** Two crystal pylons (one floating over, one under the flying height) and the crackling arc between them. */
function Gate({ state }: { state: ObState }) {
    return (
        <g className={`dk-ob-gate is-${state}`} transform="translate(40 0)">
            <g className="dk-gate-arc">
                <path className="dk-arc-ink" d="M0 -66 L-10 -40 L8 -18 L-8 6 L10 30 L0 66" />
                <path className="dk-arc-core" d="M0 -66 L-10 -40 L8 -18 L-8 6 L10 30 L0 66" />
                <path className="dk-arc-core is-2" d="M0 -66 L8 -42 L-8 -14 L8 10 L-10 34 L0 66" />
            </g>
            {[-1, 1].map(s => (
                <g key={s} transform={`translate(0 ${s * 76})`}>
                    <g className="dk-pylon-bob" style={v({ '--k': s })}>
                        <path className="dk-crystal" d={s < 0 ? 'M-16 -30 L0 -52 L16 -30 L10 14 L-10 14 Z' : 'M-16 30 L0 52 L16 30 L10 -14 L-10 -14 Z'} />
                        <path className="dk-crystal-shine" d={s < 0 ? 'M-6 -30 L0 -42 L4 -30' : 'M-6 30 L0 42 L4 30'} />
                        <circle className="dk-orb" cx={0} cy={s * -14} r={8} />
                    </g>
                </g>
            ))}
            {state === 'crash' && <g className="dk-sparks">{[0, 1, 2, 3, 4, 5, 6, 7].map(k => <path key={k} style={v({ '--a': `${k * 45}deg` })} d="M0 0 L0 -14" />)}</g>}
        </g>
    );
}

/** A striped hot-air balloon with a little sheep in the basket, waving. */
function Balloon({ state }: { state: ObState }) {
    return (
        <g className={`dk-ob-balloon is-${state}`} transform="translate(60 -20)">
            <g className="dk-balloon-float">
                <path className="dk-env" d="M0 -78 C 48 -78 62 -30 46 2 C 36 22 16 34 10 44 L -10 44 C -16 34 -36 22 -46 2 C -62 -30 -48 -78 0 -78 Z" />
                <path className="dk-env-stripe" d="M0 -78 C 18 -60 22 -10 10 44 L -10 44 C -22 -10 -18 -60 0 -78 Z" />
                <path className="dk-env-line" d="M-30 -60 C -40 -30 -30 10 -10 44 M30 -60 C 40 -30 30 10 10 44" />
                <path className="dk-rope-s" d="M-10 44 L-14 64 M10 44 L14 64" />
                <rect className="dk-basket" x={-18} y={62} width={36} height={24} rx={4} />
                <path className="dk-basket-weave" d="M-18 70 h36 M-18 78 h36 M-8 62 v24 M4 62 v24" />
                <g className="dk-sheep" transform="translate(0 58)">
                    <circle className="dk-wool" cx={-6} cy={0} r={8} /><circle className="dk-wool" cx={6} cy={-2} r={8} /><circle className="dk-wool" cx={0} cy={-8} r={7} />
                    <ellipse className="dk-sheep-face" cx={-12} cy={-2} rx={6} ry={7} />
                    <circle className="dk-sheep-eye" cx={-14} cy={-4} r={1.4} />
                    <path className="dk-sheep-arm" d="M-18 4 L-26 -6" />
                </g>
            </g>
            {state === 'crash' && <g className="dk-boing-lines">{[0, 1, 2].map(k => <path key={k} style={v({ '--k': k })} d={`M-58 ${-30 + k * 22} q-10 6 0 12`} />)}</g>}
        </g>
    );
}

export function DraakObstacle({ kind, state }: { kind: DraakKind; state: ObState }) {
    switch (kind) {
        case 'cloud': return <Cloud state={state} storm={false} />;
        case 'storm': return <Cloud state={state} storm />;
        case 'tower': return <Tower state={state} />;
        case 'birds': return <Birds state={state} />;
        case 'island': return <Island state={state} />;
        case 'gate': return <Gate state={state} />;
        case 'balloon': return <Balloon state={state} />;
    }
}
