import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Crown, Star } from '@phosphor-icons/react';
import type { SkinScreenProps } from '../types';
import DuelScreen from '../../duel/DuelScreen';
import { teamsOf, type Teams } from '../../duel/teams';
import { useDuelStore } from '../../duel/duelStore';
import { useDuelEvent, useDuelMatch } from '../../duel/useDuel';
import { SIDES, type Side } from '../../duel/types';
import { BugArt, Frog, PondBack, PondFront, Popup, Splash, Tongue, type FrogPose, type Snap } from './art';
import { BUG_POINTS, BUG_SCALE, FROG_AT, POND, createPondKeeper, distance, type Bug, type Pt } from './pond';
import { KIKKER, kikkerRule, modeOf } from './rule';
import { playKikker } from './sounds';
import './kikkers.css';

// Kikkers en vliegjes on the duel engine: each right answer is a tongue snap at a bug over the pond (its
// points for that frog), each mistake costs a life. The bugs fly on paths of time (pond.ts), placed every
// frame here; the frogs' moments are counters that restart CSS one-shots (art.tsx).

type PerSide = Record<Side, number>;
interface Fx {
    snap: PerSide;
    gulp: PerSide;
    burp: PerSide;
    hurt: PerSide;
    // A golden dragonfly arrived: both frogs look up.
    notice: number;
    splashes: { id: number; x: number; y: number; big: boolean }[];
}
const zero = (): PerSide => ({ left: 0, right: 0 });
const freshFx = (): Fx => ({ snap: zero(), gulp: zero(), burp: zero(), hurt: zero(), notice: 0, splashes: [] });
const bump = (p: PerSide, side: Side): PerSide => ({ ...p, [side]: p[side] + 1 });

// The tongue's whole out-and-back (kikkers.css .kv-tongue); the gulp follows it.
const TONGUE_MS = 380;
const SNAP_SHOW_MS = 1300;
const SPLASH_MS = 1100;
// One gulp in this many ends in a little burp.
const BURP_EVERY = 5;
const TICK_MS = 200;
// Eyes: how far the pupils move toward what they look at (frog units).
const LOOK = 5;
// The eyes' middle, frog units (art.tsx Eyes).
const EYES = { x: 27, y: -129 };

let ids = 1;

