import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import type { SkinScreenProps } from '../types';
import { Burst } from '../../scene';
import DuelScreen from '../../duel/DuelScreen';
import { useDuelStore } from '../../duel/duelStore';
import { useDuelEvent, useDuelMatch } from '../../duel/useDuel';
import { SIDES, otherSide, type Side } from '../../duel/types';
import { CardRaft, Eddy, Pip, Raft, River, SurfWave, Wake, type RaftMood } from './art';
import { CURTAIN } from './geometry';
import { WILD, WILD_RULE, progressOf } from './rule';
import { playWild } from './sounds';
import './wildwaterrace.css';

// Wildwaterrace on the duel engine (rule.ts). This file turns the engine's effects into the river's moments: the
// paddle stroke, the surfed wave, the eddy's spin, and the finish: the winner goes over the waterfall and splashes
// into the lake, the other raft drifts after it. The rafts' places come straight from the points (CSS transitions).

// The scene is H units high; its width follows the band's shape, so the river always fills the band.
const H = 300;
const LANE: Record<Side, number> = { left: 132, right: 222 };
const RAFT_SCALE = 1.22;
// How long a move, the dizzy paddlers after an eddy and a call last.
const MOVE_MS = 900;
const DIZZY_MS = 1300;
const CALL_MS = 1100;
// The finish: the winner tips over the lip and lands in the lake (its CSS animation's 75 %); the other raft starts
// drifting to the lip after FOLLOW_AT, goes over after FOLLOW_OVER and lands like the first.
const OVER_MS = 1100;
const SPLASH_AT = Math.round(OVER_MS * 0.72);
const FOLLOW_AT = 1500;
const FOLLOW_OVER = 1300;

interface Course { w: number; start: number; end: number; lip: number; lake: number }
const courseOf = (aspect: number): Course => {
    const w = Math.round(H * Math.max(2.2, Math.min(6.5, aspect)));
    const lip = w - 230;
    return { w, lip, start: Math.round(w * 0.085), end: lip - 70, lake: Math.round(lip + CURTAIN + (w - lip - CURTAIN) / 2) };
};

type Move = { kind: RaftMood; n: number };
interface Call { id: number; text: string; x: number; y: number; tone: 'wave' | 'eddy' }
interface Splash { id: number; x: number; y: number; big: boolean }
interface Fx {
    move: Record<Side, Move>;
    dizzy: Record<Side, boolean>;
    calls: Call[];
    splashes: Splash[];
    // The finish: which rafts went over the falls, and the loser drifting to the lip.
    over: Record<Side, boolean>;
    drift: Side | null;
}
const freshFx = (): Fx => ({
    move: { left: { kind: 'idle', n: 0 }, right: { kind: 'idle', n: 0 } }, dizzy: { left: false, right: false }, calls: [], splashes: [],
    over: { left: false, right: false }, drift: null,
});

