import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { SkinScreenProps } from '../types';
import DuelScreen from '../../duel/DuelScreen';
import { useDuelStore } from '../../duel/duelStore';
import { useDuelEvent, useDuelMatch } from '../../duel/useDuel';
import { SIDES, type Side } from '../../duel/types';
import { Scene, TruckBodyCard, type CallView, type RowView, type TruckView } from './art';
import { rowOf, truckX } from './geometry';
import { TRUCK_RULE, finishOf, rampAhead } from './rule';
import { playTruck } from './sounds';
import './monstertrucks.css';

// Monstertrucks for 1 (against the computer) or 2 on one screen, on the duel engine (rule.ts). This file turns the
// engine's events into the arena's moments: gas (a roll forward, mud, a puff), the ramp that waits after 2 in a row,
// the jump that flattens the cars, the wheelie on a mistake, the finish with the winner's donut and the confetti.

// How long a step and a jump glide; when the truck lands on the cars; how long a call stays.
const MOVE_MS = { gas: 450, jump: 820 } as const;
const LAND_AT = 560;
const CALL_MS = 1200;
const LEAVE_MS = 420;
// The donut's squeals while the win plays.
const SCREECH_AT = [500, 1400, 2300] as const;

type Count = Record<Side, number>;
interface Fx {
    gas: Count;
    jump: Count;
    oops: Count;
    move: Record<Side, number>;
    rows: RowView[];
    calls: CallView[];
    cheer: number;
}
const zero = (): Count => ({ left: 0, right: 0 });
const freshFx = (): Fx => ({ gas: zero(), jump: zero(), oops: zero(), move: { left: MOVE_MS.gas, right: MOVE_MS.gas }, rows: [], calls: [], cheer: 0 });

export default function Monstertrucks({ meta, from, onExit }: SkinScreenProps) {
    const st = useDuelMatch(meta, from, TRUCK_RULE);
    const finish = finishOf(st.config);
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
    const bump = (k: 'gas' | 'jump' | 'oops', side: Side) => setFx(v => ({ ...v, [k]: { ...v[k], [side]: v[k][side] + 1 } }));
    const addCall = (c: Omit<CallView, 'id'>) => {
        const id = seq.current++;
        setFx(v => ({ ...v, calls: [...v.calls, { ...c, id }] }));
        after(CALL_MS, () => setFx(v => ({ ...v, calls: v.calls.filter(x => x.id !== id) })));
    };

    const playing = st.phase === 'play';
    // The ramp waiting in front of each truck right now (read by the mistake handler: a broken streak rolls it away).
    const waitingAt = (side: Side) => {
        const me = st.sides[side];
        return playing && rampAhead(me.streak) && me.points < finish ? truckX(me.points, finish) : null;
    };
    const waiting = useRef<Record<Side, number | null>>({ left: null, right: null });
    useLayoutEffect(() => { waiting.current = { left: waitingAt('left'), right: waitingAt('right') }; });
    const rampShown = useRef<Record<Side, number | null>>({ left: null, right: null });
    useEffect(() => {
        for (const side of SIDES) {
            const at = waitingAt(side);
            if (at !== null && rampShown.current[side] !== at) playTruck('ramp');
            rampShown.current[side] = at;
        }
    });

    useDuelEvent('roundStart', () => {
        timers.current.forEach(clearTimeout);
        timers.current.clear();
        setFx(freshFx());
    });

    useDuelEvent('points', ({ side, amount, points, tag }) => {
        if (tag === 'jump') {
            const id = `r${seq.current++}`;
            const row: RowView = { id, side, x: truckX(points - amount, finish), cars: rowOf(finish).cars, flat: false, waiting: false, leaving: false };
            setFx(v => ({ ...v, rows: [...v.rows, row], move: { ...v.move, [side]: MOVE_MS.jump } }));
            bump('jump', side);
            playTruck('boost');
            addCall({ text: 'Sprong!', side, x: truckX(points, finish) - 60, tone: 'jump' });
            // The landing waits while the duel is paused (the hop's CSS stands still too).
            const land = () => {
                if (useDuelStore.getState().paused) { after(100, land); return; }
                setFx(v => ({ ...v, cheer: v.cheer + 1, rows: v.rows.map(r => (r.id === id ? { ...r, flat: true } : r)) }));
                playTruck('crunch');
            };
            after(LAND_AT, land);
            return;
        }
        setFx(v => ({ ...v, move: { ...v.move, [side]: MOVE_MS.gas } }));
        bump('gas', side);
        playTruck('rev');
    });

    const oops = (side: Side) => {
        bump('oops', side);
        playTruck('wheelie');
        addCall({ text: 'Wheelie!', side, x: truckX(st.sides[side].points, finish) - 60, tone: 'oops' });
        const at = waiting.current[side];
        if (at === null) return;
        // The ramp that was waiting rolls away: the streak is broken.
        const id = `w${seq.current++}`;
        setFx(v => ({ ...v, rows: [...v.rows, { id, side, x: at, cars: rowOf(finish).cars, flat: false, waiting: false, leaving: true }] }));
        after(LEAVE_MS, () => setFx(v => ({ ...v, rows: v.rows.filter(r => r.id !== id) })));
    };
    useDuelEvent('wrong', ({ side }) => oops(side));
    useDuelEvent('timeout', ({ side }) => oops(side));

    useDuelEvent('roundEnd', ({ winner }) => {
        if (winner === 'draw') return;
        setFx(v => ({ ...v, cheer: v.cheer + 1 }));
        addCall({ text: 'Finish!', side: winner, x: truckX(finish, finish) - 60, tone: 'win' });
        playTruck('horn');
        SCREECH_AT.forEach(ms => after(ms, () => playTruck('screech')));
    });

    const between = st.phase === 'roundEnd' || st.phase === 'matchEnd';
    const winner = between && st.roundWinner !== 'draw' ? st.roundWinner : null;
    const truck = (side: Side): TruckView => ({
        side, x: truckX(st.sides[side].points, finish), gas: fx.gas[side], jump: fx.jump[side], oops: fx.oops[side],
        won: winner === side, lost: !!winner && winner !== side, moveMs: fx.move[side],
    });
    const rows: RowView[] = [...fx.rows];
    for (const side of SIDES) {
        const at = waitingAt(side);
        if (at !== null) rows.push({ id: `wait-${side}-${st.sides[side].points}`, side, x: at, cars: rowOf(finish).cars, flat: false, waiting: true, leaving: false });
    }

    return (
        <DuelScreen meta={meta} onExit={onExit} className="mtk-app" hearts={false} points rightNote="Gas!"
            cardArt={winner ? <TruckBodyCard side={winner} /> : undefined}
            scene={(
                <div className="mtk-scene" data-points={SIDES.map(s => st.sides[s].points).join(',')}>
                    <Scene trucks={{ left: truck('left'), right: truck('right') }} rows={rows} calls={fx.calls} cheer={fx.cheer} winner={winner} />
                </div>
            )} />
    );
}
