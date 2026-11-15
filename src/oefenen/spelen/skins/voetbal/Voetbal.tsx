import { memo, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { SpelSignBox } from '../../SpelVisual';
import SpelKeypad from '../../SpelKeypad';
import type { SkinEndingProps, SkinProps } from '../types';
import {
    KICKOFF, VOETBAL, beatsOf, endTitle, halfTimeDue, isShot, loadBest, newMatch, passArc, playOf, saveBest, sceneOf, scoreLine, shotStep,
    type Beat, type Fig, type Match, type Pose,
} from './match';
import { DEPTH, FAN_ROWS, STAND, depthFor, fans, geoOf, goalArt, pitchLines, viewHeight, type Fan, type Geo } from './pitch';
import './voetbal.css';

// Voetbal: the polar bears (blue scarves) play the black bears (orange scarves), 5 against 5 (1-1-2-1) on a small
// pitch seen from the stand. With the ball, a right answer is a pass up the pitch (untimed) and a wrong one lets the
// black bears take it ("Oeps!"); then their passes come on wrong answers and a right one wins it back ("Hebbes!").
// Our fifth sum is the shot on a gentle 10 s ring (onMiss); theirs goes in. The match clock is the session's; at its
// half the skin holds it for a short "Rust!". match.ts decides where everybody stands per beat; this file draws it.

// A round sticker bear, feet at 0 0, facing right (face -1 mirrors it).
export function Bear({ kind, face = 1, pose = 'stand', gloves = false }: { kind: 'ijs' | 'zwart'; face?: 1 | -1; pose?: Pose; gloves?: boolean }) {
    const up = pose === 'cheer' || pose === 'keeper';
    const kick = pose === 'kick';
    return (
        <g className={`vb-bear is-${kind}`} transform={face < 0 ? 'scale(-1 1)' : undefined}>
            <ellipse className="vb-fur" cx="-7" cy="-5" rx="6.5" ry="6" />
            {kick
                ? <ellipse className="vb-fur" cx="14" cy="-9" rx="6.5" ry="5.5" transform="rotate(-24 14 -9)" />
                : <ellipse className="vb-fur" cx="7" cy="-5" rx="6.5" ry="6" />}
            {up ? (
                <>
                    <ellipse className="vb-fur" cx="-15" cy="-38" rx="5" ry="10" transform="rotate(-28 -15 -38)" />
                    <ellipse className="vb-fur" cx="15" cy="-38" rx="5" ry="10" transform="rotate(28 15 -38)" />
                </>
            ) : pose === 'dive' ? (
                <>
                    <ellipse className="vb-fur" cx="-8" cy="-62" rx="5" ry="13" transform="rotate(-8 -8 -62)" />
                    <ellipse className="vb-fur" cx="8" cy="-62" rx="5" ry="13" transform="rotate(8 8 -62)" />
                </>
            ) : pose === 'drink' ? (
                <>
                    <ellipse className="vb-fur" cx="-14" cy="-21" rx="5" ry="10" transform="rotate(14 -14 -21)" />
                    <ellipse className="vb-fur" cx="14" cy="-37" rx="5" ry="9" transform="rotate(-25 14 -37)" />
                </>
            ) : pose !== 'hold' && (
                <>
                    <ellipse className="vb-fur" cx="-14" cy="-21" rx="5" ry="10" transform={`rotate(${kick ? 40 : 14} -14 -21)`} />
                    <ellipse className="vb-fur" cx="14" cy="-21" rx="5" ry="10" transform={`rotate(${kick ? -40 : -14} 14 -21)`} />
                </>
            )}
            <ellipse className="vb-fur" cx="0" cy="-21" rx="14" ry="16" />
            <ellipse className="vb-belly" cx="1" cy="-17" rx="8" ry="9" />
            <path className="vb-scarf" d="M-12 -37 Q0 -31 12 -37 L12 -30 Q0 -25 -12 -30 Z" />
            <path className="vb-scarf" d="M-9 -31 L-12 -18 L-5 -18 L-4 -30 Z" />
            <circle className="vb-fur" cx="-9" cy="-57" r="5" />
            <circle className="vb-fur" cx="9" cy="-57" r="5" />
            <circle className="vb-fur" cx="0" cy="-47" r="13" />
            <ellipse className="vb-muzzle" cx="4" cy="-43" rx="6.5" ry="5" />
            <ellipse className="vb-nose" cx="6" cy="-46" rx="2.6" ry="2" />
            <circle className="vb-eye" cx="-3" cy="-51" r="1.9" />
            <circle className="vb-eye" cx="6" cy="-51" r="1.9" />
            <path className="vb-smile" d="M1.5 -41.5 Q5 -38 8.5 -41.5" />
            {pose === 'hold' && (
                <>
                    <ellipse className="vb-fur" cx="7" cy="-31" rx="10" ry="4.5" transform="rotate(-12 7 -31)" />
                    <ellipse className="vb-fur" cx="7" cy="-22" rx="10" ry="4.5" transform="rotate(12 7 -22)" />
                </>
            )}
            {(gloves || pose === 'keeper') && (
                up ? (
                    <>
                        <circle className="vb-glove" cx="-19" cy="-47" r="5.5" />
                        <circle className="vb-glove" cx="19" cy="-47" r="5.5" />
                    </>
                ) : pose === 'dive' ? (
                    <>
                        <circle className="vb-glove" cx="-7" cy="-76" r="5.5" />
                        <circle className="vb-glove" cx="7" cy="-76" r="5.5" />
                    </>
                ) : pose === 'hold' ? (
                    <>
                        <circle className="vb-glove" cx="16" cy="-34" r="4.5" />
                        <circle className="vb-glove" cx="16" cy="-19" r="4.5" />
                    </>
                ) : (
                    <>
                        <circle className="vb-glove" cx="-16.5" cy="-11.5" r="4.5" />
                        <circle className="vb-glove" cx="16.5" cy="-11.5" r="4.5" />
                    </>
                )
            )}
            {pose === 'drink' && (
                <g transform="rotate(38 12 -43)">
                    <rect className="vb-bottle" x="7.5" y="-61" width="9" height="18" rx="3" />
                    <rect className="vb-bottle-cap" x="9.5" y="-45" width="5" height="3" rx="1" />
                    <path className="vb-bottle-band" d="M7.5 -54 L16.5 -54" />
                </g>
            )}
        </g>
    );
}

export function Ball({ r = 6 }: { r?: number }) {
    const k = r / 6;
    return (
        <g className="vb-ball-art">
            <circle className="vb-ball" r={r} />
            <path className="vb-patch" d={`M0 ${-2.6 * k} L${2.5 * k} ${-0.8 * k} L${1.5 * k} ${2.1 * k} L${-1.5 * k} ${2.1 * k} L${-2.5 * k} ${-0.8 * k} Z`} />
        </g>
    );
}

// A tiny bear fan in the stand: fur and scarf mixed, some wave all the time, all of them cheer after a goal.
function FanArt({ f }: { f: Fan }) {
    return (
        <g className={`vb-fan${f.ijs ? ' is-ijs' : ''}`} transform={`translate(${f.x} ${f.y})`} style={{ '--d': `${Math.round((f.x + 160) * 1.6)}ms` } as CSSProperties}>
            <g className="vb-fan-jump">
                <g className="vb-fan-up">
                    <ellipse className="vb-fan-fur" cx="-5" cy="-15" rx="1.8" ry="4" transform="rotate(-24 -5 -15)" />
                    <ellipse className="vb-fan-fur" cx="5" cy="-15" rx="1.8" ry="4" transform="rotate(24 5 -15)" />
                </g>
                {f.waves && <ellipse className="vb-fan-fur vb-fan-wave" cx="5" cy="-15" rx="1.8" ry="4" transform="rotate(24 5 -15)" />}
                <path className={`vb-fan-body${f.blue ? ' is-blue' : ''}`} d="M-6 0 Q-6 -10 0 -10 Q6 -10 6 0 Z" />
                <circle className="vb-fan-fur" cx="-3" cy="-17.5" r="1.8" />
                <circle className="vb-fan-fur" cx="3" cy="-17.5" r="1.8" />
                <circle className="vb-fan-fur" cx="0" cy="-13.5" r="4.3" />
                <ellipse className="vb-fan-muzzle" cx="0" cy="-12" rx="2" ry="1.5" />
            </g>
        </g>
    );
}

const FANS = fans();

// The stand: a fixed strip behind the far touchline (scoreboard, three rows of waving fans, the low wall). A scene
// taller than the deepest pitch shows the roof and a bit of sky above it.
const Stand = memo(function Stand({ crowdId, goals, against, half }: { crowdId: string; goals: number; against: number; half: 1 | 2 }) {
    return (
        <>
            <defs>
                <pattern id={crowdId} width="17" height="18" patternUnits="userSpaceOnUse" x="-160" y={FAN_ROWS[0] - 18}>
                    <rect className="vb-step" x="0" y="12" width="17" height="6" />
                    <circle className="vb-crowd-head" cx="4.5" cy="7" r="3.6" />
                    <circle className="vb-crowd-head is-dark" cx="13" cy="7.5" r="3.6" />
                    <path className="vb-crowd-body is-blue" d="M0.5 18 Q0.5 10.5 4.5 10.5 Q8.5 10.5 8.5 18 Z" />
                    <path className="vb-crowd-body" d="M9 18 Q9 11 13 11 Q17 11 17 18 Z" />
                </pattern>
            </defs>
            <path className="vb-cloud" d="M60 -40 Q50 -40 52 -49 Q54 -56 64 -54 Q67 -65 79 -63 Q87 -71 97 -65 Q108 -68 110 -57 Q121 -57 121 -48 Q122 -40 111 -40 Z" />
            <path className="vb-cloud" d="M270 -64 Q263 -64 264 -70 Q266 -75 272 -74 Q274 -82 283 -80 Q289 -86 296 -82 Q305 -84 307 -76 Q316 -77 316 -70 Q317 -64 308 -64 Z" />
            <rect className="vb-stand-back" x={-600} y={0} width={1600} height={STAND.apron} />
            <rect className="vb-crowd" x={-600} y={0} width={1600} height={FAN_ROWS[0] - 18} style={{ fill: `url(#${crowdId})` }} />
            <rect className="vb-roof" x={-600} y={-8} width={1600} height={10} />
            {FAN_ROWS.map(y => <rect key={y} className="vb-step" x={-600} y={y - 4} width={1600} height={6} />)}
            {FANS.map(f => <FanArt key={`${f.row}-${f.x}`} f={f} />)}
            <rect className="vb-wall" x={-600} y={STAND.wall} width={1600} height={STAND.apron - STAND.wall} />
            <g className="vb-board" transform="translate(200 0)">
                <rect className="vb-board-frame" x={-62} y={3} width={124} height={32} rx={6} />
                <g transform="translate(-46 31) scale(.36)"><Bear kind="ijs" /></g>
                <text className="vb-board-num" x={-18} y={28} textAnchor="middle">{goals}</text>
                <text className="vb-board-num" x={0} y={27} textAnchor="middle">:</text>
                <text className="vb-board-num" x={18} y={28} textAnchor="middle">{against}</text>
                <g transform="translate(46 31) scale(.36)"><Bear kind="zwart" face={-1} /></g>
                <rect className="vb-half-tag" x={-26} y={35} width={52} height={13} rx={4} />
                <text className="vb-half" x={0} y={45} textAnchor="middle">{half === 1 ? '1e helft' : '2e helft'}</text>
            </g>
        </>
    );
});

// The grass around the pitch, the pitch with its lines and both goals; nothing runs off the pitch.
const Pitch = memo(function Pitch({ netId, geo }: { netId: string; geo: Geo }) {
    const lines = useMemo(() => pitchLines(geo), [geo]);
    return (
        <>
            <defs>
                <pattern id={netId} width="4" height="4" patternUnits="userSpaceOnUse">
                    <path className="vb-net-line" d="M0 0 L4 4 M4 0 L0 4" />
                </pattern>
            </defs>
            <rect className="vb-apron" x={-600} y={STAND.apron} width={1600} height={900} />
            <path className="vb-grass" d={lines.lines[0]} />
            {lines.stripes.map(d => <path key={d} className="vb-stripe" d={d} />)}
            {lines.lines.map(d => <path key={d} className="vb-line" d={d} />)}
            {lines.spots.map(p => <circle key={`${p.x}`} className="vb-spot" cx={p.x} cy={p.y} r={2.2 * p.s} />)}
        </>
    );
});

function Goal({ side, netId, bulge, geo }: { side: 0 | 1; netId: string; bulge: number; geo: Geo }) {
    const g = useMemo(() => goalArt(side, geo), [side, geo]);
    const net = { fill: `url(#${netId})` };
    return (
        <g className="vb-goal">
            <path className="vb-net-floor" d={g.floor} />
            <g key={bulge} className={`vb-goal-net${bulge ? ' is-bulge' : ''}${side ? '' : ' is-left'}`}>
                <path className="vb-net" d={g.back} style={net} />
                <path className="vb-net" d={g.sideFar} style={net} />
                <path className="vb-net" d={g.top} style={net} />
                <path className="vb-net" d={g.sideNear} style={net} />
            </g>
            <path className="vb-back-frame" d={g.backFrame} />
            <path className="vb-post-edge" d={g.frame} />
            <path className="vb-post" d={g.frame} />
        </g>
    );
}

// The scene on screen, its play and the lift of the ball's flight into it (kept while the same flight goes on).
interface Shown { beat: Beat; n: number; arc: number }
const START: Shown = { beat: KICKOFF, n: 0, arc: 0 };
function shownNext(prev: Shown, beat: Beat, n: number): Shown {
    const a = sceneOf(prev.beat), z = sceneOf(beat);
    const moved = Math.hypot(z.ball.x - a.ball.x, z.ball.y - a.ball.y) > 1;
    return { beat, n, arc: moved ? passArc(a.ball, z.ball, z.move) : prev.n === n ? prev.arc : 0 };
}

const figTransform = (f: Fig) => `translate(${f.x.toFixed(1)}px, ${(f.y - f.lift).toFixed(1)}px) rotate(${f.rot}deg) scale(${f.k.toFixed(3)})`;

export default function Voetbal({ question, phase, feedback, onAnswer, onMiss, onHold, onReport, sound, progress, events, options, runKey, reducedMotion }: SkinProps) {
    const uid = useId().replace(/:/g, '');
    const [match, setMatch] = useState<Match>(newMatch);
    const matchRef = useRef(match);
    // The scene on screen and the play it belongs to (a new flight restarts the ball's arc).
    const [beat, setBeat] = useState<Shown>(START);
    const shown = useRef(START);
    // The last play's shout (GOAL!, Gevangen!), keyed per play; null when it has faded.
    const [shout, setShout] = useState<{ play: 'goal' | 'zgoal' | 'save'; n: number } | null>(null);
    const [rust, setRust] = useState(false);
    const [shot, setShot] = useState({ id: '', left: VOETBAL.shotMs as number });
    const bestKey = `${runKey ?? 'voetbal'}|${options.tijd ?? '3'}`;
    const [bestBefore] = useState(() => loadBest(bestKey));
    // The pitch's depth follows the scene's shape: a tall scene gets a deeper pitch, not a taller stand.
    const world = useRef<HTMLDivElement>(null);
    const [depth, setDepth] = useState<number>(DEPTH.base);
    const drawn = question !== null;
    useEffect(() => {
        const el = world.current;
        if (!el || typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver(() => setDepth(depthFor(el.clientWidth, el.clientHeight)));
        ro.observe(el);
        return () => ro.disconnect();
    }, [drawn]);
    const geo = useMemo(() => geoOf(depth), [depth]);
    const timers = useRef<number[]>([]);
    const later = (ms: number, fn: () => void) => { timers.current.push(window.setTimeout(fn, ms)); };
    useEffect(() => () => { timers.current.forEach(t => window.clearTimeout(t)); }, []);

    // The latest props for the event handlers and the clocks (they are set up once).
    const live = useRef({ sound, onMiss, onHold, onReport, bestKey, bestBefore });
    useLayoutEffect(() => { live.current = { sound, onMiss, onHold, onReport, bestKey, bestBefore }; });

    const report = (goals: number, against: number) => live.current.onReport?.({
        title: endTitle(goals, against), lead: scoreLine(goals, against),
        detail: goals > 0 && goals > live.current.bestBefore ? 'Nieuw record!' : undefined,
    });

    // Kick-off: the whistle, and the end lines from the start (0 - 0).
    useEffect(() => {
        live.current.sound('whistle');
        report(0, 0);
    }, []);

    useEffect(() => {
        const onPlay = (correct: boolean) => {
            const before = matchRef.current;
            const m = playOf(before, correct);
            matchRef.current = m;
            setMatch(m);
            // Each beat of this play, unless a newer play took over meanwhile.
            const show = (b: Beat) => { shown.current = shownNext(shown.current, b, m.n); setBeat(shown.current); };
            for (const step of beatsOf(before, m)) {
                if (step.at === 0) show(step.beat);
                else later(step.at, () => { if (matchRef.current.n === m.n) show(step.beat); });
            }
            const last = m.last;
            if (last === 'goal' || last === 'zgoal' || last === 'save') {
                setShout({ play: last, n: m.n });
                later(1700, () => setShout(s => s?.n === m.n ? null : s));
                later(VOETBAL.flightMs - 60, () => live.current.sound(last === 'goal' ? 'win' : 'caught'));
            }
            if (last === 'goal') saveBest(live.current.bestKey, m.goals);
            if (last === 'goal' || last === 'zgoal') report(m.goals, m.against);
        };
        const offs = [events.on('correct', () => onPlay(true)), events.on('wrong', () => onPlay(false))];
        return () => offs.forEach(off => off());
    }, [events]);

    // Half time: the session's clock holds while the bears drink; then the second half kicks off.
    const due = phase !== 'help' && !rust && halfTimeDue(match, progress.msLeft, progress.msTotal);
    useEffect(() => {
        if (!due) return;
        const m = { ...matchRef.current, half: 2 as const };
        matchRef.current = m;
        setMatch(m);
        setRust(true);
        live.current.onHold?.(true);
        live.current.sound('whistle');
        later(VOETBAL.rustMs, () => {
            setRust(false);
            live.current.onHold?.(false);
            live.current.sound('whistle');
        });
    }, [due]);

    // The shot's own clock: only while the shot is on screen and in play (help and half time stop it).
    const shooting = isShot(match) && !!question;
    // One id per shot (the play count changes with every answer), so a new shot starts full.
    const shotId = `${question?.key ?? ''}|${match.n}`;
    const shotLeft = shot.id === shotId ? shot.left : VOETBAL.shotMs;
    const running = shooting && phase === 'play' && !rust;
    const left = useRef({ id: '', ms: VOETBAL.shotMs as number });
    useEffect(() => {
        if (!running) return;
        if (left.current.id !== shotId) left.current = { id: shotId, ms: VOETBAL.shotMs };
        let last = Date.now();
        const id = window.setInterval(() => {
            const now = Date.now();
            const was = left.current.ms;
            left.current.ms = shotStep(was, now - last);
            last = now;
            setShot({ id: shotId, left: left.current.ms });
            if (was > 0 && left.current.ms === 0) live.current.onMiss();
        }, 250);
        return () => window.clearInterval(id);
    }, [running, shotId]);

    const scene = sceneOf(beat.beat, geo);
    const arc = beat.arc;

    if (!question) return <div className="vb-root" />;
    const flash = phase === 'right' || phase === 'wrong';
    const showRing = shooting && (phase === 'play' || phase === 'help');
    const passDots = Math.min(match.passes, VOETBAL.passes);
    const theirs = match.side === 'zwart';
    const b = scene.ball;
    const flightKey = `${beat.n}-${beat.beat.kind}`;

    return (
        <div className={`vb-root${phase === 'help' || rust ? ' is-paused' : ''}${reducedMotion ? ' is-still' : ''}`}>
            <div className="vb-world" ref={world}>
                <svg className="vb-svg" viewBox={`0 0 400 ${viewHeight(geo)}`} preserveAspectRatio="xMidYMax meet" aria-hidden>
                    <g className={`vb-stand${scene.crowd === 'goal' ? ' is-goal' : ''}`}>
                        <Stand crowdId={`${uid}c`} goals={match.goals} against={match.against} half={match.half} />
                    </g>
                    <Pitch netId={`${uid}n`} geo={geo} />
                    <Goal side={0} netId={`${uid}n`} bulge={scene.bulge === 0 ? beat.n : 0} geo={geo} />
                    <Goal side={1} netId={`${uid}n`} bulge={scene.bulge === 1 ? beat.n : 0} geo={geo} />
                    <g className={`vb-figs is-${scene.move}`}>
                        {scene.figs.map(f => (
                            <g key={f.id} className={`vb-fig${f.jump ? ' is-jump' : ''}`} style={{ transform: figTransform(f) }}>
                                <g className="vb-jump" style={{ '--d': `${(f.slot * 90) % 270}ms` } as CSSProperties}>
                                    <g className="vb-bob" style={{ '--d': `${f.slot * -0.37 - (f.team === 'zwart' ? 0.2 : 0)}s` } as CSSProperties}>
                                        <Bear kind={f.team} face={f.face} pose={f.pose} gloves={f.gloves} />
                                    </g>
                                </g>
                            </g>
                        ))}
                    </g>
                    <g className={`vb-ball-move is-${scene.move}`}>
                        <ellipse className="vb-shadow" cx={0} cy={0} rx={b.r * 1.1} ry={b.r * 0.42} style={{ transform: `translate(${b.x.toFixed(1)}px, ${b.y.toFixed(1)}px)` }} />
                        <g className="vb-ball-at" style={{ transform: `translate(${b.x.toFixed(1)}px, ${(b.y - b.lift - b.r).toFixed(1)}px)` }}>
                            <g key={flightKey} className={`vb-arc${arc ? ' is-on' : ''}${scene.move === 'reset' ? ' is-reset' : ''}`} style={{ '--arc': `${-arc}px` } as CSSProperties}>
                                <g className="vb-roll" style={{ transform: `rotate(${Math.round(b.x * 6)}deg)` }}><Ball r={b.r} /></g>
                            </g>
                        </g>
                    </g>
                    {scene.star && (
                        <g transform={`translate(${scene.star.x.toFixed(1)} ${scene.star.y.toFixed(1)})`}>
                            <g key={`five-${beat.n}`} className="vb-five">
                                <path className="vb-five-star" d="M0 -11 L3 -3.5 L11 -3.5 L4.5 1.5 L7 9 L0 4.5 L-7 9 L-4.5 1.5 L-11 -3.5 L-3 -3.5 Z" />
                            </g>
                        </g>
                    )}
                    {scene.bubble && (
                        <g transform={`translate(${scene.bubble.x.toFixed(1)} ${scene.bubble.y.toFixed(1)})`}>
                            <g key={`bubble-${beat.n}`} className="vb-bubble">
                                <rect x="-27" y="-12" width="54" height="21" rx="9" />
                                <path d="M-4 9 L0 16 L5 9 Z" />
                                <text x="0" y="4" textAnchor="middle">{scene.bubble.text}</text>
                            </g>
                        </g>
                    )}
                </svg>

                <div className="vb-hud">
                    <p className="vb-score" aria-label={scoreLine(match.goals, match.against)}>{scoreLine(match.goals, match.against)}</p>
                    <span className={`vb-dots${theirs ? ' is-zwart' : ''}`} role="img"
                        aria-label={showRing ? 'Schieten!' : `${theirs ? 'Zwarte beren' : 'IJsberen'}: ${passDots} van ${VOETBAL.passes} passes`}>
                        {Array.from({ length: VOETBAL.passes }, (_, i) => <span key={i} className={`vb-dot${i < passDots ? ' is-on' : ''}`} />)}
                    </span>
                    {showRing && (
                        <span className="vb-ring" role="timer" aria-label={`Schiet! Nog ${Math.ceil(shotLeft / 1000)} seconden`}>
                            <svg viewBox="0 0 100 100" aria-hidden>
                                <circle className="vb-ring-track" cx="50" cy="50" r="42" />
                                <circle className="vb-ring-left" cx="50" cy="50" r="42" pathLength={100}
                                    style={{ strokeDashoffset: (1 - shotLeft / VOETBAL.shotMs) * 100 }} />
                            </svg>
                            <span className="vb-ring-num">{Math.ceil(shotLeft / 1000)}</span>
                        </span>
                    )}
                </div>

                {shout?.play === 'goal' && <p key={`g${shout.n}`} className="vb-shout is-goal" aria-live="polite">GOAL!</p>}
                {shout?.play === 'zgoal' && <p key={`z${shout.n}`} className="vb-shout is-against" aria-live="polite">Goal zwarte beren!</p>}
                {shout?.play === 'save' && <p key={`s${shout.n}`} className="vb-shout is-save" aria-live="polite">Gevangen! Hoge vijf!</p>}
                {rust && (
                    <div className="vb-rust" role="status">
                        {!reducedMotion && (
                            <svg className="vb-rust-art" viewBox="0 0 160 80" aria-hidden>
                                <rect className="vb-bench" x="14" y="66" width="132" height="8" rx="3" />
                                <g transform="translate(52 70)"><g className="vb-sip"><Bear kind="ijs" pose="drink" /></g></g>
                                <g transform="translate(108 70)"><g className="vb-sip is-late"><Bear kind="zwart" face={-1} pose="drink" /></g></g>
                            </svg>
                        )}
                        <p className="vb-rust-title">Rust!</p>
                        <p className="vb-rust-lead">Even drinken.</p>
                    </div>
                )}
            </div>

            <div className="vb-panel">
                <p className={`vb-tag${showRing || theirs ? ' is-on' : ''}${theirs ? ' is-zwart' : ''}`} aria-hidden={!showRing && !theirs}>
                    {theirs ? 'Pak de bal terug!' : 'Schiet op doel!'}
                </p>
                <SpelSignBox className={`vb-sign${showRing ? ' is-shot' : ''}`} question={question} feedback={feedback} flash={flash} answerClassName="vb-sign-answer" />
                <SpelKeypad questionKey={question.key} onAnswer={onAnswer} disabled={phase !== 'play' || rust} />
            </div>
        </div>
    );
}

const CONFETTI = 14;
const END_FANS = fans(-20, 320, 17).filter(f => f.row > 0);

// The end screen: the polar bears lift the cup in front of the cheering stand, a black bear claps along.
export function VoetbalEnding({ reducedMotion }: SkinEndingProps) {
    return (
        <div className={`spel-ending vb-ending${reducedMotion ? ' is-still' : ''}`}>
            <svg viewBox="0 0 300 130" preserveAspectRatio="xMidYMax meet" aria-hidden>
                <g className="vb-stand is-goal" transform="translate(0 26)">
                    <rect className="vb-stand-back" x={-300} y={14} width={900} height={66} />
                    {FAN_ROWS.slice(1).map(y => <rect key={y} className="vb-step" x={-300} y={y - 4} width={900} height={6} />)}
                    {END_FANS.map(f => <FanArt key={`${f.row}-${f.x}`} f={f} />)}
                    <rect className="vb-wall" x={-300} y={STAND.wall} width={900} height={STAND.apron - STAND.wall} />
                </g>
                <rect className="vb-apron" x={-300} y={98} width={900} height={200} />
                <path className="vb-line" d="M-300 110 L600 110" />
                <g transform="translate(92 120)"><g className="vb-hop"><Bear kind="ijs" pose="cheer" /></g></g>
                <g transform="translate(208 120)"><g className="vb-hop is-late"><Bear kind="ijs" face={-1} pose="cheer" /></g></g>
                <g transform="translate(260 122)"><g className="vb-bob"><Bear kind="zwart" face={-1} pose="cheer" /></g></g>
                <g transform="translate(150 124) scale(1.15)">
                    <g className="vb-hop is-mid">
                        <Bear kind="ijs" pose="cheer" />
                        <g transform="translate(0 -78)">
                            <path className="vb-cup" d="M-13 -16 L13 -16 Q13 2 0 5 Q-13 2 -13 -16 Z" />
                            <path className="vb-cup-handle" d="M-13 -12 Q-21 -10 -13 -2 M13 -12 Q21 -10 13 -2" />
                            <rect className="vb-cup" x="-3" y="4" width="6" height="7" />
                            <rect className="vb-cup" x="-9" y="10" width="18" height="5" rx="2" />
                        </g>
                    </g>
                </g>
                <g transform="translate(40 116)"><Ball r={7} /></g>
            </svg>
            <span className="vb-confetti" aria-hidden>
                {Array.from({ length: CONFETTI }, (_, i) => (
                    <span key={i} className="vb-bit" style={{ '--i': i, '--x': `${(i * 37) % 100}%`, '--c': `var(--spel-fill-${i % 6})` } as CSSProperties} />
                ))}
            </span>
        </div>
    );
}
