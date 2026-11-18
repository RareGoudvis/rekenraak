import { useEffect, useRef, useState } from 'react';
import type { SkinScreenProps } from '../types';
import DuelScreen from '../../duel/DuelScreen';
import { useDuelStore } from '../../duel/duelStore';
import { useDuelEvent, useDuelMatch } from '../../duel/useDuel';
import { teamsOf } from '../../duel/teams';
import { SIDES, type Side } from '../../duel/types';
import { COURSE, courseKind } from '../../course/course';
import { useCourse, type ContactInfo } from '../../course/useCourse';
import { useBandWidth } from '../../course/useBandWidth';
import CourseBar from '../../course/CourseBar';
import { Confetti, Dirt, FinishArch, Obstacle, Sky, Stand, Truck, TruckBodyCard, TyreRow, Wall, type TruckView } from './art';
import { H, LANE, TILE } from './geometry';
import { TRUCK_FRONT, TRUCK_KINDS, TRUCK_OBSTACLES, TRUCK_RULE, type TruckKind } from './rule';
import { playTruck, soundOfContact } from './sounds';
import './monstertrucks.css';

// Monstertrucks for 1 (against the computer) or 2 on one screen, on the shared obstacle course (course/): each sum
// is the next obstacle rolling at the truck. This file turns the course's moments into the arena's: the jump over
// the junk cars, the loop, the drift through the oil, the crashes (a backflip, stuck in the mud, a bounce off the
// tyres, the crusher's boing), the turbo flames of a catch-up, the finish arch and the winner's donut.

// The loop is driven in place: the world waits while the truck goes round.
const LOOP_HOLD_MS = 760;
// Stuck in the mud a little longer than a plain crash: the wheels spin.
const MUD_STOP_MS = 1250;
const CALL_MS = 1200;
// The donut's squeals once the winner is through the finish.
const SCREECH_AT = [300, 1200] as const;

type Call = TruckView['call'];
interface Fx { turbo: Record<Side, number>; calls: Record<Side, Call>; cheer: number }
const freshFx = (): Fx => ({ turbo: { left: 0, right: 0 }, calls: { left: null, right: null }, cheer: 0 });

const kindAt = (round: number, index: number): TruckKind => courseKind(TRUCK_KINDS, round, index);

