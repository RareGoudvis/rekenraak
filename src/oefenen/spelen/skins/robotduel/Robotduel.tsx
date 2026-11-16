import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ShieldWarning } from '@phosphor-icons/react';
import type { SkinScreenProps } from '../types';
import DuelScreen from '../../duel/DuelScreen';
import { teamsOf, type Teams } from '../../duel/teams';
import { ScoreStar } from '../../duel/DuelHud';
import { useDuelStore } from '../../duel/duelStore';
import { useDuelEvent, useDuelMatch } from '../../duel/useDuel';
import { SIDES, type Side } from '../../duel/types';
import { CardRobot, Portrait, Scene, type Pow, type RobotView } from './art';
import { MODEL } from './geometry';
import { ROBOT, ROBOT_RULE, chargeOf, kindOf, parseHitTag, type HitKind } from './rule';
import { playRobot } from './sounds';
import './robotduel.css';

// Robotduel on the duel engine: two robots in a ring; a right answer is a punch (rule.ts: 3 in a row = the
// special for 2, a dropped guard takes double). This file turns the engine's events into the scene's moments:
// the wind-up (launch), the impact (land + damage: a comic POW, sparks, shake), the guard drop (wrong), the KO.

// A POW stays this long.
const POW_MS = 900;
// The words on a hit, in turn; the special and a hit on a dropped guard have their own.
const WORDS = ['BAM!', 'POW!', 'BOEM!', 'PAF!', 'BENG!'] as const;
const SPECIAL_WORD = 'KABOEM!';
const DOUBLE_WORD = 'KRAK!';

type Atk = RobotView['atk'];
type Hit = RobotView['hit'];
interface Fx {
    atk: Record<Side, Atk>;
    hit: Record<Side, Hit>;
    oops: Record<Side, number>;
    pows: Pow[];
    // Screen shakes so far and how hard the latest one is.
    shake: { n: number; big: boolean };
}
const freshFx = (): Fx => ({
    atk: { left: { n: 0, kind: 'punch' }, right: { n: 0, kind: 'punch' } },
    hit: { left: { n: 0, kind: 'punch', double: false }, right: { n: 0, kind: 'punch', double: false } },
    oops: { left: 0, right: 0 }, pows: [], shake: { n: 0, big: false },
});

// The fighting-game health bars on top: a segment per life, the round's score, the special meter, a warning when the guard is down.
function Bars({ teams }: { teams: Teams }) {
    const sides = useDuelStore(s => s.sides);
    const max = useDuelStore(s => s.config.lives);
    return (
        <div className="rd-hud">
            {SIDES.map(side => {
                const me = sides[side];
                const f = me.lives / max;
                const tone = f > 0.6 ? 'is-ok' : f > 0.3 ? 'is-mid' : 'is-low';
                const charge = chargeOf(me.streak);
                return (
                    <div key={side} className={`rd-bar is-${side} ${tone}`}>
                        <Portrait side={side} />
                        <div className="rd-bar-main">
                            <span className="rd-bar-top">
                                <span className="rd-bar-name">{teams[side].name}</span>
                                <ScoreStar value={me.right} className="rd-score" />
                            </span>
                            <span className="rd-segs" role="img" aria-label={`${me.lives} van ${max} levens`} data-lives={me.lives}>
                                {Array.from({ length: max }, (_, i) => {
                                    const full = side === 'left' ? i < me.lives : i >= max - me.lives;
                                    return <i key={i} className={`rd-seg${full ? '' : ' is-lost'}`} />;
                                })}
                            </span>
                            <span className={`rd-meter${charge === ROBOT.specialEvery - 1 ? ' is-ready' : ''}`} role="img" aria-label={charge === ROBOT.specialEvery - 1 ? 'Supermove klaar' : 'Supermove laden'}>
                                {Array.from({ length: ROBOT.specialEvery }, (_, i) => <i key={i} className={`rd-pip${i < charge ? ' is-on' : ''}`} />)}
                            </span>
                        </div>
                        {!!me.flags.guard && <span className="rd-guard" role="img" aria-label="Dekking weg"><ShieldWarning weight="fill" /></span>}
                    </div>
                );
            })}
        </div>
    );
}

// "Ronde 2", then "Vechten!" on the start; "K.O.!" when a robot falls.
function Banner({ ko }: { ko: 'one' | 'both' | null }) {
    const phase = useDuelStore(s => s.phase);
    const round = useDuelStore(s => s.round);
    const bestOf = useDuelStore(s => s.config.bestOf);
    if (phase === 'ready') return <p className="rd-banner is-ready" key={`r${round}`}>{bestOf > 1 ? `Ronde ${round}` : 'Klaar?'}</p>;
    if (phase === 'play') return <p className="rd-banner is-go" key={`g${round}`} aria-hidden>Vechten!</p>;
    if (ko) return <p className="rd-banner is-ko" key={`k${round}`}>{ko === 'both' ? 'Dubbel K.O.!' : 'K.O.!'}</p>;
    return null;
}

