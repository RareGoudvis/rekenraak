import { useEffect, useRef, useState } from 'react';
import { useDuelStore } from '../duel/duelStore';
import { useDuelEvent } from '../duel/useDuel';
import { SIDES, type Side } from '../duel/types';
import { COURSE, courseLength, freshLane, isWaiting, noseOf, stepLane, sumIndexOf, type Lane } from './course';

// The obstacle course's frame loop for a race screen (course.ts is the pure part): every frame each lane steps
// from the duel store (its sum, its clock, its answer), and the registered SVG groups move: the vehicle to its
// race place, the obstacles toward it, the ground and the backdrop layers scroll. React only hears of the
// moments (an obstacle appears, a contact = clear or crash, back on the way, the Makkelijk wait, the finish).

export type Outcome = 'clear' | 'crash';
export interface CourseObstacle { key: string; index: number; outcome: Outcome | null; late: boolean }
export interface CourseVehicle {
    // The latest contact: its outcome, a counter that restarts its moment, the obstacle's index.
    outcome: Outcome | null;
    n: number;
    index: number;
    late: boolean;
    // Back on the way after a crash or a hold (a counter); standing still (Makkelijk's wait, the start).
    go: number;
    waiting: boolean;
}
export interface ContactInfo { side: Side; outcome: Outcome; index: number; late: boolean }
// The round's finish in the winner's lane (world units), and whether the winner has reached it.
export interface CourseFinish { side: Side; at: number; reached: boolean }

const idleVehicle = (): CourseVehicle => ({ outcome: null, n: 0, index: -1, late: false, go: 0, waiting: true });
const perSide = <T,>(f: () => T): Record<Side, T> => ({ left: f(), right: f() });
// An obstacle this far left of the band is gone.
const GONE_X = -460;

type Mover = (el: Element, lanes: Record<Side, Lane>) => void;

export interface CourseSpec {
    // The band's width in scene units (it follows the band's shape).
    w: number;
    // How long a vehicle holds still at an obstacle (a loop done in place); absent = no hold on a clear, COURSE.stopMs on a crash.
    holdOf?(side: Side, index: number): { clear?: number; crash?: number } | undefined;
    onContact?(c: ContactInfo): void;
    onGo?(side: Side): void;
    onFinish?(side: Side): void;
}

