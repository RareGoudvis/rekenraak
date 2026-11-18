import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import type { SkinScreenProps } from '../types';
import { Burst, Clouds } from '../../scene';
import DuelScreen from '../../duel/DuelScreen';
import { useDuelStore } from '../../duel/duelStore';
import { useDuelEvent, useDuelMatch } from '../../duel/useDuel';
import { SIDES, otherSide, type Side } from '../../duel/types';
import { Backdrop, Bolt, CardDragon, Dragon, Fireworks, Gong, Pip, StormCloud, type DragonMood } from './art';
import { DRAAK, DRAAK_RULE, progressOf } from './rule';
import { playDraak } from './sounds';
import './drakenrace.css';

// Drakenrace on the duel engine (rule.ts). This file turns the engine's effects into the sky's moments: the
// wingbeat forward, the storm cloud charging and striking the rival, the stall's spin, the gong at the finish.
// The dragons' places come straight from the points (a CSS transition flies them there).

// The scene is H units high; its width follows the band's shape, so the course always fills the band.
const H = 300;
const LANE: Record<Side, number> = { left: 116, right: 222 };
const DRAGON_SCALE = 0.95;
// The gong hangs this low (clear of the score corners); its disc's centre is at GONG_Y.
const GONG_DY = 30;
const GONG_Y = 128 + GONG_DY;
// The storm cloud's place over the middle of the course, and its size.
const CLOUD_Y = 58;
const CLOUD_SCALE = 1;
// How long a move, the daze after a lightning strike, a call and a burst last.
const MOVE_MS = 700;
const DAZE_MS = 1500;
const CALL_MS = 1100;
const BOLT_MS = 420;
// The winner reaches the gong this long after the round's end (its bonk), then the fireworks pop.
const RING_AT = 420;
const POPS = [800, 1400, 2000, 2600];

interface Course { w: number; start: number; end: number; gong: number; cloud: number }
const courseOf = (aspect: number): Course => {
    const w = Math.round(H * Math.max(2.2, Math.min(6.5, aspect)));
    const gong = w - 110;
    const start = Math.round(w * 0.085), end = gong - 150;
    return { w, start, end, gong, cloud: Math.round((start + end) / 2) };
};

type Move = { kind: DragonMood; n: number };
interface BoltView { id: number; to: Side; x: number; y: number }
interface Call { id: number; text: string; x: number; y: number }
interface BurstView { id: number; x: number; y: number }
interface Fx {
    move: Record<Side, Move>;
    dazed: Record<Side, boolean>;
    bolts: BoltView[];
    calls: Call[];
    bursts: BurstView[];
    confetti: BurstView[];
    strike: number;
    flash: number;
    ring: number;
}
const freshFx = (): Fx => ({
    move: { left: { kind: 'idle', n: 0 }, right: { kind: 'idle', n: 0 } }, dazed: { left: false, right: false },
    bolts: [], calls: [], bursts: [], confetti: [], strike: 0, flash: 0, ring: 0,
});

