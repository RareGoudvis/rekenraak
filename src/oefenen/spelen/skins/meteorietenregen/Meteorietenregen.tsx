import { useEffect, useRef, useState } from 'react';
import type { SkinScreenProps } from '../types';
import DuelScreen from '../../duel/DuelScreen';
import { useDuelStore } from '../../duel/duelStore';
import { useDuelEvent, useDuelMatch } from '../../duel/useDuel';
import { SIDES, otherSide, type Side } from '../../duel/types';
import { Scene, type BaseView, type Impact, type MeteorView, type Mood } from './art';
import { strikeAt, toScene, type Pt } from './geometry';
import { METEOR_RULE, incomingTo, shieldLayerFor, shieldsOf } from './rule';
import { playMeteor } from './sounds';
import './meteorietenregen.css';

// Meteorietenregen for 1 (against the computer) or 2 on one screen, on the duel engine (rule.ts). This file
// keeps what the pictures need: which shield each meteor will strike, the impacts, the calls, the moods and
// the shakes; the engine decides every hit when the meteor lands.

// How long a mood, an impact and a call last.
const MOOD_MS = { cheer: 900, hit: 1300, calm: 1000 } as const;
const IMPACT_MS = { hit: 1700, block: 1300, boom: 3200 } as const;
const CALL_MS = 1200;
// The alarm beeps this long after the launch; the falling whistle starts this long before the landing.
const ALARM_AT = 350;
const WHISTLE_BEFORE = 1250;

type Shake = { kind: 'light' | 'hit' | 'boom'; n: number };
interface Call { id: number; text: string; at: Pt; tone: 'boom' | 'block' | 'shield' }

interface Fx {
    // The shield each meteor in the air will strike (0 = the roof).
    layers: Record<number, number>;
    fired: Record<Side, number>;
    impacts: Impact[];
    calls: Call[];
    mood: Record<Side, Mood | null>;
    breaking: Record<Side, BaseView['breaking']>;
    shake: Shake | null;
}
const freshFx = (): Fx => ({ layers: {}, fired: { left: 0, right: 0 }, impacts: [], calls: [], mood: { left: null, right: null }, breaking: { left: null, right: null }, shake: null });

// Over a base's roof, a little towards the middle (clear of the hearts), where its calls pop up.
const callAt = (side: Side, high = false): Pt => toScene(side, { x: 50, y: high ? -186 : -170 });

