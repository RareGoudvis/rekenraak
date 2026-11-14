import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { formatMathNumber } from '../../../../services/math/formatters';
import SpelKeypad from '../../SpelKeypad';
import type { SkinEndingProps, SkinProps } from '../types';
import { VOETBAL, goalsLine, halfTimeDue, isShot, loadBest, newMatch, playOf, saveBest, shotStep, type Match } from './match';
import './voetbal.css';

// Voetbal: the polar bears (blue scarves) play the friendly black bears (orange scarves). Each right answer is a
// pass up the pitch (untimed); a wrong one lets a black bear tap the ball away, "Oeps!", back to the own half.
// After four passes the sum is the shot, on a gentle 10 s ring (onMiss): GOAL! or the keeper's catch and a high
// five. The match clock is the session's; at its half the skin holds it for a short "Rust!". Transforms only.

type Spot = `b${number}` | `t${number}` | 'net' | 'keeper';
interface XY { x: number; y: number }

// Feet positions in the scene (viewBox 0 0 300 270): the polar bears in front, from the own half to the striker.
const IJS: readonly XY[] = [{ x: 24, y: 248 }, { x: 72, y: 240 }, { x: 122, y: 250 }, { x: 172, y: 240 }, { x: 220, y: 246 }];
// The black bears behind, between them; the one ahead of the ball comes forward and taps it away.
const ZWART: readonly XY[] = [{ x: 96, y: 172 }, { x: 148, y: 166 }, { x: 198, y: 174 }];
const KEEPER: XY = { x: 268, y: 202 };
// The save's high five: the keeper steps out, the striker walks up, the star where their paws meet.
const KEEPER_FIVE: XY = { x: 252, y: 208 };
const STRIKER_FIVE: XY = { x: 214, y: 224 };
const FIVE: XY = { x: 233, y: 166 };
const tapperOf = (passes: number) => Math.max(0, Math.min(ZWART.length - 1, passes - 1));

function spotXY(s: Spot): XY {
    if (s === 'net') return { x: 254, y: 156 };
    if (s === 'keeper') return { x: KEEPER_FIVE.x - 2, y: KEEPER_FIVE.y - 24 };
    const i = Number(s.slice(1));
    const p = s[0] === 'b' ? IJS[i] : ZWART[i];
    return s[0] === 'b' ? { x: p.x + 13, y: p.y - 4 } : { x: p.x - 13, y: p.y - 4 };
}

type Pose = 'stand' | 'cheer' | 'keeper' | 'drink';

