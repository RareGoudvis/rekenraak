import { useState } from 'react';
import type { SkinScreenProps } from '../types';
import { Clouds } from '../../scene';
import DuelScreen from '../../duel/DuelScreen';
import { useDuelEvent, useDuelMatch } from '../../duel/useDuel';
import { ropeOf } from '../../duel/rules';
import { SIDES, type Side } from '../../duel/types';
import { TOUW, TOUW_RULE } from './rule';
import './touwtrekken.css';

// Touwtrekken on the duel engine: each right answer pulls the flag one step to that side (ropeRule: the other
// side −1, this side +1). "Levens" is how far: the flag that many steps past the middle wins the round, or
// after 2 minutes the side it leans to. The rope moves by CSS transition.

// One rope step in scene units (the scene is 1000 wide, the flag starts at 500).
const STEP = 30;

// A friendly bear facing right, feet at (0, 0), hands on the rope at (44, -55).
function Bear() {
    return (
        <g className="tt-bear-art">
            <rect className="tt-leg" x="-18" y="-40" width="14" height="38" rx="6" />
            <rect className="tt-leg" x="4" y="-40" width="14" height="38" rx="6" />
            <ellipse className="tt-shoe" cx="-8" cy="-2" rx="13" ry="6" />
            <ellipse className="tt-shoe" cx="14" cy="-2" rx="13" ry="6" />
            <ellipse className="tt-shirt" cx="0" cy="-62" rx="28" ry="31" />
            <circle className="tt-fur" cx="-17" cy="-130" r="9" />
            <circle className="tt-fur" cx="19" cy="-130" r="9" />
            <circle className="tt-fur" cx="0" cy="-108" r="27" />
            <ellipse className="tt-muzzle" cx="9" cy="-100" rx="13" ry="10" />
            <circle className="tt-dot" cx="16" cy="-104" r="4.5" />
            <circle className="tt-dot" cx="-4" cy="-115" r="3.6" />
            <circle className="tt-dot" cx="12" cy="-117" r="3.6" />
            <path className="tt-smile" d="M3 -94 Q10 -89 17 -94" />
            <path className="tt-arm" d="M6 -76 L44 -55" />
            <path className="tt-arm" d="M-4 -66 L40 -55" />
            <circle className="tt-hand" cx="44" cy="-55" r="7" />
        </g>
    );
}

// A bear's latest move: a heave (a right answer, with dust) or a slip (a miss); n restarts it.
type Move = { kind: 'heave' | 'slip'; n: number };
const STILL: Record<Side, Move> = { left: { kind: 'heave', n: 0 }, right: { kind: 'heave', n: 0 } };

interface SceneProps { rope: number; steps: number; winner: Side | null; moves: Record<Side, Move> }

function Scene({ rope, steps, winner, moves }: SceneProps) {
    const win = steps * STEP;
    return (
        <svg className="tt-scene" viewBox="0 0 1000 260" preserveAspectRatio="xMidYMax meet" aria-hidden>
            <rect className="tt-grass" x="-600" y="220" width="2200" height="40" />
            <ellipse className="tt-mud" cx="500" cy="232" rx="70" ry="9" />
            {/* The middle and the two winning lines stay put; the rope and the bears move. */}
            <path className="tt-mid" d="M500 180 L500 240" />
            {SIDES.map(side => {
                const x = 500 + (side === 'left' ? -win : win);
                return (
                    <g key={side} className={`tt-mark is-${side}`}>
                        <path className="tt-mark-line" d={`M${x} 196 L${x} 240`} />
                        <path className="tt-mark-flag" d={`M${x} 196 L${x + (side === 'left' ? -26 : 26)} 204 L${x} 212 Z`} />
                    </g>
                );
            })}
            <g className="tt-pull" style={{ transform: `translateX(${rope * STEP}px)` }} data-rope={rope}>
                <path className="tt-rope" d="M258 165 L742 165" />
                <path className="tt-rope-twist" d="M258 165 L742 165" />
                <path className="tt-flag" d="M500 163 L486 204 L514 204 Z" />
                {SIDES.map(side => {
                    const m = moves[side];
                    const move = winner === side ? ' is-cheer' : winner ? ' is-fall' : m.n ? ` is-${m.kind}` : '';
                    return (
                        <g key={side} className={`tt-bear is-${side}`} transform={side === 'left' ? 'translate(214 220)' : 'translate(786 220) scale(-1 1)'}>
                            <g key={m.n} className={`tt-bear-move${move}`}>
                                <Bear />
                            </g>
                            {m.n > 0 && m.kind === 'heave' && !winner && <g key={`d${m.n}`} className="tt-dust"><circle cx="-24" cy="-4" r="9" /><circle cx="-36" cy="-10" r="6" /><circle cx="-14" cy="-12" r="5" /></g>}
                        </g>
                    );
                })}
            </g>
        </svg>
    );
}

export default function Touwtrekken({ meta, from, onExit }: SkinScreenProps) {
    const st = useDuelMatch(meta, from, TOUW_RULE, { roundSeconds: TOUW.seconds });
    const [moves, setMoves] = useState(STILL);
    const move = (side: Side, kind: Move['kind']) => setMoves(m => ({ ...m, [side]: { kind, n: m[side].n + 1 } }));
    useDuelEvent('roundStart', () => setMoves(STILL));
    useDuelEvent('right', ({ side }) => move(side, 'heave'));
    useDuelEvent('wrong', ({ side }) => move(side, 'slip'));
    useDuelEvent('timeout', ({ side }) => move(side, 'slip'));
    const winner = (st.phase === 'roundEnd' || st.phase === 'matchEnd') && st.roundWinner !== 'draw' ? st.roundWinner : null;
    return (
        <DuelScreen meta={meta} onExit={onExit} className="tt-app" hearts={false} rightNote="Trek!"
            scene={<>
                <Clouds layer="far" outline={false} count={3} band={[4, 34]} size={[90, 150]} />
                <Clouds layer="near" count={2} band={[6, 30]} size={[110, 170]} seed={7} />
                <Scene rope={ropeOf(st.sides)} steps={st.config.lives} winner={winner} moves={moves} />
            </>} />
    );
}