export default function Meteorietenregen({ meta, from, onExit }: SkinScreenProps) {
    const st = useDuelMatch(meta, from, METEOR_RULE);
    const [fx, setFx] = useState(freshFx);
    const seq = useRef(1);
    const layers = useRef(new Map<number, number>());
    const landed = useRef<{ id: number; layer: number } | null>(null);
    const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
    const after = (ms: number, fn: () => void) => {
        const t = setTimeout(() => { timers.current.delete(t); fn(); }, ms);
        timers.current.add(t);
    };
    useEffect(() => {
        const all = timers.current;
        return () => all.forEach(clearTimeout);
    }, []);

    // The latest mood per side: an older mood's timer must not clear a newer one.
    const moodKey = useRef<Record<Side, number>>({ left: 0, right: 0 });
    const setMood = (side: Side, mood: Mood, ms: number) => {
        const n = seq.current++;
        moodKey.current[side] = n;
        setFx(v => ({ ...v, mood: { ...v.mood, [side]: mood } }));
        after(ms, () => { if (moodKey.current[side] === n) setFx(v => ({ ...v, mood: { ...v.mood, [side]: null } })); });
    };
    const addImpact = (i: Omit<Impact, 'id'>) => {
        const id = seq.current++;
        setFx(v => ({ ...v, impacts: [...v.impacts, { ...i, id }] }));
        after(IMPACT_MS[i.kind], () => setFx(v => ({ ...v, impacts: v.impacts.filter(x => x.id !== id) })));
    };
    const addCall = (c: Omit<Call, 'id'>) => {
        const id = seq.current++;
        setFx(v => ({ ...v, calls: [...v.calls, { ...c, id }] }));
        after(CALL_MS, () => setFx(v => ({ ...v, calls: v.calls.filter(x => x.id !== id) })));
    };
    const shake = (kind: Shake['kind']) => setFx(v => ({ ...v, shake: { kind, n: (v.shake?.n ?? 0) + 1 } }));

    useDuelEvent('roundStart', () => {
        timers.current.forEach(clearTimeout);
        timers.current.clear();
        layers.current.clear();
        setFx(freshFx());
    });

    // A meteor leaves: which shield will it strike (the target's shields minus the meteors that land first)?
    useDuelEvent('launch', ({ flight }) => {
        const { sides, flights } = useDuelStore.getState();
        const layer = shieldLayerFor(shieldsOf(sides[flight.to]), flights, flight);
        layers.current.set(flight.id, layer);
        setFx(v => ({ ...v, layers: { ...v.layers, [flight.id]: layer }, fired: { ...v.fired, [flight.from]: v.fired[flight.from] + 1 } }));
        setMood(flight.from, 'cheer', MOOD_MS.cheer);
        playMeteor('launch');
        const inAir = () => useDuelStore.getState().flights.some(f => f.id === flight.id);
        after(ALARM_AT, () => { if (inAir()) playMeteor('alarm'); });
        after(Math.max(0, flight.landsAt - flight.startedAt - WHISTLE_BEFORE), () => { if (inAir()) playMeteor('whistle'); });
    });
    useDuelEvent('land', ({ flight }) => {
        landed.current = { id: flight.id, layer: layers.current.get(flight.id) ?? 0 };
        layers.current.delete(flight.id);
    });

    useDuelEvent('effect', ({ by, cause, effect }) => {
        // Two in a row: a shield goes up over this side's base.
        if (cause !== 'land') {
            if (effect.tag === 'shield') {
                playMeteor('shieldUp');
                addCall({ text: 'Schild!', at: callAt(by, true), tone: 'shield' });
            }
            return;
        }
        const target = otherSide(by);
        const aimed = landed.current?.layer ?? 0;
        landed.current = null;
        const { sides } = useDuelStore.getState();
        if (effect.tag === 'blocked') {
            // The outer shield takes it: a ripple, sparks, rock bits bouncing off, and that layer breaks.
            const layer = (shieldsOf(sides[target]) + 1) as 1 | 2;
            addImpact({ kind: 'block', side: target, at: toScene(target, strikeAt(aimed || layer)), layer });
            setFx(v => ({ ...v, breaking: { ...v.breaking, [target]: { layer, key: seq.current++ } } }));
            addCall({ text: 'Geblokt!', at: callAt(target), tone: 'block' });
            setMood(target, 'calm', MOOD_MS.calm);
            shake('light');
            playMeteor('shieldBlock');
            return;
        }
        const at = toScene(target, strikeAt(0));
        if (sides[target].lives <= 0) {
            // The last life: the base blows up and leaves a smoking crater.
            addImpact({ kind: 'boom', side: target, at: toScene(target, { x: 0, y: -50 }) });
            addCall({ text: 'KABOEM!', at: callAt(target, true), tone: 'boom' });
            shake('boom');
            playMeteor('bigBoom');
            return;
        }
        addImpact({ kind: 'hit', side: target, at });
        addCall({ text: 'BOEM!', at: callAt(target), tone: 'boom' });
        setMood(target, 'hit', MOOD_MS.hit);
        shake('hit');
        playMeteor('impact');
    });

    // Fireworks over the winner: a few pops while the round's win plays.
    useDuelEvent('roundEnd', ({ winner }) => {
        if (winner === 'draw') return;
        [700, 1500, 2300].forEach(ms => after(ms, () => playMeteor('firework')));
    });

    const between = st.phase === 'roundEnd' || st.phase === 'matchEnd';
    const winner = between && st.roundWinner !== 'draw' ? st.roundWinner : null;
    const moodOf = (side: Side): Mood => {
        const me = st.sides[side];
        if (between) return winner === side ? 'won' : me.lives <= 0 ? 'sooty' : 'idle';
        const now = fx.mood[side];
        if (now) return now;
        const coming = incomingTo(st.flights, side);
        if (!coming) return 'idle';
        return shieldsOf(me) >= coming ? 'calm' : 'panic';
    };
    const base = (side: Side): BaseView => ({
        hp: st.sides[side].lives, lives: st.config.lives, shields: shieldsOf(st.sides[side]), alarm: !between && incomingTo(st.flights, side) > 0,
        fired: fx.fired[side], mood: moodOf(side), breaking: fx.breaking[side],
    });
    const meteors: MeteorView[] = st.flights.map(f => ({ id: f.id, from: f.from, to: f.to, layer: fx.layers[f.id] ?? 0, ms: f.landsAt - f.startedAt, startedAt: f.startedAt }));
    const shakeCls = fx.shake ? ` is-shake-${fx.shake.kind}-${fx.shake.n % 2}` : '';

    return (
        <DuelScreen meta={meta} onExit={onExit} className="mt-app" rightNote="Gelanceerd!"
            scene={(
                <div className={`mt-scene${shakeCls}`} data-shields={SIDES.map(s => shieldsOf(st.sides[s])).join(',')}>
                    <Scene left={base('left')} right={base('right')} meteors={meteors} impacts={fx.impacts} calls={fx.calls} winner={winner} />
                </div>
            )} />
    );
}

