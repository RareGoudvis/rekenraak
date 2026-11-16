import { useEffect, useRef, useState } from 'react';
import { cueSound, play } from '../../sound';
import type { SkinScreenProps } from '../types';
import DuelScreen from '../../duel/DuelScreen';
import { teamsOf } from '../../duel/teams';
import { useDuelStore } from '../../duel/duelStore';
import { useDuelEvent, useDuelMatch } from '../../duel/useDuel';
import type { Side } from '../../duel/types';
import { Scene, type CastleView, type Debris, type Flight } from './art';
import { aimAt, knockedOff } from './castle';
import { KASTEEL, KASTEEL_RULE, damageOf } from './rule';
import './kasteel.css';

// Kasteel for 1 (against the computer) or 2 on one screen, on the duel engine: a right answer fires that
// side's catapult, the stone takes lives off the other castle when it lands (rule.ts). The stones fly by
// CSS (art.tsx); this file only keeps what the pictures need: where each stone aims, the chunks, the swings.

type Aim = { x: number; y: number };
// Where a stone hits when the castle has nothing left to knock off.
const WALL_MID: Aim = { x: 112, y: -80 };
// Chunks lie on the grass this long.
const DEBRIS_MS = 1400;

interface Fx {
    // Where each stone in the air will hit (castle units of its target); the ref below has the same for the events.
    aims: Record<number, Aim>;
    debris: Debris[];
    // Hits taken and stones fired per castle: restart the shake and the catapult's swing.
    hit: Record<Side, number>;
    fired: Record<Side, number>;
    // The latest throw per castle was a big stone (it rides the arm big).
    bigShot: Record<Side, boolean>;
    big: { side: Side; key: number } | null;
}
const freshFx = (): Fx => ({ aims: {}, debris: [], hit: { left: 0, right: 0 }, fired: { left: 0, right: 0 }, bigShot: { left: false, right: false }, big: null });

export default function Kasteel({ meta, from, onExit }: SkinScreenProps) {
    const st = useDuelMatch(meta, from, KASTEEL_RULE);
    const lives = st.config.lives;
    const [fx, setFx] = useState(freshFx);
    const aims = useRef(new Map<number, Aim>());
    // Where the stone that just landed hit, for its chunks (land comes just before its damage).
    const landedAt = useRef<Aim | null>(null);
    const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
    useEffect(() => {
        const all = timers.current;
        return () => all.forEach(clearTimeout);
    }, []);

    useDuelEvent('roundStart', () => {
        timers.current.forEach(clearTimeout);
        timers.current.clear();
        aims.current.clear();
        setFx(freshFx());
    });
    // A stone leaves: it aims at the block it will knock off (the castle's lives minus what is already on its way).
    useDuelEvent('launch', ({ flight }) => {
        const { sides, flights } = useDuelStore.getState();
        const pending = flights.filter(f => f.id !== flight.id && f.to === flight.to).reduce((n, f) => n + damageOf(f), 0);
        const before = Math.max(0, sides[flight.to].lives - pending);
        const aim = aimAt(Math.max(0, before - damageOf(flight)), lives, before);
        aims.current.set(flight.id, aim);
        const big = !!flight.data.big;
        setFx(v => ({
            ...v, aims: { ...v.aims, [flight.id]: aim }, fired: { ...v.fired, [flight.from]: v.fired[flight.from] + 1 }, bigShot: { ...v.bigShot, [flight.from]: big },
            big: big ? { side: flight.from, key: (v.big?.key ?? 0) + 1 } : v.big,
        }));
    });
    useDuelEvent('land', ({ flight }) => {
        landedAt.current = aims.current.get(flight.id) ?? WALL_MID;
        aims.current.delete(flight.id);
    });
    // The hit: blocks fall off as chunks, or a little dust where it struck.
    useDuelEvent('damage', ({ side, amount, lives: after }) => {
        if (amount <= 0) return;
        const off = knockedOff(after + amount, after, lives);
        const at = landedAt.current ?? WALL_MID;
        const id = Date.now() * 10 + (side === 'left' ? 0 : 5);
        const debris: Debris[] = off.length
            ? off.map((b, i) => ({ id: id + i, side, x: b.x + b.w / 2, y: b.y + b.h / 2, chunks: 3 }))
            : [{ id, side, x: at.x, y: at.y, chunks: 1 }];
        setFx(v => ({ ...v, hit: { ...v.hit, [side]: v.hit[side] + 1 }, debris: [...v.debris, ...debris] }));
        const s = cueSound(meta.sounds, 'hit');
        if (s) play(s);
        const ids = new Set(debris.map(d => d.id));
        const tm = setTimeout(() => { timers.current.delete(tm); setFx(v => ({ ...v, debris: v.debris.filter(d => !ids.has(d.id)) })); }, DEBRIS_MS);
        timers.current.add(tm);
    });

    const teams = teamsOf(st.config);
    const between = st.phase === 'roundEnd' || st.phase === 'matchEnd';
    const castle = (side: Side): CastleView => ({
        hp: st.sides[side].lives, lives, team: side === 'left' ? 'blue' : 'orange', name: teams[side].name,
        hit: fx.hit[side], fired: fx.fired[side], big: fx.bigShot[side], won: between && st.roundWinner === side,
    });
    const flights: Flight[] = st.flights.map(f => ({ id: f.id, from: f.from, big: !!f.data.big, aim: fx.aims[f.id] ?? WALL_MID, ms: KASTEEL.flightMs }));

    return (
        <DuelScreen meta={meta} onExit={onExit} className="ks-duel" hearts={false}
            scene={<Scene view="0 14 640 446" left={castle('left')} right={castle('right')} flights={flights} debris={fx.debris} bigCall={fx.big} />} />
    );
}