export default function Monstertrucks({ meta, from, onExit }: SkinScreenProps) {
    const st = useDuelMatch(meta, from, TRUCK_RULE);
    const [svg, w] = useBandWidth(H);
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
    const call = (side: Side, text: string, tone: NonNullable<Call>['tone']) => {
        const n = seq.current++;
        setFx(v => ({ ...v, calls: { ...v.calls, [side]: { text, n, tone } } }));
        after(CALL_MS, () => setFx(v => (v.calls[side]?.n === n ? { ...v, calls: { ...v.calls, [side]: null } } : v)));
    };

    const onContact = ({ side, outcome, index }: ContactInfo) => {
        const kind = kindAt(useDuelStore.getState().round, index);
        const o = TRUCK_OBSTACLES[kind][outcome];
        call(side, o.call, outcome);
        playTruck(outcome === 'clear' ? 'boost' : 'oops');
        const extra = soundOfContact(kind, outcome);
        if (extra) after(outcome === 'clear' && kind === 'cars' ? 380 : 60, () => playTruck(extra));
        if (outcome === 'clear') setFx(v => ({ ...v, cheer: v.cheer + 1 }));
    };
    const course = useCourse({
        w,
        holdOf: (_side, index) => {
            const kind = kindAt(useDuelStore.getState().round, index);
            return kind === 'loop' ? { clear: LOOP_HOLD_MS } : kind === 'mud' ? { crash: MUD_STOP_MS } : undefined;
        },
        onContact,
        onGo: () => playTruck('rev'),
        onFinish: side => {
            setFx(v => ({ ...v, cheer: v.cheer + 1 }));
            call(side, 'Finish!', 'win');
            playTruck('horn');
            SCREECH_AT.forEach(ms => after(ms, () => playTruck('screech')));
        },
    });

    useDuelEvent('roundStart', () => {
        timers.current.forEach(clearTimeout);
        timers.current.clear();
        setFx(freshFx());
    });
    useDuelEvent('play', () => playTruck('rev'));
    // A catch-up: the truck behind gets 3 in a row, the stacks flame and it shoots ahead.
    useDuelEvent('points', ({ side, tag }) => {
        if (tag !== 'turbo') return;
        setFx(v => ({ ...v, turbo: { ...v.turbo, [side]: v.turbo[side] + 1 } }));
        after(420, () => { call(side, 'Turbo!', 'turbo'); playTruck('turbo'); });
    });

    const between = st.phase === 'roundEnd' || st.phase === 'matchEnd';
    const winner = between && st.roundWinner !== 'draw' ? st.roundWinner : null;
    const reached = !!course.finish?.reached;
    const truck = (side: Side): TruckView => {
        const vh = course.vehicles[side];
        const kind = vh.outcome ? kindAt(st.round, vh.index) : null;
        return {
            side, move: kind && vh.outcome ? `${vh.outcome}-${TRUCK_OBSTACLES[kind][vh.outcome].move}` : null, n: vh.n, turbo: fx.turbo[side],
            waiting: vh.waiting && st.phase === 'play', go: vh.go, won: winner === side && reached, lost: !!winner && winner !== side, call: fx.calls[side],
        };
    };
    const teams = teamsOf(st.config);

    const lane = (side: Side) => {
        const { y, scale } = LANE[side];
        const gap = COURSE.contactGap / scale;
        return (
            <g transform={`translate(0 ${y})`}>
                {course.obstacles[side].map(o => (
                    <g key={o.key} ref={course.obstacleRef(side, o.key)} visibility="hidden" data-kind={kindAt(st.round, o.index)}>
                        <g transform={`scale(${scale})`}><Obstacle kind={kindAt(st.round, o.index)} state={o.outcome ?? 'ahead'} gap={gap} layer="back" /></g>
                    </g>
                ))}
                {course.finish?.side === side && (
                    <g ref={course.finishRef()} visibility="hidden"><g transform={`scale(${scale})`}><FinishArch torn={reached} /></g></g>
                )}
                <g ref={course.vehicleRef(side)}>
                    <g transform={`scale(${scale})`}>
                        <Truck t={truck(side)} refs={{ wheel: (id, r) => course.wheelRef(side, id, r), motion: (id, full) => course.motionRef(side, id, full) }} />
                    </g>
                </g>
                {course.obstacles[side].filter(o => TRUCK_FRONT.includes(kindAt(st.round, o.index))).map(o => (
                    <g key={o.key} ref={course.obstacleRef(side, o.key, 'front')} visibility="hidden">
                        <g transform={`scale(${scale})`}><Obstacle kind={kindAt(st.round, o.index)} state={o.outcome ?? 'ahead'} gap={gap} layer="front" /></g>
                    </g>
                ))}
            </g>
        );
    };

    return (
        <DuelScreen meta={meta} onExit={onExit} className="mtk-app" hearts={false} points rightNote="Gas!"
            cardArt={winner ? <TruckBodyCard side={winner} /> : undefined}
            scene={(
                <div className={`mtk-scene${between ? ' is-between' : ''}`} data-points={SIDES.map(s => st.sides[s].points).join(',')}>
                    <svg ref={svg} className="mtk-svg" viewBox={`0 0 ${w} ${H}`} preserveAspectRatio="xMidYMax meet" role="img" aria-label="Twee monstertrucks racen door de arena over de hindernissen">
                        <Sky w={w} />
                        <Stand w={w} layerRef={course.layerRef('stand', TILE.stand, 0.18)} cheer={fx.cheer} />
                        <Wall w={w} layerRef={course.layerRef('wall', TILE.wall, 0.5)} />
                        <rect className="mtk-dirt" x={-20} y={148} width={w + 40} height={H - 148 + 20} />
                        <Dirt w={w} y={152} h={56} groundRef={course.groundRef('left', TILE.dirt)} seed={3} />
                        {lane('left')}
                        <TyreRow w={w} y={226} layerRef={course.layerRef('tyres', TILE.tyres, 0.92)} />
                        <Dirt w={w} y={236} h={62} groundRef={course.groundRef('right', TILE.dirt)} seed={8} />
                        {lane('right')}
                        {winner && reached && <Confetti w={w} seed={winner === 'left' ? 5 : 9} />}
                    </svg>
                    <CourseBar points={{ left: st.sides.left.points, right: st.sides.right.points }} length={st.config.lives} names={{ left: teams.left.name, right: teams.right.name }} />
                </div>
            )} />
    );
}
