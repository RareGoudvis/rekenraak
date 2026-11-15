import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { SpelSignBox } from '../../SpelVisual';
import SpelKeypad from '../../SpelKeypad';
import type { SkinEndingProps, SkinProps } from '../types';
import { Scene, type Debris, type Flight, type SideKey } from './art';
import { aimAt, knockedOff } from './castle';
import { KASTEEL, advance, clockShotAt, damageOf, endDue, isBig, launch, levelOf, livesOf, siegeOf, type Shot, type Siege, type Who } from './siege';
import './kasteel.css';

// Kasteel, 1 player: your castle on the left, the computer's on the right. A right answer fires your
// catapult (5 in a row: a big stone), a mistake and the computer's slow clock fire back (siege.ts).
// A castle at 0 crumbles; yours = the friendly early end, theirs = the win. One small interval keeps
// play time (paused under help); the throws and flights run by CSS (art.tsx), timed so a stone arrives
// exactly flightMs after its fire, when siege.ts lands it.

const TICK_MS = 50;
// Chunks lie on the grass this long.
const DEBRIS_MS = 1400;

const sideOf = (who: Who): SideKey => (who === 'me' ? 'left' : 'right');
// The castle a shot hits.
const targetOf = (shot: Pick<Shot, 'by'>): Who => (shot.by === 'me' ? 'foe' : 'me');
const hpOf = (s: Siege, who: Who) => (who === 'me' ? s.mine : s.theirs);

type Aim = { x: number; y: number };
interface View {
    siege: Siege;
    // Where each stone in the air will hit (castle units of its target).
    aims: Record<number, Aim>;
    debris: Debris[];
    // Hits taken and stones fired, per castle: restart the shake and the catapult's swing.
    hit: Record<Who, number>;
    fired: Record<Who, number>;
    // The latest throw per castle was a big stone (it rides the arm big).
    bigShot: Record<Who, boolean>;
    big: number;
}

/** Where a new stone will hit: the castle's lives minus what is already on its way there. */
function aimFor(s: Siege, shot: Shot, alsoInAir: readonly Shot[] = []) {
    const target = targetOf(shot);
    const pending = [...s.shots, ...alsoInAir].filter(x => x.id !== shot.id && targetOf(x) === target).reduce((n, x) => n + damageOf(x), 0);
    const before = Math.max(0, hpOf(s, target) - pending);
    return aimAt(Math.max(0, before - damageOf(shot)), s.lives, before);
}