export default function Wildwaterrace({ meta, from, onExit }: SkinScreenProps) {
    const st = useDuelMatch(meta, from, WILD_RULE);
    const [fx, setFx] = useState(freshFx);
    const ids = useRef(1);
    const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
    const later = (ms: number, fn: () => void) => {
        const t = setTimeout(() => { timers.current.delete(t); fn(); }, ms);
        timers.current.add(t);
    };
    useEffect(() => {
        const all = timers.current;
        return () => all.forEach(clearTimeout);
    }, []);

    // SYNC: the same measured course as drakenrace/Drakenrace.tsx (the svg box's shape sets the width).
    const svg = useRef<SVGSVGElement>(null);
    const [course, setCourse] = useState<Course>(() => courseOf(3.4));
    useLayoutEffect(() => {
        const el = svg.current;
        if (!el || typeof ResizeObserver === 'undefined') return;
        const measure = () => { const r = el.getBoundingClientRect(); if (r.width > 0 && r.height > 0) setCourse(c => { const n = courseOf(r.width / r.height); return n.w === c.w ? c : n; }); };
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);
    const xOf = (points: number) => course.start + progressOf({ points }, st.config.lives) * (course.end - course.start);

    // The latest move per side wins: an older move's timer must not end a newer one.
    const moveKey = useRef<Record<Side, number>>({ left: 0, right: 0 });
    const move = (side: Side, kind: RaftMood) => {
        const n = ids.current++;
        moveKey.current[side] = n;
        setFx(v => ({ ...v, move: { ...v.move, [side]: { kind, n } } }));
        later(MOVE_MS, () => { if (moveKey.current[side] === n) setFx(v => ({ ...v, move: { ...v.move, [side]: { kind: 'idle', n: v.move[side].n } } })); });
    };
    const dizzyKey = useRef<Record<Side, number>>({ left: 0, right: 0 });
    const dizzy = (side: Side) => {
        const n = ids.current++;
        dizzyKey.current[side] = n;
        setFx(v => ({ ...v, dizzy: { ...v.dizzy, [side]: true } }));
        later(DIZZY_MS, () => { if (dizzyKey.current[side] === n) setFx(v => ({ ...v, dizzy: { ...v.dizzy, [side]: false } })); });
    };
    const add = <K extends 'calls' | 'splashes'>(key: K, item: Omit<Fx[K][number], 'id'>, ms: number) => {
        const id = ids.current++;
        setFx(v => ({ ...v, [key]: [...v[key], { ...item, id }] }));
        later(ms, () => setFx(v => ({ ...v, [key]: (v[key] as { id: number }[]).filter(x => x.id !== id) })));
    };

    useDuelEvent('roundStart', () => {
        timers.current.forEach(clearTimeout);
        timers.current.clear();
        setFx(freshFx());
    });
    useDuelEvent('play', () => playWild('whistle'));

    useDuelEvent('effect', ({ by, cause, effect }) => {
        if (cause === 'land' || cause === 'game') return;
        const at = useDuelStore.getState().sides[by].points;
        const x = xOf(at), y = LANE[by];
        if (effect.tag === 'eddy') {
            move(by, 'eddy');
            dizzy(by);
            add('calls', { text: 'Woeps!', x: x + 20, y: y - 74, tone: 'eddy' }, CALL_MS);
            playWild('eddy');
            return;
        }
        if (effect.tag === 'wave') {
            move(by, 'wave');
            add('calls', { text: 'Golf!', x: x + 20, y: y - 80, tone: 'wave' }, CALL_MS);
            add('splashes', { x: x + 64, y: y + 6, big: false }, 1200);
            playWild('wave');
            return;
        }
        move(by, 'stroke');
        playWild('stroke');
    });

    // The finish: over the falls with a splash in the lake; the other raft drifts after it.
    useDuelEvent('roundEnd', ({ winner }) => {
        if (winner === 'draw') return;
        const goOver = (side: Side, at: number) => {
            later(at, () => { setFx(v => ({ ...v, over: { ...v.over, [side]: true } })); playWild('fall'); });
            later(at + SPLASH_AT, () => { add('splashes', { x: course.lake, y: LANE[side] + 8, big: true }, 1600); playWild('splash'); });
        };
        goOver(winner, 0);
        later(SPLASH_AT + 300, () => playWild('horn'));
        const other = otherSide(winner);
        later(FOLLOW_AT, () => setFx(v => ({ ...v, drift: other })));
        goOver(other, FOLLOW_AT + FOLLOW_OVER);
    });

    const between = st.phase === 'roundEnd' || st.phase === 'matchEnd';
    const winner = between && st.roundWinner !== 'draw' ? st.roundWinner : null;
    const streakOf = (side: Side) => (between ? 0 : st.sides[side].streak % WILD.streak);

    const raft = (side: Side) => {
        const me = st.sides[side];
        const m = fx.move[side];
        const over = fx.over[side];
        const x = over || fx.drift === side ? course.end : xOf(me.points);
        const mood: RaftMood = between ? (over ? 'cheer' : 'idle') : m.kind;
        return (
            <g key={side} className={`ww-raft-at is-${side}${fx.drift === side ? ' is-drift' : ''}`} style={{ transform: `translate(${x}px, ${LANE[side]}px)`, '--ww-over-dx': `${course.lake - course.end}px` } as CSSProperties}>
                {m.kind === 'eddy' && !between && <g key={`e${m.n}`}><Eddy /></g>}
                {m.kind === 'stroke' && !between && <g key={`k${m.n}`}><Wake /></g>}
                {/* CSS moves the outer groups; the scale stays on its own group (a CSS transform would replace the attribute). */}
                <g className={`ww-over${over ? ' is-over' : ''}`}>
                    <g key={m.n} className={`ww-move is-${between ? 'idle' : m.kind}`}>
                        {m.kind === 'wave' && !between && <g transform={`scale(${RAFT_SCALE})`}><SurfWave /></g>}
                        <g className="ww-bob"><g transform={`scale(${RAFT_SCALE})`}><Raft mood={mood} dizzy={fx.dizzy[side] && !between} /></g></g>
                    </g>
                </g>
            </g>
        );
    };

    return (
        <DuelScreen meta={meta} onExit={onExit} className="ww-app" hearts={false} points rightNote="Peddel!"
            cardArt={winner ? <CardRaft side={winner} /> : undefined}
            scene={(
                <div className={`ww-scene${st.phase === 'ready' ? ' is-ready' : ''}${between ? ' is-between' : ''}`}>
                    <svg ref={svg} className="ww-svg" viewBox={`0 0 ${course.w} ${H}`} preserveAspectRatio="xMidYMax meet" role="img" aria-label="Twee vlotten varen een wilde rivier af naar de waterval">
                        <River w={course.w} lip={course.lip} />
                        {/* A fixed order: moving a raft in the DOM would restart its animations. */}
                        {SIDES.map(raft)}
                        {fx.calls.map(c => <text key={c.id} className={`ww-call is-${c.tone}`} x={c.x} y={c.y}>{c.text}</text>)}
                    </svg>
                    {fx.splashes.map(s => <Burst key={s.id} kind="splash" x={`${(s.x / course.w) * 100}%`} y={`${(s.y / H) * 100}%`} spread={s.big ? 130 : 60} count={s.big ? 26 : 12} seed={s.id} />)}
                    {winner && <Burst key={`win${st.round}`} kind="pieces" x={`${(course.lake / course.w) * 100}%`} y="30%" spread={240} count={34} seed={st.round} />}
                    {/* The streak toward a wave, under each score: the third surfs it. */}
                    {SIDES.map(side => (
                        <span key={side} className={`ww-charge is-${side}`} role="img" aria-label={`${streakOf(side)} van ${WILD.streak} op rij`}>
                            {[0, 1, 2].map(i => <svg key={i} viewBox="-11 -9 22 18" aria-hidden><Pip on={i < streakOf(side)} /></svg>)}
                        </span>
                    ))}
                </div>
            )} />
    );
}
