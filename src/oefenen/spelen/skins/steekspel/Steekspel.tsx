import { useEffect, useRef, useState } from 'react';
import type { SkinScreenProps } from '../types';
import DuelScreen from '../../duel/DuelScreen';
import { Clouds } from '../../scene';
import { useDuelStore } from '../../duel/duelStore';
import { useDuelEvent, useDuelMatch } from '../../duel/useDuel';
import type { Side } from '../../duel/types';
import { Scene, ShieldCard, type CallView, type KnightView } from './art';
import { ROW, clashAt, knightX } from './geometry';
import { GEAR_CALL, JOUST, JOUST_RULE, gearGained, gearOf } from './rule';
import { playJoust } from './sounds';
import './steekspel.css';

// Steekspel for 1 (against the computer) or 2 on one screen, on the duel engine (rule.ts). One joust = one minute
// (the engine's round clock): both knights wait at their end of the list while the pupils answer, and every right
// answer shows on that knight (the horse stamps, the score board swings, every few a new piece of gear). In the last
// seconds the lances go down and the horses paw; when the minute is up they gallop at each other and tilt: the
// loser lands in the hay (helmet off, stars round the head; nobody gets hurt), the winner's horse rears under the
// petals; the same score breaks both lances and nobody falls.

// The charge from both ends to the middle (ms): it ends in the crash.
const CHARGE_MS = 1400;
// After the crash: the hay, the fanfare, the reason call and the birds.
const TILT = { impactMs: CHARGE_MS, hayMs: CHARGE_MS + 860, fanfareMs: CHARGE_MS + 530, reasonMs: CHARGE_MS + 640, tweetMs: [CHARGE_MS + 1280, CHARGE_MS + 2080] } as const;
const CALL_MS = 1300;
// The last seconds are watched this often (ms): the lances go down, the hourglass shakes.
const WATCH_MS = 200;
// The hourglass shakes over the last this many seconds.
const LOW_SECONDS = 10;

type Count = Record<Side, number>;
interface Tilt { winner: Side | 'draw'; hit: boolean; at: { x: number; y: number } }
interface Fx {
    stamp: Count;
    oops: Count;
    gained: Count;
    calls: CallView[];
    cheer: number;
    tilt: Tilt | null;
}
const zero = (): Count => ({ left: 0, right: 0 });
const freshFx = (): Fx => ({ stamp: zero(), oops: zero(), gained: zero(), calls: [], cheer: 0, tilt: null });

// Over a knight's helmet, where its calls pop up.
const callY = (side: Side) => ROW[side].y - (side === 'left' ? 196 : 214);