// A round sticker bear, feet at 0 0, facing right (face -1 mirrors it).
export function Bear({ kind, face = 1, pose = 'stand' }: { kind: 'ijs' | 'zwart'; face?: 1 | -1; pose?: Pose }) {
    const up = pose === 'cheer' || pose === 'keeper';
    return (
        <g className={`vb-bear is-${kind}`} transform={face < 0 ? 'scale(-1 1)' : undefined}>
            <ellipse className="vb-fur" cx="-7" cy="-5" rx="6.5" ry="6" />
            <ellipse className="vb-fur" cx="7" cy="-5" rx="6.5" ry="6" />
            {up ? (
                <>
                    <ellipse className="vb-fur" cx="-15" cy="-38" rx="5" ry="10" transform="rotate(-28 -15 -38)" />
                    <ellipse className="vb-fur" cx="15" cy="-38" rx="5" ry="10" transform="rotate(28 15 -38)" />
                </>
            ) : pose === 'drink' ? (
                <>
                    <ellipse className="vb-fur" cx="-14" cy="-21" rx="5" ry="10" transform="rotate(14 -14 -21)" />
                    <ellipse className="vb-fur" cx="14" cy="-37" rx="5" ry="9" transform="rotate(-25 14 -37)" />
                </>
            ) : (
                <>
                    <ellipse className="vb-fur" cx="-14" cy="-21" rx="5" ry="10" transform="rotate(14 -14 -21)" />
                    <ellipse className="vb-fur" cx="14" cy="-21" rx="5" ry="10" transform="rotate(-14 14 -21)" />
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
            {pose === 'keeper' && (
                <>
                    <circle className="vb-glove" cx="-19" cy="-47" r="5.5" />
                    <circle className="vb-glove" cx="19" cy="-47" r="5.5" />
                </>
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

// The pitch, the ad boards and the goal; netBulge = the net puffs out (a goal).
function Pitch({ netId, bulge }: { netId: string; bulge: number }) {
    return (
        <>
            <defs>
                <pattern id={netId} width="6" height="6" patternUnits="userSpaceOnUse">
                    <path className="vb-net-line" d="M0 0 L6 6 M6 0 L0 6" />
                </pattern>
            </defs>
            <path className="vb-cloud" d="M40 46 Q30 46 32 37 Q34 30 44 32 Q47 21 59 23 Q67 15 77 21 Q88 18 90 29 Q101 29 101 38 Q102 46 91 46 Z" />
            <path className="vb-cloud is-far" d="M250 28 Q243 28 244 22 Q246 17 252 18 Q254 10 263 12 Q269 6 276 10 Q285 8 287 16 Q296 15 296 22 Q297 28 288 28 Z" />
            <rect className="vb-boards" x={-600} y={66} width={1600} height={20} />
            {[0, 1, 2, 3, 4, 5, 6].map(i => <rect key={i} className={`vb-board-ad is-${i % 3}`} x={-12 + i * 62} y={70} width={40} height={12} rx={3} />)}
            <rect className="vb-grass" x={-600} y={86} width={1600} height={600} />
            {Array.from({ length: 16 }, (_, i) => <rect key={i} className="vb-stripe" x={-600 + i * 100} y={87} width={50} height={600} />)}
            <path className="vb-line" d="M-600 94 L1000 94" />
            <path className="vb-line" d="M150 94 L150 600" />
            <ellipse className="vb-line" cx="150" cy="190" rx="40" ry="17" />
            <path className="vb-line" d="M1000 118 L226 118 L218 256 L1000 256" />
            <g className={`vb-net${bulge ? ` is-bulge-${bulge % 2}` : ''}`}>
                <path className="vb-net-back" d="M246 136 L304 128 L304 196 L292 202 L246 202 Z" style={{ fill: `url(#${netId})` }} />
            </g>
            <path className="vb-post-edge" d="M246 202 L246 136 L292 136 L292 202" />
            <path className="vb-post" d="M246 202 L246 136 L292 136 L292 202" />
            <path className="vb-goal-line" d="M240 202 L298 202" />
        </>
    );
}

export default function Voetbal({ question, phase, feedback, onAnswer, onMiss, onHold, onReport, sound, progress, events, options, runKey, reducedMotion }: SkinProps) {
    const netId = useId().replace(/:/g, '');
    const [match, setMatch] = useState<Match>(newMatch);
    const matchRef = useRef(match);
    const [ball, setBall] = useState<Spot>('b0');
    // The last play's shout ("Oeps!", GOAL!, Gevangen!), keyed per play; null when it has faded.
    const [shout, setShout] = useState<{ play: 'tap' | 'goal' | 'save'; n: number; tapper: number } | null>(null);
    const [rust, setRust] = useState(false);
    const [shot, setShot] = useState({ id: '', left: VOETBAL.shotMs as number });
    const bestKey = `${runKey ?? 'voetbal'}|${options.tijd ?? '3'}`;
    const [bestBefore] = useState(() => loadBest(bestKey));
    const timers = useRef<number[]>([]);
    const later = (ms: number, fn: () => void) => { timers.current.push(window.setTimeout(fn, ms)); };
    useEffect(() => () => { timers.current.forEach(t => window.clearTimeout(t)); }, []);

    // The latest props for the event handlers and the clocks (they are set up once).
    const live = useRef({ sound, onMiss, onHold, onReport, bestKey, bestBefore });
    useLayoutEffect(() => { live.current = { sound, onMiss, onHold, onReport, bestKey, bestBefore }; });

    const report = (goals: number) => live.current.onReport?.({
        title: 'Wat een wedstrijd!', lead: goalsLine(goals),
        detail: goals > 0 && goals > live.current.bestBefore ? 'Nieuw record!' : undefined,
    });

    // Kick-off: the whistle, and the end lines from the start (0 goals).
    useEffect(() => {
        live.current.sound('whistle');
        report(0);
    }, []);

    useEffect(() => {
        const onPlay = (correct: boolean) => {
            const before = matchRef.current;
            const m = playOf(before, correct);
            matchRef.current = m;
            setMatch(m);
            if (m.last === 'pass') { setBall(`b${m.passes}`); return; }
            const tapper = tapperOf(before.passes);
            setShout({ play: m.last as 'tap' | 'goal' | 'save', n: m.n, tapper });
            later(1500, () => setShout(s => s?.n === m.n ? null : s));
            if (m.last === 'tap') {
                setBall(`t${tapper}`);
                later(VOETBAL.tapMs, () => setBall(b => b === `t${tapper}` ? 'b0' : b));
            } else if (m.last === 'goal') {
                setBall('net');
                live.current.sound('win');
                saveBest(live.current.bestKey, m.goals);
                report(m.goals);
                later(VOETBAL.settleMs, () => { if (matchRef.current.n === m.n) setBall('b0'); });
            } else {
                setBall('keeper');
                later(250, () => live.current.sound('caught'));
                later(VOETBAL.settleMs, () => { if (matchRef.current.n === m.n) setBall('b0'); });
            }
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

    if (!question) return <div className="vb-root" />;
    const flash = phase === 'right' || phase === 'wrong';
    const [lhs] = question.text.split('?');
    const showRing = shooting && (phase === 'play' || phase === 'help');
    const cheering = shout?.play === 'goal';
    const fiving = shout?.play === 'save';
    const b = spotXY(ball);
    const passDots = Math.min(match.passes, VOETBAL.passes);

    // Back to front, so the nearer bears stand in front.
    const players = [
        ...IJS.map((p, i) => ({ ...(i === VOETBAL.passes && fiving ? STRIKER_FIVE : p), id: `ijs${i}`, el: <Bear kind="ijs" pose={cheering || (fiving && i === VOETBAL.passes) ? 'cheer' : 'stand'} /> })),
        ...ZWART.map((p, i) => ({ ...p, id: `zw${i}`, el: <Bear kind="zwart" face={-1} /> })),
    ].sort((a, c) => a.y - c.y);

    return (
        <div className={`vb-root${phase === 'help' || rust ? ' is-paused' : ''}${reducedMotion ? ' is-still' : ''}`}>
            <div className="vb-world">
                <svg className="vb-svg" viewBox="0 0 300 270" preserveAspectRatio="xMidYMax meet" aria-hidden>
                    <Pitch netId={netId} bulge={match.goals} />
                    <g className={`vb-keeper${shout?.play === 'goal' ? ` is-dive-${shout.n % 2}` : ''}`}
                        style={{ transform: `translate(${(fiving ? KEEPER_FIVE : KEEPER).x}px, ${(fiving ? KEEPER_FIVE : KEEPER).y}px)` }}>
                        <g className="vb-bob"><Bear kind="zwart" face={-1} pose="keeper" /></g>
                    </g>
                    {players.map(p => (
                        <g key={p.id} className={`vb-player${p.id.startsWith('ijs') && cheering ? ` is-cheer-${shout!.n % 2}` : ''}`}
                            style={{ transform: `translate(${p.x}px, ${p.y}px)` }}>
                            <g className="vb-bob" style={{ '--d': `${(p.x % 7) * -0.3}s` } as CSSProperties}>{p.el}</g>
                        </g>
                    ))}
                    <g className="vb-ball-at" style={{ transform: `translate(${b.x}px, ${b.y}px)` }}>
                        <g className="vb-roll" style={{ transform: `rotate(${b.x * 5}deg)` }}><Ball r={7} /></g>
                    </g>
                    {fiving && (
                        // The star sits where the two raised paws meet (the striker and keeper step together, voetbal.css).
                        <g transform={`translate(${FIVE.x} ${FIVE.y})`}>
                            <g key={`five-${shout.n}`} className="vb-five">
                                <path className="vb-five-star" d="M0 -11 L3 -3.5 L11 -3.5 L4.5 1.5 L7 9 L0 4.5 L-7 9 L-4.5 1.5 L-11 -3.5 L-3 -3.5 Z" />
                            </g>
                        </g>
                    )}
                    {shout?.play === 'tap' && (
                        <g transform={`translate(${ZWART[shout.tapper].x} ${ZWART[shout.tapper].y - 76})`}>
                            <g key={`oeps-${shout.n}`} className="vb-bubble">
                                <rect x="-24" y="-13" width="48" height="24" rx="10" />
                                <path d="M-4 11 L0 19 L5 11 Z" />
                                <text x="0" y="5" textAnchor="middle">Oeps!</text>
                            </g>
                        </g>
                    )}
                </svg>

                <div className="vb-hud">
                    <p className="vb-score" aria-label={goalsLine(match.goals)}>
                        <span className="vb-score-team">IJsberen</span>
                        <span key={match.goals} className={`vb-score-num${match.goals ? ' is-new' : ''}`}>{match.goals}</span>
                    </p>
                    <span className="vb-half">{match.half === 1 ? '1e helft' : '2e helft'}</span>
                    <span className="vb-dots" role="img" aria-label={showRing ? 'Schieten!' : `${passDots} van ${VOETBAL.passes} passes`}>
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
                <p className={`vb-tag${showRing ? ' is-on' : ''}`} aria-hidden={!showRing}>Schiet op doel!</p>
                <p className={`vb-sign kiosk-math${showRing ? ' is-shot' : ''}`} aria-live="polite">
                    {flash && feedback
                        ? <>{lhs}<span className="vb-sign-answer">{formatMathNumber(Number(feedback.expected))}</span></>
                        : question.text}
                </p>
                <SpelKeypad questionKey={question.key} onAnswer={onAnswer} disabled={phase !== 'play' || rust} />
            </div>
        </div>
    );
}

const CONFETTI = 14;

// The end screen: the polar bears lift the cup, a black bear claps along.
export function VoetbalEnding({ reducedMotion }: SkinEndingProps) {
    return (
        <div className={`spel-ending vb-ending${reducedMotion ? ' is-still' : ''}`}>
            <svg viewBox="0 0 300 130" preserveAspectRatio="xMidYMax meet" aria-hidden>
                <rect className="vb-grass" x={-300} y={104} width={900} height={200} />
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
