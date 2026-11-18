import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { SkinScreenProps } from '../types';
import { Burst, Clouds } from '../../scene';
import DuelScreen from '../../duel/DuelScreen';
import { useDuelStore } from '../../duel/duelStore';
import { useDuelEvent, useDuelMatch } from '../../duel/useDuel';
import { teamsOf } from '../../duel/teams';
import { SIDES, otherSide, type Side } from '../../duel/types';
import { COURSE, courseKind, progressOf } from '../../course/course';
import { useCourse, type ContactInfo } from '../../course/useCourse';
import { useBandWidth } from '../../course/useBandWidth';
import CourseBar from '../../course/CourseBar';
import { Backdrop, CardDragon, Dragon, Fireworks, Gong, Pip, type DragonMood } from './art';
import { DraakObstacle } from './obstacles';
import { DRAAK, DRAAK_KINDS, DRAAK_OBSTACLES, DRAAK_RULE, isStorm, type DraakKind } from './rule';
import { playDraak, soundOfContact } from './sounds';
import './drakenrace.css';

// Drakenrace on the shared obstacle course (course/): each sum is the next obstacle flying at the dragon. This file
// turns the course's moments into the sky's: over the tower, under the birds, through the cloud with a puff of fire,
// the crashes (zapped, bonked, a bird on its head, an apple on its nose, bounced off the balloon), the storm a dragon
// sends into the other lane on 3 in a row, the tailwind of a catch-up, and the gong at the finish.

// The scene is H units high; its width follows the band's shape.
const H = 300;
// Two lanes of their own, a line of clouds between them (DIVIDE): a dragon is about 120 units high, 0.58 = 70.
const LANE: Record<Side, { y: number; scale: number }> = { left: { y: 96, scale: 0.58 }, right: { y: 234, scale: 0.58 } };
const DIVIDE = 165;
// The dragon's snout is this far in front of its body's middle (art.tsx draws it round the middle).
const NOSE = 96;
// The lane's wisps of cloud repeat every TILE units.
const TILE = 320;
const CALL_MS = 1150;
// The fireworks after the gong rings.
const POPS = [300, 900, 1500, 2100];

type Call = { text: string; n: number; tone: 'clear' | 'crash' | 'storm' | 'win' } | null;
interface Fx { tail: Record<Side, number>; calls: Record<Side, Call>; ring: number; flash: number; bursts: { id: number; side: Side; x: number; kind: 'sparkle' | 'pieces' }[] }
const freshFx = (): Fx => ({ tail: { left: 0, right: 0 }, calls: { left: null, right: null }, ring: 0, flash: 0, bursts: [] });

