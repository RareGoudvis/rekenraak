import { useEffect, useRef, useState } from 'react';
import type { SkinScreenProps } from '../types';
import DuelScreen from '../../duel/DuelScreen';
import { Clouds } from '../../scene';
import { useDuelStore } from '../../duel/duelStore';
import { useDuelEvent, useDuelMatch } from '../../duel/useDuel';
import type { Side } from '../../duel/types';
import { Scene, ShieldCard, type CallView, type KnightView } from './art';
import { ROW, clashAt, knightX } from './geometry';
import { JOUST_RULE, baanOf, lanceDown, tiltReason } from './rule';
import { playJoust } from './sounds';
import './steekspel.css';

// Steekspel for 1 (against the computer) or 2 on one screen, on the duel engine (rule.ts). This file turns the
// engine's events into the list's moments: a gallop step per right answer, the lance going down after 3 in a row,
// the horse's sneeze on a mistake, and at the round's end the tilt: both lances down, the crash, the loser into
// the hay (helmet off, stars round the head; nobody gets hurt), the winner's horse rearing under the petals.

const STEP_MS = 520;
// The tilt: the last step lands, the lances crash; the hay, the fanfare and the birds after it.
const TILT = { impactMs: 620, hayMs: 1480, fanfareMs: 1150, reasonMs: 1250, tweetMs: [1900, 2700] } as const;
const CALL_MS = 1300;

type Count = Record<Side, number>;
interface Tilt { winner: Side | 'draw'; reason: 'steps' | 'lance' | 'draw'; hit: boolean; at: { x: number; y: number } }
interface Fx {
    step: Count;
    oops: Count;
    lance: Count;
    calls: CallView[];
    cheer: number;
    tilt: Tilt | null;
}
const zero = (): Count => ({ left: 0, right: 0 });
const freshFx = (): Fx => ({ step: zero(), oops: zero(), lance: zero(), calls: [], cheer: 0, tilt: null });

// Over a knight's helmet, where its calls pop up.
const callY = (side: Side) => ROW[side].y - (side === 'left' ? 178 : 196);

export default function Steekspel({ meta, from, onExit }: SkinScreenProps) {
    const st = useDuelMatch(meta, from, JOUST_RULE);
    const baan = baanOf(st.config);
    const [fx, setFx] = useState(freshFx);
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
    const bump = (k: 'step' | 'oops' | 'lance', side: Side) => setFx(v => ({ ...v, [k]: { ...v[k], [side]: v[k][side] + 1 } }));
    const addCall = (c: Omit<CallView, 'id'>) => {
        const id = seq.current++;
        setFx(v => ({ ...v, calls: [...v.calls, { ...c, id }] }));
        after(CALL_MS, () => setFx(v => ({ ...v, calls: v.calls.filter(x => x.id !== id) })));
    };
    const xOf = (side: Side) => knightX(side, useDuelStore.getState().sides[side].points, baan);

    useDuelEvent('roundStart', () => {
        timers.current.forEach(clearTimeout);
        timers.current.clear();
        setFx(freshFx());
    });

    useDuelEvent('points', ({ side }) => {
        bump('step', side);
        playJoust('gallop');
    });
    useDuelEvent('effect', ({ by, cause, effect }) => {
        if (cause !== 'right' || effect.tag !== 'lance') return;
        bump('lance', by);
        setFx(v => ({ ...v, cheer: v.cheer + 1 }));
        playJoust('shing');
        addCall({ text: 'Lans omlaag!', x: xOf(by), y: callY(by), tone: 'lance' });
    });
    const oops = (side: Side) => {
        bump('oops', side);
        playJoust('sneeze');
        addCall({ text: 'Hatsjoe!', x: xOf(side) + (side === 'left' ? 70 : -70), y: callY(side), tone: 'oops' });
    };
    useDuelEvent('wrong', ({ side }) => oops(side));
    useDuelEvent('timeout', ({ side }) => oops(side));

    // The tilt: the knights have met. Both lances go down, then the crash decides who lands in the hay.
    useDuelEvent('roundEnd', ({ winner }) => {
        const s = useDuelStore.getState();
        const view = { sides: { left: s.sides.left, right: s.sides.right }, config: s.config };
        const reason = tiltReason(view) ?? (winner === 'draw' ? 'draw' : 'steps');
        const at = clashAt(xOf('left'), xOf('right'));
        setFx(v => ({ ...v, tilt: { winner, reason, hit: false, at } }));
        after(TILT.impactMs, () => {
            setFx(v => ({ ...v, cheer: v.cheer + 1, tilt: v.tilt && { ...v.tilt, hit: true } }));
            playJoust('bonk');
            addCall({ text: 'BONK!', x: at.x, y: at.y - 70, tone: 'bonk' });
        });
        after(TILT.reasonMs, () => {
            if (winner === 'draw') addCall({ text: 'Gelijk!', x: at.x, y: at.y - 70, tone: 'win' });
            else if (reason === 'lance') addCall({ text: 'De lans wint!', x: xOf(winner), y: callY(winner), tone: 'lance' });
        });
        if (winner === 'draw') return;
        after(TILT.hayMs, () => playJoust('hay'));
        after(TILT.fanfareMs, () => playJoust('fanfare'));
        TILT.tweetMs.forEach(ms => after(ms, () => playJoust('tweet')));
    });

    const tilt = fx.tilt;
    const knight = (side: Side): KnightView => {
        const me = st.sides[side];
        const hit = tilt?.hit ? (tilt.winner === 'draw' ? 'draw' : tilt.winner === side ? 'won' : 'fell') : null;
        return {
            side, x: knightX(side, me.points, baan), lance: lanceDown(me), couch: !!tilt, step: fx.step[side], oops: fx.oops[side],
            lanceKey: fx.lance[side], tilt: hit, moveMs: STEP_MS,
        };
    };
    const won = tilt?.hit && tilt.winner !== 'draw' ? tilt.winner : null;

    return (
        <DuelScreen meta={meta} onExit={onExit} className="stk-app" hearts={false} points rightNote="Galop!"
            cardArt={won ? <ShieldCard side={won} /> : undefined}
            scene={(
                <div className="stk-scene" data-points={`${st.sides.left.points},${st.sides.right.points}`} data-lances={`${+lanceDown(st.sides.left)},${+lanceDown(st.sides.right)}`}>
                    <Clouds layer="far" outline={false} count={3} band={[2, 14]} size={[90, 140]} seed={4} />
                    <Clouds layer="mid" count={2} band={[0, 10]} size={[80, 120]} seed={9} />
                    <Scene knights={{ left: knight('left'), right: knight('right') }} calls={fx.calls} cheer={fx.cheer}
                        clash={tilt?.hit ? { ...tilt.at, draw: tilt.winner === 'draw', n: st.round } : null}
                        winnerX={won ? knightX(won, st.sides[won].points, baan) : null} />
                </div>
            )} />
    );
}