export default function Steekspel({ meta, from, onExit }: SkinScreenProps) {
    const st = useDuelMatch(meta, from, JOUST_RULE, { roundSeconds: JOUST.seconds });
    const [fx, setFx] = useState(freshFx);
    // The minute's last seconds (ready) and last ten (low), and whether the hourglass runs.
    const [clock, setClock] = useState({ run: false, ready: false, low: false });
    const seq = useRef(1);
    const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
    const after = (ms: number, fn: () => void) => {
        const t = setTimeout(() => { timers.current.delete(t); fn(); }, ms);
        timers.current.add(t);
    };
    useEffect(() => {
        const all = timers.current;
        return () => all.forEach(clearTimeout);
    }, []);
    const bump = (k: 'stamp' | 'oops' | 'gained', side: Side) => setFx(v => ({ ...v, [k]: { ...v[k], [side]: v[k][side] + 1 } }));
    const addCall = (c: Omit<CallView, 'id'>) => {
        const id = seq.current++;
        setFx(v => ({ ...v, calls: [...v.calls, { ...c, id }] }));
        after(CALL_MS, () => setFx(v => ({ ...v, calls: v.calls.filter(x => x.id !== id) })));
    };

    // The last seconds: read from the engine's round clock (it shifts by a pause; a paused minute stands still).
    useEffect(() => {
        if (st.phase !== 'play' || st.paused) return;
        const look = () => {
            const ends = useDuelStore.getState().roundEndsAt;
            if (ends === null) return;
            const left = ends - Date.now();
            const ready = left <= JOUST.readySeconds * 1000, low = left <= LOW_SECONDS * 1000;
            setClock(c => (c.ready === ready && c.low === low && c.run ? c : { run: true, ready, low }));
        };
        const t = setInterval(look, WATCH_MS);
        return () => clearInterval(t);
    }, [st.phase, st.paused]);

    useDuelEvent('roundStart', () => {
        timers.current.forEach(clearTimeout);
        timers.current.clear();
        setFx(freshFx());
        setClock({ run: false, ready: false, low: false });
    });

    useDuelEvent('points', ({ side, points }) => {
        bump('stamp', side);
        playJoust('stamp');
        const piece = gearGained(points);
        if (piece) {
            bump('gained', side);
            setFx(v => ({ ...v, cheer: v.cheer + 1 }));
            playJoust('shing');
            addCall({ text: GEAR_CALL[piece], x: knightX(side, false), y: callY(side), tone: 'lance' });
        } else addCall({ text: '+1', x: knightX(side, false) + (side === 'left' ? 46 : -46), y: callY(side), tone: 'plus' });
    });
    const oops = (side: Side) => {
        bump('oops', side);
        playJoust('sneeze');
        addCall({ text: 'Hatsjoe!', x: knightX(side, false) + (side === 'left' ? 70 : -70), y: callY(side), tone: 'oops' });
    };
    useDuelEvent('wrong', ({ side }) => oops(side));
    useDuelEvent('timeout', ({ side }) => oops(side));

    // The minute is up: the knights charge, the crash decides who lands in the hay.
    useDuelEvent('roundEnd', ({ winner }) => {
        const at = clashAt(knightX('left', true), knightX('right', true));
        setClock(c => ({ ...c, ready: true, low: false }));
        setFx(v => ({ ...v, tilt: { winner, hit: false, at } }));
        playJoust('charge');
        addCall({ text: 'Daar gaan ze!', x: at.x, y: 60, tone: 'win' });
        after(TILT.impactMs, () => {
            setFx(v => ({ ...v, cheer: v.cheer + 1, tilt: v.tilt && { ...v.tilt, hit: true } }));
            playJoust('bonk');
            addCall({ text: 'BONK!', x: at.x, y: at.y - 70, tone: 'bonk' });
        });
        after(TILT.reasonMs, () => {
            const s = useDuelStore.getState().sides;
            if (winner === 'draw') addCall({ text: 'Gelijk!', x: at.x, y: at.y - 70, tone: 'win' });
            else addCall({ text: `${s[winner].points} tegen ${s[winner === 'left' ? 'right' : 'left'].points}!`, x: knightX(winner, true), y: callY(winner), tone: 'lance' });
        });
        if (winner === 'draw') return;
        after(TILT.hayMs, () => playJoust('hay'));
        after(TILT.fanfareMs, () => playJoust('fanfare'));
        TILT.tweetMs.forEach(ms => after(ms, () => playJoust('tweet')));
    });

    const tilt = fx.tilt;
    const charging = !!tilt;
    const knight = (side: Side): KnightView => {
        const me = st.sides[side];
        const hit = tilt?.hit ? (tilt.winner === 'draw' ? 'draw' : tilt.winner === side ? 'won' : 'fell') : null;
        return {
            side, x: knightX(side, charging), gear: gearOf(me.points), rights: me.points, ready: clock.ready || charging, charging,
            stamp: fx.stamp[side], oops: fx.oops[side], gained: fx.gained[side], tilt: hit, moveMs: CHARGE_MS,
        };
    };
    const won = tilt?.hit && tilt.winner !== 'draw' ? tilt.winner : null;

    return (
        <DuelScreen meta={meta} onExit={onExit} className="stk-app" hearts={false} score={false} points rightNote="Goed zo!"
            cardArt={won ? <ShieldCard side={won} /> : undefined}
            scene={(
                <div className="stk-scene" data-points={`${st.sides.left.points},${st.sides.right.points}`} data-ready={+clock.ready}>
                    <Clouds layer="far" outline={false} count={3} band={[2, 14]} size={[90, 140]} seed={4} />
                    <Clouds layer="mid" count={2} band={[0, 10]} size={[80, 120]} seed={9} />
                    <Scene knights={{ left: knight('left'), right: knight('right') }} calls={fx.calls} cheer={fx.cheer}
                        glass={{ n: st.round, run: clock.run, low: clock.low && !charging }}
                        clash={tilt?.hit ? { ...tilt.at, draw: tilt.winner === 'draw', n: st.round } : null}
                        winnerX={won ? knightX(won, true) : null} />
                </div>
            )} />
    );
}
