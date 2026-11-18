import { useEffect, useRef, useState } from 'react';
import type { SkinScreenProps } from '../types';
import { Burst } from '../../scene';
import DuelScreen from '../../duel/DuelScreen';
import { useDuelStore } from '../../duel/duelStore';
import { useDuelEvent, useDuelMatch } from '../../duel/useDuel';
import { teamsOf } from '../../duel/teams';
import { SIDES, type Side } from '../../duel/types';
import { courseKind } from '../../course/course';
import { useCourse, type ContactInfo } from '../../course/useCourse';
import { useBandWidth } from '../../course/useBandWidth';
import CourseBar from '../../course/CourseBar';
import { Banks, CardRaft, Flow, Raft, RiverBed, SurfWave, Wake, Waterfall, type RaftLook } from './art';
import { BANK } from './geometry';
import { WildObstacle } from './obstacles';
import { WILD_FRONT, WILD_KINDS, WILD_OBSTACLES, WILD_RULE, type WildKind } from './rule';
import { playWild, soundOfContact } from './sounds';
import './wildwaterrace.css';

// Wildwaterrace on the shared obstacle course (course/): each sum is the next obstacle the current carries at the
// raft. This file turns the course's moments into the river's: round the rocks, over the log, past the hungry
// crocodile, ducking under the branch, the crashes (a bump, a teeter, a spin in the whirlpool, a big splash, a chomp,
// a helmet full of leaves), the surfed wave of a catch-up, and the finish over the waterfall into the lake.

const H = 300;
const LANE: Record<Side, { y: number; scale: number }> = { left: { y: 128, scale: 1 }, right: { y: 214, scale: 1.16 } };
// The raft's nose is this far in front of its middle (art.tsx draws it round the middle).
const NOSE = 56;
const CALL_MS = 1100;
// Over the falls: the splash in the lake comes this long after the raft reached the lip.
const SPLASH_AT = 700;

type Call = { text: string; n: number; tone: 'clear' | 'crash' | 'wave' | 'win' } | null;
interface Fx { wave: Record<Side, number>; calls: Record<Side, Call>; splashes: { id: number; side: Side; x: number; big: boolean }[] }
const freshFx = (): Fx => ({ wave: { left: 0, right: 0 }, calls: { left: null, right: null }, splashes: [] });

const kindAt = (round: number, index: number): WildKind => courseKind(WILD_KINDS, round, index);