export default function Drakenrace({ meta, from, onExit }: SkinScreenProps) {
    const st = useDuelMatch(meta, from, DRAAK_RULE);
    const [svg, w] = useBandWidth(H);
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
    const call = (side: Side, text: string, tone: NonNullable<Call>['tone']) => {
        const n = ids.current++;
        setFx(v => ({ ...v, calls: { ...v.calls, [side]: { text, n, tone } } }));
        later(CALL_MS, () => setFx(v => (v.calls[side]?.n === n ? { ...v, calls: { ...v.calls, [side]: null } } : v)));
    };
    const burst = (side: Side, kind: 'sparkle' | 'pieces') => {
        const id = ids.current++;
        const x = courseRef.current?.noseNow(side) ?? 0;
        setFx(v => ({ ...v, bursts: [...v.bursts, { id, side, x, kind }] }));
        later(1300, () => setFx(v => ({ ...v, bursts: v.bursts.filter(b => b.id !== id) })));
    };

    // The obstacle at index in a side's lane: the course's, or the storm the other dragon sent.
    const kindOf = (side: Side, index: number): DraakKind => (isStorm(st.sides[side], index) ? 'storm' : courseKind(DRAAK_KINDS, st.round, index));
    const kindNow = (side: Side, index: number): DraakKind => {
        const s = useDuelStore.getState();
        return isStorm(s.sides[side], index) ? 'storm' : courseKind(DRAAK_KINDS, s.round, index);
    };

    const onContact = ({ side, outcome, index }: ContactInfo) => {
        const kind = kindNow(side, index);
        call(side, DRAAK_OBSTACLES[kind][outcome].call, outcome);
        playDraak(outcome === 'clear' ? 'beat' : 'stall');
        const extra = soundOfContact(kind, outcome);
        if (extra) later(80, () => playDraak(extra));
        if (outcome === 'crash' && (kind === 'storm' || kind === 'gate' || kind === 'cloud')) { setFx(v => ({ ...v, flash: v.flash + 1 })); burst(side, 'sparkle'); }
        if (outcome === 'clear' && (kind === 'cloud' || kind === 'storm')) burst(side, 'sparkle');
    };
    const course = useCourse({
        w: Math.round(w), onContact,
        onFinish: side => {
            setFx(v => ({ ...v, ring: v.ring + 1 }));
            call(side, 'Gong!', 'win');
            playDraak('gong');
            burst(side, 'pieces');
            POPS.forEach(ms => later(ms, () => playDraak('firework')));
        },
    });

    const courseRef = useRef(course);
    useEffect(() => { courseRef.current = course; });

    useDuelEvent('roundStart', () => {
        timers.current.forEach(clearTimeout);
        timers.current.clear();
        setFx(freshFx());
    });
    useDuelEvent('play', () => playDraak('rawr'));
    useDuelEvent('effect', ({ by, effect }) => {
        // 3 in a row: the storm blows into the other lane.
        if (effect.tag === 'storm') { call(otherSide(by), 'Storm!', 'storm'); playDraak('charge'); later(200, () => playDraak('lightning')); }
    });
    // A catch-up: a tailwind carries the dragon behind.
    useDuelEvent('points', ({ side, tag }) => {
        if (tag !== 'turbo') return;
        setFx(v => ({ ...v, tail: { ...v.tail, [side]: v.tail[side] + 1 } }));
        later(420, () => { call(side, 'Rugwind!', 'clear'); playDraak('wind'); });
    });

    const between = st.phase === 'roundEnd' || st.phase === 'matchEnd';
    const winner = between && st.roundWinner !== 'draw' ? st.roundWinner : null;
    const reached = !!course.finish?.reached;
    const length = st.config.lives;
    const lead = Math.max(progressOf(st.sides.left.points, length), progressOf(st.sides.right.points, length));
    const teams = teamsOf(st.config);
    const stormStreak = (side: Side) => (between ? 0 : st.sides[side].streak % DRAAK.streak);

    const dragon = (side: Side) => {
        const vh = course.vehicles[side];
        const kind = vh.outcome ? kindOf(side, vh.index) : null;
        const o = kind && vh.outcome ? DRAAK_OBSTACLES[kind][vh.outcome] : null;
        const won = winner === side && reached;
        const crash = vh.outcome === 'crash';
        const mood: DragonMood = won ? 'won' : crash ? 'stall' : vh.outcome === 'clear' ? 'beat' : 'idle';
        const move = o ? `${vh.outcome}-${o.move}` : 'none';
        const fire = vh.outcome === 'clear' && (o?.move === 'through' || o?.move === 'roll') ? vh.n : 0;
        return (
            <g className={`dk-dragon-at is-${side}${vh.waiting && st.phase === 'play' ? ' is-waiting' : ''}${won ? ' is-won' : ''}${winner && winner !== side ? ' is-lost' : ''}`}>
                {/* The wind behind it while it flies (its opacity follows the speed). */}
                <g ref={course.motionRef(side, 'wind', 200)} className="dk-wind"><path d="M-200 -24 L-150 -26" /><path d="M-210 6 L-140 6" /><path d="M-196 30 L-150 34" /></g>
                {fx.tail[side] > 0 && <g key={`t${fx.tail[side]}`} className="dk-tailwind">{[0, 1, 2, 3].map(k => <path key={k} style={{ '--k': k } as CSSProperties} d={`M${-260 - k * 20} ${-40 + k * 26} q40 -16 80 0 q30 12 60 0`} />)}</g>}
                <g key={`m${vh.n}`} className={`dk-move is-${move}`}>
                    <g key={`g${vh.go}`} className={vh.go ? 'dk-goagain' : undefined}>
                        <g className="dk-bob">
                            <g transform={`translate(${-NOSE} 0)`}>
                                <Dragon mood={mood} dazed={crash && (o?.move === 'zap' || o?.move === 'bonk')} fire={fire} sooty={crash && o?.move === 'zap'}
                                    extra={crash && o?.move === 'feathers' ? 'bird' : crash && o?.move === 'tangle' ? 'apple' : null} />
                            </g>
                        </g>
                    </g>
                </g>
            </g>
        );
    };

    const lane = (side: Side) => {
        const { y, scale } = LANE[side];
        return (
            // Each lane in its own clip: a swoop or a crash never reaches into the other lane.
            <g clipPath={`url(#dk-lane-${side})`}><g transform={`translate(0 ${y})`}>
                {/* Wisps of cloud at the lane's height scroll with it: the dragon's speed. */}
                <g ref={course.groundRef(side, TILE)} className="dk-wisps">
                    {Array.from({ length: Math.ceil(w / TILE) + 2 }, (_, i) => (
                        <g key={i} transform={`translate(${i * TILE} 0)`}>
                            <path d={`M20 ${44 * scale + 18} q30 -10 60 0 q20 6 40 0`} />
                            <path d={`M170 ${-60 * scale - 10} q24 -8 48 0`} />
                        </g>
                    ))}
                </g>
                {course.obstacles[side].map(o => {
                    const kind = kindOf(side, o.index);
                    return (
                        <g key={o.key} ref={course.obstacleRef(side, o.key)} visibility="hidden" data-kind={kind}>
                            <g transform={`scale(${scale})`}><g key={kind} className={kind === 'storm' ? 'dk-ob-arrive' : 'crs-arrive'}><DraakObstacle kind={kind} state={o.outcome ?? 'ahead'} /></g></g>
                        </g>
                    );
                })}
                {course.finish?.side === side && (
                    <g ref={course.finishRef()} visibility="hidden">
                        {/* The gong's disc where the winner rolls to a stop (COURSE.goalOver past the finish). */}
                        <g transform={`scale(${scale})`}><g transform={`translate(${Math.round(COURSE.goalOver / scale)} -128)`}><Gong ring={fx.ring} h={300} /></g></g>
                    </g>
                )}
                <g ref={course.vehicleRef(side)}>
                    <g transform={`scale(${scale})`}>{dragon(side)}</g>
                    {/* The comic word beside the dragon, in its own lane (scene units). */}
                    {fx.calls[side] && <text key={`c${fx.calls[side]!.n}`} className={`dk-call is-${fx.calls[side]!.tone}`} x={20} y={10}>{fx.calls[side]!.text}</text>}
                </g>
            </g></g>
        );
    };

    const fire = winner && reached ? [[w * 0.2, 50], [w * 0.45, 30], [w * 0.7, 60], [w * 0.88, 34], [w * 0.33, 90], [w * 0.6, 100]] as const : [];
    return (
        <DuelScreen meta={meta} onExit={onExit} className="dk-app" hearts={false} points rightNote="Zoef!"
            cardArt={winner ? <CardDragon side={winner} /> : undefined}
            scene={(
                <div className={`dk-scene${st.phase === 'ready' ? ' is-ready' : ''}${between ? ' is-between' : ''}`} style={{ '--dk-lead': lead } as CSSProperties} data-points={SIDES.map(s => st.sides[s].points).join(',')}>
                    <Backdrop />
                    <Clouds layer="far" outline={false} count={4} band={[6, 44]} size={[90, 160]} direction="left" speed={50} tint="var(--dk-cloud)" />
                    <svg ref={svg} className="dk-svg" viewBox={`0 0 ${w} ${H}`} preserveAspectRatio="xMidYMax meet" role="img" aria-label="Twee draken racen door de lucht over de hindernissen naar de gong">
                        <defs>
                            <clipPath id="dk-lane-left"><rect x={-40} y={-200} width={w + 80} height={DIVIDE + 200} /></clipPath>
                            <clipPath id="dk-lane-right"><rect x={-40} y={DIVIDE} width={w + 80} height={H} /></clipPath>
                        </defs>
                        {lane('left')}
                        {lane('right')}
                        {/* The line of clouds between the lanes: each dragon keeps to its own sky. */}
                        <g ref={course.layerRef('divide', 240, 1)} className="dk-divide">
                            {Array.from({ length: Math.ceil(w / 240) + 2 }, (_, i) => (
                                <g key={i} transform={`translate(${i * 240} ${DIVIDE})`}>
                                    {[[0, 0, 16], [26, -6, 20], [56, -2, 15], [84, 2, 12], [110, -4, 17], [140, 0, 14], [168, -5, 19], [200, 0, 15], [226, -3, 13]].map(([x, y2, r]) => <circle key={x} cx={x} cy={y2} r={r} />)}
                                </g>
                            ))}
                        </g>
                        {fire.length > 0 && <Fireworks at={fire} />}
                    </svg>
                    <Clouds layer="near" count={2} band={[70, 92]} size={[110, 160]} direction="left" speed={22} seed={11} tint="var(--dk-cloud-near)" />
                    {fx.bursts.map(b => <Burst key={b.id} kind={b.kind} x={`${((b.x + 30) / w) * 100}%`} y={`${(LANE[b.side].y / H) * 100}%`} spread={b.kind === 'pieces' ? 200 : 70} count={b.kind === 'pieces' ? 36 : 12} seed={b.id} />)}
                    <CourseBar points={{ left: st.sides.left.points, right: st.sides.right.points }} length={length} names={{ left: teams.left.name, right: teams.right.name }} />
                    {/* The streak toward the storm, under each score: the third sends it. */}
                    {SIDES.map(side => (
                        <span key={side} className={`dk-charge is-${side}`} role="img" aria-label={`${stormStreak(side)} van ${DRAAK.streak} op rij`}>
                            {[0, 1, 2].map(i => <svg key={i} viewBox="-10 -10 20 20" aria-hidden><Pip on={i < stormStreak(side)} /></svg>)}
                        </span>
                    ))}
                    {fx.flash > 0 && <div key={`f${fx.flash}`} className="dk-flash" aria-hidden />}
                </div>
            )} />
    );
}