export default function Robotduel({ meta, from, onExit }: SkinScreenProps) {
    const st = useDuelMatch(meta, from, ROBOT_RULE);
    const [fx, setFx] = useState(freshFx);
    const word = useRef(0);
    const powId = useRef(1);
    const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
    useEffect(() => {
        const all = timers.current;
        return () => all.forEach(clearTimeout);
    }, []);
    const later = (ms: number, fn: () => void) => {
        const t = setTimeout(() => { timers.current.delete(t); fn(); }, ms);
        timers.current.add(t);
    };

    useDuelEvent('roundStart', () => {
        timers.current.forEach(clearTimeout);
        timers.current.clear();
        setFx(freshFx());
    });
    useDuelEvent('play', () => playRobot('bell'));
    // The wind-up: the attacker's arm goes (a special charges first).
    useDuelEvent('launch', ({ flight }) => {
        const kind: HitKind = kindOf(flight);
        setFx(v => ({ ...v, atk: { ...v.atk, [flight.from]: { n: v.atk[flight.from].n + 1, kind } } }));
        if (kind === 'punch') playRobot('whirr');
        else { playRobot('charge'); playRobot(MODEL[flight.from] === 'bruiser' ? 'rocket' : 'laser'); }
    });
    // The impact: the hit robot reels, a comic POW, sparks, the screen shakes; at 0 it falls apart.
    useDuelEvent('damage', ({ side, amount, lives, tag }) => {
        if (amount <= 0) return;
        const { kind, double } = parseHitTag(tag);
        const id = powId.current++;
        const text = kind === 'special' ? SPECIAL_WORD : double ? DOUBLE_WORD : WORDS[word.current++ % WORDS.length];
        const big = kind === 'special' || double || lives === 0;
        setFx(v => ({
            ...v, hit: { ...v.hit, [side]: { n: v.hit[side].n + 1, kind, double } },
            pows: [...v.pows, { id, side, kind, double, word: text }], shake: { n: v.shake.n + 1, big },
        }));
        later(POW_MS, () => setFx(v => ({ ...v, pows: v.pows.filter(p => p.id !== id) })));
        playRobot(kind === 'special' ? 'boom' : 'punch');
        if (double) playRobot('crit');
        if (lives === 0) { playRobot('explode'); playRobot('roar'); }
    });
    const oops = (side: Side) => {
        setFx(v => ({ ...v, oops: { ...v.oops, [side]: v.oops[side] + 1 } }));
        playRobot('powerDown');
    };
    useDuelEvent('wrong', ({ side }) => oops(side));
    useDuelEvent('timeout', ({ side }) => oops(side));
    useDuelEvent('matchEnd', () => playRobot('roar'));

    const teams = teamsOf(st.config);
    const between = st.phase === 'roundEnd' || st.phase === 'matchEnd';
    const max = st.config.lives;
    const robot = (side: Side): RobotView => {
        const me = st.sides[side];
        return {
            side, model: MODEL[side], lives: me.lives, max, atk: fx.atk[side], hit: fx.hit[side], oops: fx.oops[side],
            guardDown: !!me.flags.guard && !between, ready: st.phase === 'play' && chargeOf(me.streak) === ROBOT.specialEvery - 1, won: between && st.roundWinner === side, ko: me.lives <= 0,
        };
    };
    const kos = SIDES.filter(s => st.sides[s].lives <= 0).length;
    const winner = between && st.roundWinner !== 'draw' ? st.roundWinner : null;
    const shake = fx.shake.n ? ` rd-shake-${fx.shake.n % 2}${fx.shake.big ? ' is-big' : ''}` : '';

    return (
        <DuelScreen meta={meta} onExit={onExit} className="rd-app" hearts={false} score={false} rightNote="Raak!"
            cardArt={winner ? <CardRobot side={winner} /> : undefined}
            scene={<>
                <div className={`rd-cam${shake}`} style={{ '--rd-shake-x': fx.shake.big ? '14px' : '7px' } as CSSProperties}>
                    <Scene left={robot('left')} right={robot('right')} pows={fx.pows} hits={fx.hit.left.n + fx.hit.right.n} cheer={between ? st.roundWinner : null} />
                </div>
                <Bars teams={teams} />
                <Banner ko={between && kos ? (kos === 2 ? 'both' : 'one') : null} />
            </>} />
    );
}