export default function Wildwaterrace({ meta, from, onExit }: SkinScreenProps) {
    const st = useDuelMatch(meta, from, WILD_RULE);
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
    const splash = (side: Side, dx: number, big: boolean) => {
        const id = ids.current++;
        const x = (courseRef.current?.noseNow(side) ?? 0) + dx;
        setFx(v => ({ ...v, splashes: [...v.splashes, { id, side, x, big }] }));
        later(1500, () => setFx(v => ({ ...v, splashes: v.splashes.filter(s => s.id !== id) })));
    };

    const onContact = ({ side, outcome, index }: ContactInfo) => {
        const kind = kindAt(useDuelStore.getState().round, index);
        call(side, WILD_OBSTACLES[kind][outcome].call, outcome);
        playWild(outcome === 'clear' ? 'stroke' : 'eddy');
        const extra = soundOfContact(kind, outcome);
        if (extra) later(60, () => playWild(extra));
        if (outcome === 'crash' || kind === 'drop' || kind === 'log') splash(side, 0, outcome === 'crash' && kind === 'drop');
    };
    const course = useCourse({
        w, onContact,
        holdOf: (_side, index) => (kindAt(useDuelStore.getState().round, index) === 'whirl' ? { crash: 1300 } : undefined),
        onFinish: side => {
            call(side, 'Waterval!', 'win');
            playWild('fall');
            later(SPLASH_AT, () => { splash(side, 40, true); playWild('splash'); });
            later(SPLASH_AT + 300, () => playWild('horn'));
        },
    });
    const courseRef = useRef(course);
    useEffect(() => { courseRef.current = course; });

    useDuelEvent('roundStart', () => {
        timers.current.forEach(clearTimeout);
        timers.current.clear();
        setFx(freshFx());
    });
    useDuelEvent('play', () => playWild('whistle'));
    // A catch-up: the raft behind surfs a wave.
    useDuelEvent('points', ({ side, tag }) => {
        if (tag !== 'turbo') return;
        setFx(v => ({ ...v, wave: { ...v.wave, [side]: v.wave[side] + 1 } }));
        later(400, () => { call(side, 'Golf!', 'wave'); playWild('wave'); });
    });

    const between = st.phase === 'roundEnd' || st.phase === 'matchEnd';
    const winner = between && st.roundWinner !== 'draw' ? st.roundWinner : null;
    const reached = !!course.finish?.reached;
    const teams = teamsOf(st.config);

    const raft = (side: Side) => {
        const vh = course.vehicles[side];
        const kind = vh.outcome ? kindAt(st.round, vh.index) : null;
        const o = kind && vh.outcome ? WILD_OBSTACLES[kind][vh.outcome] : null;
        const crash = vh.outcome === 'crash';
        const won = winner === side;
        const look: RaftLook = {
            mood: won && reached ? 'cheer' : crash ? 'oops' : vh.outcome === 'clear' && (o?.move === 'dive' || o?.move === 'hop') ? 'cheer' : 'idle',
            dizzy: crash && o?.move === 'spin', duck: vh.outcome === 'clear' && o?.move === 'duck', wet: crash && o?.move === 'splash', leaves: crash && o?.move === 'leaves',
        };
        const c = fx.calls[side];
        return (
            <g className={`ww-raft-at is-${side}${vh.waiting && st.phase === 'play' ? ' is-waiting' : ''}${won && reached ? ' is-over' : ''}${winner && !won ? ' is-lost' : ''}`}>
                <g transform={`translate(${-NOSE} 0)`}>
                    <Wake motionRef={course.motionRef(side, 'wake', 160)} />
                    {fx.wave[side] > 0 && <g key={`s${fx.wave[side]}`} className="ww-surf-at"><SurfWave /></g>}
                    <g className="ww-over">
                        <g key={`m${vh.n}`} className={`ww-move is-${o ? `${vh.outcome}-${o.move}` : 'none'}`}>
                            <g key={`g${vh.go}`} className={vh.go ? 'ww-goagain' : undefined}>
                                <g className="ww-bob"><Raft look={look} /></g>
                            </g>
                        </g>
                    </g>
                </g>
                {c && <g key={`c${c.n}`} transform={`translate(${side === 'left' ? 70 : 90} ${side === 'left' ? -30 : -44})`}><text className={`ww-call is-${c.tone}`} x={0} y={0}>{c.text}</text></g>}
            </g>
        );
    };

    const lane = (side: Side) => {
        const { y, scale } = LANE[side];
        const obstacle = (o: (typeof course.obstacles)[Side][number], layer: 'back' | 'front') => {
            const kind = kindAt(st.round, o.index);
            if (WILD_FRONT.includes(kind) !== (layer === 'front')) return null;
            return (
                <g key={o.key} ref={course.obstacleRef(side, o.key, layer)} visibility="hidden" data-kind={kind}>
                    <g transform={`scale(${scale})`}><WildObstacle kind={kind} state={o.outcome ?? 'ahead'} /></g>
                </g>
            );
        };
        return (
            <g transform={`translate(0 ${y})`}>
                <Flow w={w} groundRef={course.groundRef(side, 200)} />
                {course.obstacles[side].map(o => obstacle(o, 'back'))}
                {course.finish?.side === side && (
                    <g ref={course.finishRef()} visibility="hidden"><g transform="translate(-10 0)"><Waterfall top={BANK.far - y} bottom={BANK.near - y} w={w} /></g></g>
                )}
                <g ref={course.vehicleRef(side)}><g transform={`scale(${scale})`}>{raft(side)}</g></g>
                {course.obstacles[side].map(o => obstacle(o, 'front'))}
            </g>
        );
    };

    return (
        <DuelScreen meta={meta} onExit={onExit} className="ww-app" hearts={false} points rightNote="Peddel!"
            cardArt={winner ? <CardRaft side={winner} /> : undefined}
            scene={(
                <div className={`ww-scene${st.phase === 'ready' ? ' is-ready' : ''}${between ? ' is-between' : ''}`} data-points={SIDES.map(s => st.sides[s].points).join(',')}>
                    <svg ref={svg} className="ww-svg" viewBox={`0 0 ${w} ${H}`} preserveAspectRatio="xMidYMax meet" role="img" aria-label="Twee vlotten varen een wilde rivier af langs de hindernissen naar de waterval">
                        <RiverBed w={w} />
                        <Banks w={w} layerRef={course.layerRef('banks', 560, 1)} />
                        {lane('left')}
                        {lane('right')}
                    </svg>
                    {fx.splashes.map(s => <Burst key={s.id} kind="splash" x={`${((s.x + (s.big ? 60 : 0)) / w) * 100}%`} y={`${(LANE[s.side].y / H) * 100}%`} spread={s.big ? 130 : 60} count={s.big ? 26 : 12} seed={s.id} />)}
                    {winner && reached && <Burst key={`win${st.round}`} kind="pieces" x="70%" y="30%" spread={240} count={34} seed={st.round} />}
                    <CourseBar points={{ left: st.sides.left.points, right: st.sides.right.points }} length={st.config.lives} names={{ left: teams.left.name, right: teams.right.name }} />
                </div>
            )} />
    );
}