export default function Kasteel({ question, phase, feedback, onAnswer, onFail, onFinish, sound, progress, options, events, reducedMotion }: SkinProps) {
    const level = levelOf(options);
    const lives = livesOf(options);
    const flightMs = reducedMotion ? 0 : KASTEEL.flightMs;
    const [view, setView] = useState<View>(() => ({ siege: siegeOf(lives), aims: {}, debris: [], hit: { me: 0, foe: 0 }, fired: { me: 0, foe: 0 }, bigShot: { me: false, foe: false }, big: 0 }));
    // The latest siege and aims between renders (the interval and the events both move it on).
    const latest = useRef({ siege: view.siege, aims: new Map<number, Aim>() });

    const live = useRef({ phase, key: question?.key, onFail, onFinish, sound });
    useLayoutEffect(() => { live.current = { phase, key: question?.key, onFail, onFinish, sound }; });
    // The question on which help was opened: its right answer fires a normal stone, never a big one.
    const helpedKey = useRef<string | undefined>(undefined);
    const ended = useRef(false);
    // When the play-time interval last ran: a stone fired between ticks lands that much later, so the hit
    // never comes before the stone (siege time lags real time by up to one tick).
    const tickAt = useRef(0);
    const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
    useEffect(() => {
        const all = timers.current;
        return () => all.forEach(clearTimeout);
    }, []);

    // The session's answers fire the catapults.
    useEffect(() => {
        const fire = (by: Who, big: boolean) => {
            const before = latest.current.siege;
            const late = Math.min(TICK_MS, Math.max(0, Date.now() - tickAt.current));
            const s = launch(before, by, big, flightMs + late);
            if (s === before) return;
            const shot = s.shots[s.shots.length - 1];
            const aim = aimFor(before, shot);
            latest.current.siege = s;
            latest.current.aims.set(shot.id, aim);
            setView(v => ({ ...v, siege: s, aims: { ...v.aims, [shot.id]: aim }, fired: { ...v.fired, [by]: v.fired[by] + 1 }, bigShot: { ...v.bigShot, [by]: shot.big }, big: shot.big ? v.big + 1 : v.big }));
        };
        const offs = [
            events.on('help', () => { helpedKey.current = live.current.key; }),
            events.on('correct', ({ streak }) => fire('me', isBig(streak, helpedKey.current !== undefined && helpedKey.current === live.current.key))),
            events.on('wrong', () => fire('foe', false)),
        ];
        return () => offs.forEach(off => off());
    }, [events, flightMs]);

    // Play time: the computer's clock shots, stones landing, the end once a castle has crumbled.
    useEffect(() => {
        let last = Date.now();
        tickAt.current = last;
        const id = window.setInterval(() => {
            const t = Date.now();
            const dt = t - last;
            last = t;
            tickAt.current = t;
            if (live.current.phase === 'help' || ended.current) return;
            const before = latest.current.siege;
            const aims = latest.current.aims;
            const step = advance(before, level, dt, flightMs);
            latest.current.siege = step.siege;
            const newAims: Record<number, Aim> = {};
            step.fired.forEach((shot, i) => { newAims[shot.id] = aimFor(before, shot, step.fired.slice(0, i)); aims.set(shot.id, newAims[shot.id]); });
            if (step.fired.length) live.current.sound('launch');
            const debris: Debris[] = [];
            const hit = { me: 0, foe: 0 };
            if (step.landed.length) {
                live.current.sound('hit');
                const hp = { me: before.mine, foe: before.theirs };
                for (const shot of step.landed) {
                    const who = targetOf(shot);
                    const after = Math.max(0, hp[who] - damageOf(shot));
                    const off = knockedOff(hp[who], after, lives);
                    const aim = aims.get(shot.id) ?? aimAt(after, lives, hp[who]);
                    hp[who] = after;
                    hit[who]++;
                    aims.delete(shot.id);
                    if (reducedMotion) continue;
                    if (off.length) off.forEach(b => debris.push({ id: shot.id * 10 + debris.length, side: sideOf(who), x: b.x + b.w / 2, y: b.y + b.h / 2, chunks: 3 }));
                    else debris.push({ id: shot.id * 10, side: sideOf(who), x: aim.x, y: aim.y, chunks: 1 });
                }
                if (debris.length) {
                    const ids = new Set(debris.map(d => d.id));
                    const tm = setTimeout(() => { timers.current.delete(tm); setView(v => ({ ...v, debris: v.debris.filter(d => !ids.has(d.id)) })); }, DEBRIS_MS);
                    timers.current.add(tm);
                }
            }
            if (step.fired.length || step.landed.length) {
                setView(v => ({
                    ...v, siege: step.siege, aims: { ...v.aims, ...newAims }, debris: [...v.debris, ...debris],
                    hit: { me: v.hit.me + hit.me, foe: v.hit.foe + hit.foe }, fired: { ...v.fired, foe: v.fired.foe + step.fired.length },
                    bigShot: step.fired.length ? { ...v.bigShot, foe: false } : v.bigShot,
                }));
            }
            if (endDue(step.siege)) {
                ended.current = true;
                if (step.siege.over!.winner === 'me') live.current.onFinish?.({});
                else live.current.onFail();
            }
        }, TICK_MS);
        return () => window.clearInterval(id);
    }, [level, lives, flightMs, reducedMotion]);

    const { siege, aims } = view;
    const fx = view;
    if (!question) return <div className="ks-root" />;
    const over = siege.over;
    const flash = phase === 'right' || phase === 'wrong';
    const flights: Flight[] = reducedMotion ? [] : siege.shots.map(s => ({ id: s.id, from: sideOf(s.by), big: s.big, aim: aims[s.id] ?? { x: 112, y: -80 }, ms: flightMs }));
    const cl = siege.clock;
    const reload = over ? null : {
        key: cl,
        ms: cl === 0 ? KASTEEL.levels[level].firstMs : KASTEEL.levels[level].everyMs,
        offset: siege.t - (cl === 0 ? 0 : clockShotAt(level, cl - 1)),
    };
    // Toward the big stone: one stone per right answer in a row.
    const toBig = progress.streak % KASTEEL.bigEvery;
    return (
        <div className={`ks-root${phase === 'help' ? ' is-paused' : ''}${reducedMotion ? ' is-still' : ''}`}>
            <div className="ks-world">
                {/* Only the pupil's win gets the cheering kids: a lost castle is just a heap of stones. */}
                <Scene
                    left={{ hp: siege.mine, lives, team: 'blue', name: 'Jij', hit: fx.hit.me, fired: fx.fired.me, big: fx.bigShot.me, won: over?.winner === 'me' }}
                    right={{ hp: siege.theirs, lives, team: 'orange', name: 'Computer', hit: fx.hit.foe, fired: fx.fired.foe }}
                    flights={flights} debris={fx.debris} reload={reload} bigCall={fx.big ? { side: 'left', key: fx.big } : null}
                />
            </div>
            <div className="ks-panel">
                <SpelSignBox className="ks-sign" question={question} feedback={feedback} flash={flash} answerClassName={`ks-sign-answer${feedback?.correct === false ? ' is-wrong' : ''}`} />
                <p className="ks-streak" aria-label={`Nog ${KASTEEL.bigEvery - toBig} juist voor een grote steen`}>
                    {Array.from({ length: KASTEEL.bigEvery }, (_, i) => <span key={i} className={`ks-pip${i < toBig ? ' is-on' : ''}`} aria-hidden />)}
                    <span className="ks-streak-label" aria-hidden>Grote steen</span>
                </p>
                <SpelKeypad questionKey={question.key} onAnswer={onAnswer} disabled={phase !== 'play' || !!over} />
            </div>
        </div>
    );
}

// The end screen: won = your castle with its flag up high and two cheering kids, theirs a heap of stones;
// your castle down = a heap of stones on your side (no one hurt, just blocks).
export function KasteelEnding({ outcome, options, reducedMotion }: SkinEndingProps) {
    const lives = livesOf(options);
    const won = outcome !== 'failed';
    return (
        <div className={`spel-ending ks-ending${reducedMotion ? ' is-still' : ''}`}>
            <Scene view="-20 140 680 270" bars={false}
                left={{ hp: won ? lives : 0, lives, team: 'blue', name: 'Jij', hit: 0, fired: 0, won }}
                right={{ hp: won ? 0 : lives, lives, team: 'orange', name: 'Computer', hit: 0, fired: 0 }}
                flights={[]} debris={[]}
            />
        </div>
    );
}