export function useCourse(spec: CourseSpec) {
    const [obstacles, setObstacles] = useState<Record<Side, CourseObstacle[]>>(() => perSide(() => []));
    const [vehicles, setVehicles] = useState<Record<Side, CourseVehicle>>(() => perSide(idleVehicle));
    const [finish, setFinish] = useState<CourseFinish | null>(null);
    const lanes = useRef<Record<Side, Lane>>(perSide(() => freshLane(noseOf(0, 1, spec.w))));
    // Where each obstacle sits in its lane's world (by key), and the finish.
    const placed = useRef<Record<Side, Map<string, number>>>(perSide(() => new Map()));
    const goal = useRef<CourseFinish | null>(null);
    const movers = useRef(new Map<string, { el: Element; move: Mover }>());
    const binds = useRef(new Map<string, (el: Element | null) => void>());
    const live = useRef(spec);
    useEffect(() => { live.current = spec; });

    const bind = (id: string, move: Mover) => {
        let cb = binds.current.get(id);
        if (!cb) {
            cb = (el: Element | null) => { if (el) movers.current.set(id, { el, move }); else movers.current.delete(id); };
            binds.current.set(id, cb);
        }
        return cb;
    };
    const set = (el: Element, transform: string) => el.setAttribute('transform', transform);

    useDuelEvent('roundStart', () => {
        const nose = noseOf(0, 1, live.current.w);
        lanes.current = perSide(() => freshLane(nose));
        placed.current = perSide(() => new Map());
        goal.current = null;
        setFinish(null);
        setObstacles(perSide(() => []));
        setVehicles(perSide(idleVehicle));
    });
    // The winner drives on to the finish, which appears ahead of it in its lane.
    useDuelEvent('roundEnd', ({ winner }) => {
        if (winner === 'draw') return;
        const l = lanes.current[winner];
        const room = live.current.w - l.nose;
        const at = Math.max(l.dist + Math.max(220, room * COURSE.goalAt), (l.at ?? 0) + 200);
        goal.current = { side: winner, at, reached: false };
        setFinish(goal.current);
    });

    useEffect(() => {
        if (typeof requestAnimationFrame !== 'function') return;
        let raf = 0;
        let last = Date.now();
        const frame = () => {
            const now = Date.now();
            const st = useDuelStore.getState();
            const dt = st.paused ? 0 : Math.min(100, Math.max(0, now - last));
            last = now;
            const { w, holdOf } = live.current;
            const length = courseLength(st.config);
            const g = goal.current;
            for (const side of SIDES) {
                const sd = st.sides[side];
                const idx = sumIndexOf(sd);
                const nose = noseOf(sd.points, length, w);
                const before = lanes.current[side];
                const { lane, events } = stepLane(before, {
                    key: idx === null ? null : `${st.round}:${idx}`, open: !sd.feedback, correct: !!sd.feedback?.correct,
                    leftMs: sd.deadline === null ? null : sd.deadline - now, spawn: w - nose + COURSE.spawnPad, nose,
                    halt: st.phase !== 'play', goal: g?.side === side ? g.at : null, holdMs: idx === null ? undefined : holdOf?.(side, idx),
                }, dt);
                lanes.current[side] = lane;
                for (const e of events) {
                    if (e.kind === 'spawn') {
                        placed.current[side].set(e.key, e.at);
                        const index = idx ?? 0;
                        setObstacles(o => ({ ...o, [side]: [...o[side].filter(x => x.key !== e.key), { key: e.key, index, outcome: null, late: false }] }));
                    } else if (e.kind === 'contact') {
                        const late = sd.feedback?.given === '';
                        const index = Number(e.key.split(':')[1]);
                        setObstacles(o => ({ ...o, [side]: o[side].map(x => (x.key === e.key ? { ...x, outcome: e.outcome, late } : x)) }));
                        setVehicles(v => ({ ...v, [side]: { ...v[side], outcome: e.outcome, n: v[side].n + 1, index, late } }));
                        live.current.onContact?.({ side, outcome: e.outcome, index, late });
                    } else if (e.kind === 'go') {
                        setVehicles(v => ({ ...v, [side]: { ...v[side], go: v[side].go + 1 } }));
                        live.current.onGo?.(side);
                    } else if (e.kind === 'goal' && g) {
                        goal.current = { ...g, reached: true };
                        setFinish(goal.current);
                        live.current.onFinish?.(side);
                    }
                }
                const waiting = isWaiting(lane);
                if (waiting !== isWaiting(before) || events.length) setVehicles(v => (v[side].waiting === waiting ? v : { ...v, [side]: { ...v[side], waiting } }));
                // Obstacles far behind are gone.
                for (const [key, at] of placed.current[side]) {
                    if (lane.nose + at - lane.dist < GONE_X) {
                        placed.current[side].delete(key);
                        setObstacles(o => ({ ...o, [side]: o[side].filter(x => x.key !== key) }));
                    }
                }
            }
            for (const { el, move } of movers.current.values()) move(el, lanes.current);
            raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);
        return () => cancelAnimationFrame(raf);
    }, []);

    const laneX = (l: Lane, at: number) => (l.nose + at - l.dist).toFixed(1);
    const meanDist = (l: Record<Side, Lane>) => (l.left.dist + l.right.dist) / 2;
    return {
        obstacles,
        vehicles,
        finish,
        /** A vehicle's front in the band now (for an event handler that places a burst). */
        noseNow: (side: Side) => lanes.current[side].nose,
        /** The vehicle's group (or another that follows it, by id: its call over the obstacles): at its front's place (x only). */
        vehicleRef: (side: Side, id = '') => bind(`v-${side}${id}`, (el, l) => set(el, `translate(${l[side].nose.toFixed(1)} 0)`)),
        /** An obstacle's group: at its place in the lane, hidden until it has one (a layer over the vehicle has its own). */
        obstacleRef: (side: Side, key: string, layer = 'back') => bind(`o-${side}-${key}-${layer}`, (el, l) => {
            const at = placed.current[side].get(key);
            if (at === undefined) { el.setAttribute('visibility', 'hidden'); return; }
            el.setAttribute('visibility', 'visible');
            set(el, `translate(${laneX(l[side], at)} 0)`);
        }),
        /** The finish's group: at its place in the winner's lane. */
        finishRef: () => bind('finish', (el, l) => {
            const f = goal.current;
            if (!f) { el.setAttribute('visibility', 'hidden'); return; }
            el.setAttribute('visibility', 'visible');
            set(el, `translate(${laneX(l[f.side], f.at)} 0)`);
        }),
        /** A lane's ground: a strip that scrolls with the lane, wrapping every period. */
        groundRef: (side: Side, period: number, factor = 1) => bind(`g-${side}-${period}-${factor}`, (el, l) => set(el, `translate(${(-((l[side].dist * factor) % period)).toFixed(1)} 0)`)),
        /** A backdrop layer both lanes share: scrolls with their mean distance times factor, wrapping every period. */
        layerRef: (id: string, period: number, factor: number) => bind(`l-${id}`, (el, l) => set(el, `translate(${(-((meanDist(l) * factor) % period)).toFixed(1)} 0)`)),
        /** A wheel (radius r) that rolls with its lane. */
        wheelRef: (side: Side, id: string, r: number) => bind(`w-${side}-${id}`, (el, l) => set(el, `rotate(${(((l[side].dist / r) * 180) / Math.PI % 360).toFixed(1)})`)),
        /** A group that follows a lane's speed (units/s): fn gives its transform (a lean, a spray). */
        speedRef: (side: Side, id: string, fn: (speed: number) => string) => bind(`s-${side}-${id}`, (el, l) => set(el, fn(l[side].speed))),
        /** A group that shows only while its lane drives (opacity by speed: dust, spray, wind lines). */
        motionRef: (side: Side, id: string, full = 220) => bind(`m-${side}-${id}`, (el, l) => el.setAttribute('opacity', Math.min(1, l[side].speed / full).toFixed(2))),
    };
}