export default function Drakenrace({ meta, from, onExit }: SkinScreenProps) {
    const st = useDuelMatch(meta, from, DRAAK_RULE);
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

    // The course's width follows the svg box's shape (measured), so both lanes run edge to edge at every size.
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
    const move = (side: Side, kind: DragonMood) => {
        const n = ids.current++;
        moveKey.current[side] = n;
        setFx(v => ({ ...v, move: { ...v.move, [side]: { kind, n } } }));
        later(MOVE_MS, () => { if (moveKey.current[side] === n) setFx(v => ({ ...v, move: { ...v.move, [side]: { kind: 'idle', n: v.move[side].n } } })); });
    };
    const dazeKey = useRef<Record<Side, number>>({ left: 0, right: 0 });
    const daze = (side: Side) => {
        const n = ids.current++;
        dazeKey.current[side] = n;
        setFx(v => ({ ...v, dazed: { ...v.dazed, [side]: true } }));
        later(DAZE_MS, () => { if (dazeKey.current[side] === n) setFx(v => ({ ...v, dazed: { ...v.dazed, [side]: false } })); });
    };
    const add = <K extends 'bolts' | 'calls' | 'bursts' | 'confetti'>(key: K, item: Omit<Fx[K][number], 'id'>, ms: number) => {
        const id = ids.current++;
        setFx(v => ({ ...v, [key]: [...v[key], { ...item, id }] }));
        later(ms, () => setFx(v => ({ ...v, [key]: (v[key] as { id: number }[]).filter(x => x.id !== id) })));
    };

    useDuelEvent('roundStart', () => {
        timers.current.forEach(clearTimeout);
        timers.current.clear();
        setFx(freshFx());
    });
    useDuelEvent('play', () => playDraak('rawr'));

    useDuelEvent('effect', ({ by, cause, effect }) => {
        if (cause === 'land' || cause === 'game') return;
        if (effect.tag === 'stall') { move(by, 'stall'); playDraak('stall'); return; }
        move(by, 'beat');
        playDraak('beat');
        const { sides } = useDuelStore.getState();
        if (effect.tag !== 'lightning') {
            // Two in a row: the cloud wakes and crackles toward the rival.
            if (sides[by].streak % DRAAK.streak === DRAAK.streak - 1) playDraak('charge');
            return;
        }
        // The strike hits the rival where it was before the knock (it then tumbles back).
        const target = otherSide(by);
        const knocked = -(effect.points?.[target] ?? 0);
        const x = xOf(sides[target].points + knocked) + 18;
        const y = LANE[target] - 28;
        add('bolts', { to: target, x, y }, BOLT_MS);
        add('bursts', { x, y }, 1200);
        // The call pops up just ahead of the dragon it hit.
        add('calls', { text: 'ZAP!', x: x + 130, y: y + 2 }, CALL_MS);
        setFx(v => ({ ...v, strike: v.strike + 1, flash: v.flash + 1 }));
        move(target, 'zap');
        daze(target);
        playDraak('lightning');
        later(160, () => playDraak('zapped'));
    });

    // The finish: the winner bonks the gong, it rings, the fireworks go off.
    useDuelEvent('roundEnd', ({ winner }) => {
        if (winner === 'draw') return;
        later(RING_AT, () => {
            setFx(v => ({ ...v, ring: v.ring + 1 }));
            add('confetti', { x: course.gong, y: GONG_Y }, 2400);
            playDraak('gong');
        });
        POPS.forEach(ms => later(ms, () => playDraak('firework')));
    });

    const between = st.phase === 'roundEnd' || st.phase === 'matchEnd';
    const winner = between && st.roundWinner !== 'draw' ? st.roundWinner : null;
    const course1 = st.config.lives;
    const lead = Math.max(progressOf(st.sides.left, course1), progressOf(st.sides.right, course1));
    // The cloud charges toward the side whose next right answer calls the lightning.
    const charging = !between ? SIDES.find(s => st.sides[s].streak % DRAAK.streak === DRAAK.streak - 1) ?? null : null;
    const fire = winner ? [[course.gong - 60, 40], [course.cloud + 80, 80], [course.gong - 230, 34], [course.cloud - 140, 56], [course.gong - 150, 110], [course.start + 120, 40]] as const : [];

    const dragon = (side: Side) => {
        const me = st.sides[side];
        const m = fx.move[side];
        const won = winner === side;
        const mood: DragonMood = won ? 'won' : m.kind;
        const ring = won ? ' is-ringing' : '';
        const dy = (GONG_Y - LANE[side]) * 0.6;
        return (
            <g key={side} className={`dk-dragon-at is-${side}`} style={{ transform: `translate(${xOf(me.points)}px, ${LANE[side]}px)`, '--dk-ring-dy': `${dy}px` } as CSSProperties}>
                {/* CSS moves the outer groups; the scale stays on its own group (a CSS transform would replace the attribute). */}
                <g className={`dk-dragon${ring}`}>
                    <g key={m.n} className={`dk-move is-${mood}`}>
                        <g className="dk-bob"><g transform={`scale(${DRAGON_SCALE})`}><Dragon mood={mood} dazed={fx.dazed[side] && !won} /></g></g>
                    </g>
                </g>
                {m.kind === 'beat' && !won && <g key={`w${m.n}`} className="dk-wind"><path d="M-84 -24 L -140 -28" /><path d="M-78 4 L -150 4" /><path d="M-84 28 L -132 32" /></g>}
            </g>
        );
    };

    return (
        <DuelScreen meta={meta} onExit={onExit} className="dk-app" hearts={false} points rightNote="Zoef!"
            cardArt={winner ? <CardDragon side={winner} /> : undefined}
            scene={(
                <div className={`dk-scene${st.phase === 'ready' ? ' is-ready' : ''}${between ? ' is-between' : ''}`} style={{ '--dk-lead': lead } as CSSProperties} data-lead={lead.toFixed(2)}>
                    <Backdrop />
                    <Clouds layer="far" outline={false} count={4} band={[6, 44]} size={[90, 160]} direction="left" speed={50} tint="var(--dk-cloud)" />
                    <Clouds layer="near" count={2} band={[40, 62]} size={[110, 160]} direction="left" speed={30} seed={11} tint="var(--dk-cloud-near)" />
                    <svg ref={svg} className="dk-svg" viewBox={`0 0 ${course.w} ${H}`} preserveAspectRatio="xMidYMax meet" role="img" aria-label="Twee draken racen door de lucht naar de gong">
                        <g transform={`translate(${course.gong} ${GONG_DY})`}><Gong ring={fx.ring} h={H - GONG_DY} /></g>
                        <g transform={`translate(${course.cloud} ${CLOUD_Y}) scale(${CLOUD_SCALE})`}><StormCloud charge={charging} strike={fx.strike} /></g>
                        {/* A fixed order: moving a dragon in the DOM would restart its animations. */}
                        {SIDES.map(dragon)}
                        {fx.bolts.map(b => <Bolt key={b.id} from={{ x: course.cloud, y: CLOUD_Y + 32 * CLOUD_SCALE }} to={{ x: b.x, y: b.y }} seed={b.id} />)}
                        {winner && <Fireworks at={fire} />}
                        {fx.calls.map(c => <text key={c.id} className="dk-call" x={c.x} y={c.y}>{c.text}</text>)}
                    </svg>
                    {fx.bursts.map(b => <Burst key={b.id} kind="sparkle" x={`${(b.x / course.w) * 100}%`} y={`${(b.y / H) * 100}%`} spread={80} count={14} seed={b.id} />)}
                    {fx.confetti.map(b => <Burst key={b.id} kind="pieces" x={`${(b.x / course.w) * 100}%`} y={`${(b.y / H) * 100}%`} spread={220} count={36} seed={b.id} />)}
                    {/* The streak toward the lightning, under each score: the third pip calls it. */}
                    {SIDES.map(side => (
                        <span key={side} className={`dk-charge is-${side}`} role="img" aria-label={`${st.sides[side].streak % DRAAK.streak} van ${DRAAK.streak} op rij`}>
                            {[0, 1, 2].map(i => <svg key={i} viewBox="-10 -10 20 20" aria-hidden><Pip on={!between && i < st.sides[side].streak % DRAAK.streak} /></svg>)}
                        </span>
                    ))}
                    {fx.flash > 0 && <div key={`f${fx.flash}`} className="dk-flash" aria-hidden />}
                </div>
            )} />
    );
}
