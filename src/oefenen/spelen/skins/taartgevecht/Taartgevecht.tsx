import { useEffect, useRef, useState } from 'react';
import type { SkinScreenProps } from '../types';
import DuelScreen from '../../duel/DuelScreen';
import { useDuelEvent, useDuelMatch } from '../../duel/useDuel';
import type { Side } from '../../duel/types';
import { CardArt, Scene, type ContestantView, type Look, type Mood, type PieFlight, type Splat } from './art';
import { TAART, TAART_RULE, creamBlobs } from './rule';
import { playTaart } from './sounds';
import './taartgevecht.css';

// Taartgevecht on the duel engine: one shared sum, both type at once; the first right answer throws a cream
// pie (rule.ts), a wrong answer makes that contestant dizzy for the 2 s lock. This file keeps what the
// pictures need (hits per face, throws, splats, the crowd) from the engine's events; art.tsx draws them.

// A face stays stunned this long after a pie; a splat's splash and sticker play this long (the last one slower).
const STUN_MS = 900;
const SPLAT_MS = { normal: 1000, final: 2000 } as const;
const OOH_MS = 900;
// The loser starts licking the cream once the last splat has settled.
const SLURP_AT = 1500;

interface Fx {
    hits: Record<Side, number>;
    thrown: Record<Side, number>;
    finalThrow: Record<Side, boolean>;
    jolt: Record<Side, number>;
    stunned: Record<Side, boolean>;
    splats: Splat[];
    slowmo: { to: Side; key: number } | null;
    ooh: number;
    oohOn: boolean;
}
const both = <T,>(v: T): Record<Side, T> => ({ left: v, right: v });
const freshFx = (): Fx => ({
    hits: both(0), thrown: both(0), finalThrow: both(false), jolt: both(0), stunned: both(false), splats: [], slowmo: null, ooh: 0, oohOn: false,
});

export default function Taartgevecht({ meta, from, onExit }: SkinScreenProps) {
    const st = useDuelMatch(meta, from, TAART_RULE, { stream: 'shared', wrongLockMs: TAART.wrongLockMs });
    const [fx, setFx] = useState(freshFx);
    const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
    const later = (ms: number, fn: () => void) => {
        const tm = setTimeout(() => { timers.current.delete(tm); fn(); }, ms);
        timers.current.add(tm);
    };
    useEffect(() => {
        const all = timers.current;
        return () => all.forEach(clearTimeout);
    }, []);

    useDuelEvent('roundStart', () => {
        timers.current.forEach(clearTimeout);
        timers.current.clear();
        setFx(freshFx());
    });
    useDuelEvent('launch', ({ flight }) => {
        const final = !!flight.data.final;
        setFx(v => ({
            ...v, thrown: { ...v.thrown, [flight.from]: v.thrown[flight.from] + 1 }, finalThrow: { ...v.finalThrow, [flight.from]: final },
            slowmo: final ? { to: flight.to, key: (v.slowmo?.key ?? 0) + 1 } : v.slowmo,
        }));
        playTaart('throw');
        if (final) playTaart('drumroll');
    });
    useDuelEvent('damage', ({ side, amount, tag }) => {
        if (amount <= 0) return;
        const final = tag === 'final';
        const id = Date.now() * 10 + (side === 'left' ? 0 : 5);
        setFx(v => ({
            ...v, hits: { ...v.hits, [side]: v.hits[side] + amount }, jolt: { ...v.jolt, [side]: v.jolt[side] + 1 },
            stunned: { ...v.stunned, [side]: true }, splats: [...v.splats, { id, side, final }], ooh: v.ooh + 1, oohOn: true,
        }));
        playTaart(final ? 'bigSplat' : 'splat');
        later(140, () => playTaart('ooh'));
        later(STUN_MS * (final ? 1.6 : 1), () => setFx(v => ({ ...v, stunned: { ...v.stunned, [side]: false } })));
        later(OOH_MS, () => setFx(v => ({ ...v, oohOn: false })));
        later(final ? SPLAT_MS.final : SPLAT_MS.normal, () => setFx(v => ({ ...v, splats: v.splats.filter(s => s.id !== id) })));
    });
    useDuelEvent('wrong', () => playTaart('dizzy'));
    useDuelEvent('roundEnd', ({ winner }) => {
        later(450, () => playTaart('applause'));
        if (winner !== 'draw') later(SLURP_AT, () => playTaart('slurp'));
    });

    const between = st.phase === 'roundEnd' || st.phase === 'matchEnd';
    const solo = st.config.players === 1;
    const looks: Record<Side, Look> = { left: 'kid-a', right: solo ? 'robot' : 'kid-b' };
    const lives = st.config.lives;
    const moodOf = (side: Side): Mood => {
        const me = st.sides[side];
        if (between && st.roundWinner === side) return 'win';
        if (fx.stunned[side]) return 'hit';
        if (between) return 'lose';
        // Locked without a result of its own: a wrong answer (or out of tries) on this sum.
        if (st.phase === 'play' && me.locked && !me.feedback) return 'dizzy';
        return 'idle';
    };
    const view = (side: Side): ContestantView => ({
        side, look: looks[side], mood: moodOf(side), blobs: creamBlobs(fx.hits[side], lives), creamed: fx.hits[side] >= lives,
        thrown: fx.thrown[side], jolt: fx.jolt[side], finalThrow: fx.finalThrow[side],
    });
    const flights: PieFlight[] = st.flights.map(f => ({ id: f.id, from: f.from, final: !!f.data.final, ms: f.landsAt - f.startedAt }));
    const winner = between ? st.roundWinner : null;
    const crowd = winner && winner !== 'draw' ? 'cheer' : fx.oohOn ? 'ooh' : 'calm';
    const cardWinner = st.phase === 'matchEnd' ? st.matchWinner : st.roundWinner;

    return (
        <DuelScreen meta={meta} onExit={onExit} className="tg-app" rightNote="Raak!"
            cardArt={<CardArt winner={cardWinner} looks={looks} />}
            scene={<>
                <Scene left={view('left')} right={view('right')} flights={flights} splats={fx.splats} crowd={crowd} crowdBeat={fx.ooh}
                    slowmo={fx.slowmo} confetti={winner && winner !== 'draw' ? winner : null} />
                {fx.slowmo && <div key={fx.slowmo.key} className="tg-vignette" aria-hidden />}
            </>} />
    );
}