export default function Kikkers({ meta, from, onExit }: SkinScreenProps) {
    const mode = modeOf(meta.chosen);
    const [keeper] = useState(() => createPondKeeper(Date.now()));
    // The rule takes the bug inside answer(); the screen hears of it through onSnap (below).
    const [rule] = useState(() => kikkerRule(mode, side => keeper.snap(side, Date.now()).bug.kind));
    const st = useDuelMatch(meta, from, rule, mode === 'tijd' ? { roundSeconds: KIKKER.seconds } : {});
    const [bugs, setBugs] = useState<Bug[]>(() => keeper.drawn());
    const [snaps, setSnaps] = useState<Snap[]>([]);
    const [fx, setFx] = useState(freshFx);
    const bugEls = useRef(new Map<number, SVGGElement>());
    const pupils = useRef<Record<Side, SVGGElement | null>>({ left: null, right: null });
    const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

    const later = (ms: number, fn: () => void) => {
        const tm = setTimeout(() => { timers.current.delete(tm); fn(); }, ms);
        timers.current.add(tm);
    };
    const refresh = () => {
        const next = keeper.drawn();
        setBugs(prev => (prev.length === next.length && prev.every((b, i) => b.id === next[i].id) ? prev : next));
    };
    const splash = (side: Side, big: boolean) => {
        const id = ids++;
        const x = FROG_AT[side].x + (side === 'left' ? -1 : 1) * (big ? 30 : 80);
        setFx(v => ({ ...v, splashes: [...v.splashes, { id, x, y: FROG_AT[side].y + 10, big }] }));
        later(SPLASH_MS, () => setFx(v => ({ ...v, splashes: v.splashes.filter(s => s.id !== id) })));
    };

    // A snap (inside answer()): the tongue goes out for the bug this frog gets.
    const onSnap = ({ side, bug, at }: { side: Side; bug: Bug; at: Pt }) => {
        refresh();
        const mouth = POND.mouths[side];
        const snap: Snap = {
            id: ids++, side, kind: bug.kind, points: BUG_POINTS[bug.kind], at,
            len: distance(mouth, at), angle: (Math.atan2(at.y - mouth.y, at.x - mouth.x) * 180) / Math.PI,
        };
        setSnaps(s => [...s, snap]);
        setFx(v => ({ ...v, snap: bump(v.snap, side) }));
        playKikker('snap');
        if (bug.kind !== 'fly') later(POND.tongueMs, () => playKikker(bug.kind === 'dragonfly' ? 'sparkle' : 'crunch'));
        later(TONGUE_MS, () => {
            setFx(v => ({ ...v, gulp: bump(v.gulp, side) }));
            playKikker('gulp');
            if (Math.random() < 1 / BURP_EVERY) later(420, () => { setFx(v => ({ ...v, burp: bump(v.burp, side) })); playKikker('burp'); });
        });
        later(SNAP_SHOW_MS, () => setSnaps(s => s.filter(x => x.id !== snap.id)));
    };
    const snapRef = useRef(onSnap);
    useLayoutEffect(() => { snapRef.current = onSnap; });
    useEffect(() => keeper.onSnap(s => snapRef.current(s)), [keeper]);

    useEffect(() => {
        const all = timers.current;
        // Spawns and departures; a new golden dragonfly makes both frogs look up.
        const tick = setInterval(() => {
            if (keeper.tick(Date.now())) {
                setFx(v => ({ ...v, notice: v.notice + 1 }));
                playKikker('golden');
            }
            refresh();
        }, TICK_MS);
        // Dev builds: the screenshot harnesses call a golden dragonfly (window.__kikker.summon(Date.now())).
        if (import.meta.env.DEV) (window as unknown as { __kikker?: typeof keeper }).__kikker = keeper;
        return () => { clearInterval(tick); all.forEach(clearTimeout); };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh only reads the keeper and a setter
    }, [keeper]);

    // Every frame: each bug to its place on its path (facing the way it flies), each frog's pupils toward its bug.
    useEffect(() => {
        if (typeof requestAnimationFrame !== 'function') return;
        let raf = 0;
        const frame = () => {
            const now = Date.now();
            for (const b of keeper.drawn()) {
                const el = bugEls.current.get(b.id);
                if (!el) continue;
                const p = keeper.placeOf(b, now);
                if (!p) { el.setAttribute('visibility', 'hidden'); continue; }
                const prev = keeper.placeOf(b, now - 60) ?? p;
                const dir = p.x >= prev.x ? 1 : -1;
                const tilt = Math.max(-18, Math.min(18, (p.y - prev.y) * 2));
                const s = BUG_SCALE[b.kind];
                el.setAttribute('visibility', 'visible');
                el.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${(tilt * dir).toFixed(1)}) scale(${dir * s} ${s})`);
            }
            for (const side of SIDES) {
                const el = pupils.current[side];
                const to = keeper.lookAt(side, now);
                if (!el) continue;
                const mirror = side === 'left' ? 1 : -1;
                const eye = { x: FROG_AT[side].x + mirror * EYES.x, y: FROG_AT[side].y + EYES.y };
                const d = to ? distance(eye, to) || 1 : 1;
                const dx = to ? ((to.x - eye.x) / d) * LOOK * mirror : 0;
                const dy = to ? ((to.y - eye.y) / d) * LOOK : 0;
                el.setAttribute('transform', `translate(${dx.toFixed(2)} ${dy.toFixed(2)})`);
            }
            raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);
        return () => cancelAnimationFrame(raf);
    }, [keeper]);

    useDuelEvent('roundStart', () => {
        timers.current.forEach(clearTimeout);
        timers.current.clear();
        keeper.reset(Date.now());
        refresh();
        setSnaps([]);
        setFx(freshFx());
    });
    // A mistake: the frog gets dizzy and slips a foot in the water.
    useDuelEvent('damage', ({ side, amount, lives }) => {
        if (amount <= 0 || lives <= 0) return;
        setFx(v => ({ ...v, hurt: bump(v.hurt, side) }));
        splash(side, false);
        playKikker('oops');
    });
    // The round's end: the winner jumps and croaks, the other flops over with a big splash.
    useDuelEvent('roundEnd', ({ winner }) => {
        if (winner === 'draw') return;
        const loser = winner === 'left' ? 'right' : 'left';
        splash(loser, true);
        playKikker('splash');
        later(350, () => playKikker('hop'));
        later(700, () => playKikker('croak'));
        later(1500, () => playKikker('croak'));
    });

    const between = st.phase === 'roundEnd' || st.phase === 'matchEnd';
    const poseOf = (side: Side): FrogPose => (!between ? 'idle' : st.roundWinner === 'draw' ? 'still' : st.roundWinner === side ? 'cheer' : 'flop');
    const teams = teamsOf(st.config);

    return (
        <DuelScreen meta={meta} onExit={onExit} className="kv-app" points rightNote="Hap!" cardArt={<CardArt teams={teams} />}
            scene={<>
                {mode === 'doel' && <p className="kv-goal"><Star weight="fill" aria-hidden /> Wie eerst {KIKKER.goal} punten heeft</p>}
                <svg className="kv-scene" viewBox="0 0 1000 300" preserveAspectRatio="xMidYMax meet" aria-hidden data-bugs={bugs.length}>
                    <PondBack />
                    {SIDES.map(side => (
                        <Frog key={side} side={side} pose={poseOf(side)} snap={fx.snap[side]} gulp={fx.gulp[side]} burp={fx.burp[side]} hurt={fx.hurt[side]}
                            notice={fx.notice} pupilsRef={el => { pupils.current[side] = el; }} />
                    ))}
                    {fx.splashes.map(s => <Splash key={s.id} x={s.x} y={s.y} big={s.big} />)}
                    <g className="kv-bugs">
                        {bugs.map(b => (
                            <g key={b.id} className="kv-bug-at" data-kind={b.kind} visibility="hidden"
                                ref={el => { if (el) bugEls.current.set(b.id, el); else bugEls.current.delete(b.id); }}>
                                <g className="kv-buzz" style={{ animationDelay: `${(b.id % 5) * -0.13}s` }}><BugArt kind={b.kind} /></g>
                            </g>
                        ))}
                    </g>
                    {snaps.map(s => <Tongue key={s.id} snap={s} />)}
                    <PondFront />
                    {snaps.map(s => <Popup key={s.id} snap={s} />)}
                </svg>
            </>} />
    );
}

/** On the round and match cards: the winning frog jumping (a crown for the match), and the round's points. */
function CardArt({ teams }: { teams: Teams }) {
    const { phase, roundWinner, matchWinner, sides } = useDuelStore();
    const match = phase === 'matchEnd';
    const w = match ? matchWinner : roundWinner;
    const shown: Side[] = w === 'left' || w === 'right' ? [w] : ['left', 'right'];
    return (
        <div className="kv-card-art">
            <svg className="kv-card-frogs" viewBox={shown.length === 1 ? '-110 -220 220 250' : '40 40 920 250'} aria-hidden>
                {shown.map(side => {
                    const one = shown.length === 1;
                    const head = FROG_AT[side].x + (side === 'left' ? 24 : -24);
                    return (
                        <g key={side} transform={one ? `translate(${-FROG_AT[side].x} ${-FROG_AT[side].y})` : undefined}>
                            <Frog side={side} pose={one ? 'cheer' : 'still'} snap={0} gulp={0} burp={0} hurt={0} notice={0} />
                            {match && one && (
                                <g className="kv-card-crown" transform={`translate(${head - 26} ${FROG_AT[side].y - 214})`}>
                                    <Crown className="kv-crown" weight="fill" width={52} height={52} />
                                </g>
                            )}
                        </g>
                    );
                })}
            </svg>
            {!match && (
                <p className="kv-card-points">
                    {SIDES.map(side => <span key={side} className={`is-${side}`}><Star weight="fill" aria-hidden /> {teams[side].name}: {sides[side].points} {sides[side].points === 1 ? 'punt' : 'punten'}</span>)}
                </p>
            )}
        </div>
    );
}
