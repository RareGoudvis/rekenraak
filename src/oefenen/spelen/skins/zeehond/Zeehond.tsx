import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type Ref } from 'react';
import type { SkinEndingProps, SkinProps } from '../types';
import { SpelChoiceFace, SpelSign } from '../../SpelVisual';
import { choiceLabel, faceChars, faceKind, signClass } from '../../spelChoice';
import { Burst, Clouds } from '../../scene';
import { mulberry32 } from '../../distractors';
import SumClockRing from '../../levels/SumClockRing';
import { useSumClock } from '../../levels/useSumClock';
import { fishLeft, flightOf, type Flight } from './feed';
import { DIVE_MS, driftOffsets, driftsAt, fedAfter, girthOf, levelOf, pickPod, type SealLook, type SpotBox } from './pod';
import SealArt from './SealArt';
import './zeehond.css';

// Zeehondjes voeren: an icy sea with four seals on ice floes, each holding a sign with an answer. Tap (or 1–4) the
// seal with the answer: a fish flies from the bucket in a soft arc into its mouth, it claps and grows a little
// rounder. A wrong seal shuts its eyes, folds its flippers and looks away (no red); the right one waves its sign.
// The same seals stay all game, a new question flips their signs. Makkelijk: they bob on their floes; Normaal and
// up: the floes drift (pod.ts) and a clock runs per sum; time up = they all dive and come back up DIVE_MS later
// with the next sum (a mistake, onMiss).

const KEYS = ['1', '2', '3', '4'];
// The fish's flight (zeehond.css .zh-fly): it lands, the seal eats and grows.
const LAND_MS = 440;
// Room between two drifting floes, and from the sea's sides, px.
const DRIFT_GAP = 10;
const DRIFT_EDGE = 8;
// A phrase reads in Nunito, even a short one ("8 uur"); times ("08:15") and numbers stay in the math font.
const boardKind = (face: Parameters<typeof faceKind>[0]) => {
    const k = faceKind(face);
    return k === 'short' && /[a-z]/i.test(face?.text ?? '') ? 'words' : k;
};

// The last game's seals, for the end picture (same chunk): who ate how much.
let lastPod: { looks: SealLook[]; fed: number[] } | null = null;

export function FishArt({ className = '' }: { className?: string }) {
    return (
        <svg className={`zh-fish ${className}`} viewBox="0 0 64 32" aria-hidden>
            <path className="zh-fish-tail" d="M48 16 L62 5 L60 16 L62 27 Z" />
            <path className="zh-fish-body" d="M3 16 C10 4 34 2 50 16 C34 30 10 28 3 16 Z" />
            <path className="zh-fish-fin" d="M22 9 L28 3 L33 8" />
            <circle className="zh-fish-eye" cx="13" cy="14" r="2.6" />
        </svg>
    );
}

function Floe() {
    return (
        <svg className="zh-floe" viewBox="0 0 160 40" preserveAspectRatio="none" aria-hidden>
            <path className="zh-floe-ice" d="M8 14 L30 6 L70 9 L104 4 L140 8 L154 16 L146 30 L100 34 L50 33 L14 28 Z" />
            <path className="zh-floe-shine" d="M34 12 L60 13 M112 10 L132 12" />
        </svg>
    );
}

// A few water drops and a ripple by the floe each time it dips (the bob's own cycle).
function Splash() {
    return (
        <span className="zh-splash" aria-hidden>
            <span className="zh-drop" /><span className="zh-drop" /><span className="zh-ripple" />
        </span>
    );
}

// Small floes far out on the sea, drifting slowly to and fro behind the seals.
const FAR_FLOES = [
    { left: 8, top: 31, w: 9, d: 46, delay: -12 },
    { left: 62, top: 28, w: 7, d: 58, delay: -30 },
    { left: 84, top: 36, w: 11, d: 52, delay: -5 },
    { left: 34, top: 40, w: 6, d: 64, delay: -41 },
];

function Bucket({ left, total, fishRef }: { left: number; total: number; fishRef: Ref<HTMLSpanElement> }) {
    // Up to five fish stick out, fewer as the bucket empties; the last fish still shows one.
    const tails = left <= 0 ? 0 : Math.max(1, Math.ceil((left / Math.max(1, total)) * 5));
    return (
        <div className="zh-bucket" role="img" aria-label={`Nog ${left} ${left === 1 ? 'vis' : 'vissen'} in de emmer`}>
            <span className="zh-bucket-out" ref={fishRef} aria-hidden />
            <div className="zh-bucket-fish" aria-hidden>
                {Array.from({ length: tails }, (_, k) => <span key={k} className="zh-bucket-tail" style={{ '--k': k } as CSSProperties}><FishArt /></span>)}
            </div>
            <svg className="zh-bucket-art" viewBox="0 0 140 100" aria-hidden>
                <path className="zh-bucket-handle" d="M18 30 Q70 -26 122 30" />
                <path className="zh-bucket-body" d="M10 30 L130 30 L116 96 L24 96 Z" />
                <path className="zh-bucket-band" d="M14 48 L126 48 M20 78 L120 78" />
                <ellipse className="zh-bucket-rim" cx="70" cy="30" rx="60" ry="8" />
            </svg>
            <span className="zh-count" aria-hidden><FishArt className="zh-count-fish" /><span className="kiosk-math">{left}</span></span>
        </div>
    );
}

// Each seal bobs to its own beat: a bob length, a "may I have a fish?" beat and their offsets.
function beatsOf(seed: number, n: number) {
    const rng = mulberry32(seed ^ 0x5ea1);
    return Array.from({ length: n }, () => ({ bob: 4.2 + rng() * 1.8, beg: 6 + rng() * 4, bobAt: -rng() * 6, begAt: -rng() * 10 }));
}

export default function Zeehond({ question, choices, views, phase, feedback, onAnswer, onMiss, progress, options: picked, events }: SkinProps) {
    const level = levelOf(picked);
    const drifting = driftsAt(level);
    // Time up: the seals are under water (keyed per dive, for the splash) until DIVE_MS later.
    const [dive, setDive] = useState({ n: 0, under: false });
    const clock = useSumClock({
        level, questionKey: question?.key ?? null, live: phase === 'play' && !dive.under,
        onTimeUp: () => { setDive(d => ({ n: d.n + 1, under: true })); onMiss(); },
    });
    useEffect(() => {
        if (!dive.under) return;
        const t = window.setTimeout(() => setDive(d => ({ ...d, under: false })), DIVE_MS);
        return () => window.clearTimeout(t);
    }, [dive]);
    // A fresh set of seals per game (this component lives for one round).
    const [seed] = useState(() => Math.floor(Math.random() * 0x7fffffff));
    const pod = useMemo(() => pickPod(seed), [seed]);
    const beats = useMemo(() => beatsOf(seed, pod.length), [seed, pod.length]);
    const [fed, setFed] = useState<number[]>(() => pod.map(() => 0));
    // The question whose fish has landed (the seal eats, a splash and a twinkle).
    const [landed, setLanded] = useState<string | null>(null);
    // The pick, with the fish's throw measured at the tap (shown only if the seal was right).
    const [pick, setPick] = useState<{ key: string; index: number; flight: Flight | null } | null>(null);
    const options = choices ?? [];
    const pickedNow = pick && question && pick.key === question.key ? pick : null;
    const pickedIdx = pickedNow ? pickedNow.index : null;
    const answerIdx = feedback ? options.indexOf(feedback.expected) : -1;

    const root = useRef<HTMLDivElement>(null);
    const podRef = useRef<HTMLDivElement>(null);
    const bucketOut = useRef<HTMLSpanElement>(null);
    const mouths = useRef<(HTMLSpanElement | null)[]>([]);
    const spots = useRef<(HTMLDivElement | null)[]>([]);
    // Which seal the last tap went to (the 'correct' event feeds it).
    const tapped = useRef<{ key: string; index: number } | null>(null);

    const choose = (i: number) => {
        if (phase !== 'play' || dive.under || !question || options[i] === undefined) return;
        const box = root.current?.getBoundingClientRect();
        const from = bucketOut.current?.getBoundingClientRect();
        const to = mouths.current[i]?.getBoundingClientRect();
        setPick({ key: question.key, index: i, flight: box && from && to ? flightOf(question.key, box, from, to) : null });
        tapped.current = { key: question.key, index: i };
        onAnswer(options[i]);
    };
    const chooseRef = useRef(choose);
    useLayoutEffect(() => { chooseRef.current = choose; });

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
            const i = KEYS.indexOf(e.key);
            if (i >= 0) { e.preventDefault(); chooseRef.current(i); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    // A right answer feeds the tapped seal once its fish lands (at once when nothing flies).
    useEffect(() => {
        const timers: number[] = [];
        const off = events.on('correct', () => {
            const t = tapped.current;
            if (!t) return;
            tapped.current = null;
            const eat = () => { setFed(c => fedAfter(c, t.index, pod.length)); setLanded(t.key); };
            timers.push(window.setTimeout(eat, LAND_MS));
        });
        return () => { off(); timers.forEach(id => window.clearTimeout(id)); };
    }, [events, pod.length]);
    useEffect(() => { lastPod = { looks: pod, fed }; }, [pod, fed]);

    // Moeilijk: the floes drift (a frame loop writing each spot's translate). Paused under "Hoe los ik dit op?".
    const paused = phase === 'help';
    const pausedRef = useRef(paused);
    useEffect(() => { pausedRef.current = paused; }, [paused]);
    const hasQuestion = !!question;
    useEffect(() => {
        const podEl = podRef.current;
        const els = spots.current;
        if (!drifting || !podEl) return;
        let boxes: SpotBox[] = [];
        let size = { width: 0, height: 0 };
        let t = 0;
        const measure = () => {
            boxes = els.slice(0, pod.length).map(el => (el
                ? { x: el.offsetLeft - DRIFT_EDGE, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight }
                : { x: 0, y: 0, w: 0, h: 0 }));
            size = { width: podEl.clientWidth - 2 * DRIFT_EDGE, height: podEl.clientHeight };
        };
        const apply = () => {
            driftOffsets(t, boxes, { ...size, gap: DRIFT_GAP, seed }).forEach((o, i) => {
                const el = els[i];
                if (el) el.style.translate = `${o.dx.toFixed(1)}px ${o.dy.toFixed(1)}px`;
            });
        };
        measure();
        apply();
        const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => { measure(); apply(); });
        ro?.observe(podEl);
        let raf = 0;
        let last = performance.now();
        const tick = (now: number) => {
            // About 30 frames a second is smooth for a slow drift and half the work.
            if (now - last >= 32) {
                if (!pausedRef.current) t += Math.min(0.1, (now - last) / 1000);
                last = now;
                apply();
            }
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => {
            cancelAnimationFrame(raf);
            ro?.disconnect();
            els.forEach(el => { if (el) el.style.translate = ''; });
        };
    }, [drifting, seed, pod.length, hasQuestion]);

    if (!question) return <div className="zh-root" />;
    const flash = phase === 'right' || phase === 'wrong';
    const left = fishLeft(progress);
    const flight = phase === 'right' ? pickedNow?.flight : null;

    return (
        <div ref={root} className={`zh-root${views ? ' has-pictures' : ''}${paused ? ' is-paused' : ''}${drifting ? ' is-drifting' : ''}${dive.under ? ' is-diving' : ''}`} data-niveau={level}>
            <div className="zh-sea" aria-hidden>
                <div className="zh-sky">
                    <Clouds layer="far" outline={false} count={3} size={[90, 150]} band={[6, 40]} speed={120} seed={seed % 97} paused={paused} />
                    <Clouds layer="near" count={2} size={[110, 170]} band={[4, 30]} speed={90} seed={(seed % 89) + 3} paused={paused} />
                </div>
                <svg className="zh-berg" viewBox="0 0 200 60" preserveAspectRatio="none"><path d="M0 60 L30 22 L46 34 L70 8 L96 40 L110 30 L134 60 Z" /></svg>
                <svg className="zh-berg is-far" viewBox="0 0 200 60" preserveAspectRatio="none"><path d="M40 60 L80 18 L100 34 L126 14 L170 60 Z" /></svg>
                <div className="zh-waves" />
                {FAR_FLOES.map((f, k) => (
                    <span key={k} className="zh-far-floe" style={{ left: `${f.left}%`, top: `${f.top}%`, width: `${f.w}%`, animationDuration: `${f.d}s`, animationDelay: `${f.delay}s` }}>
                        <Floe />
                    </span>
                ))}
            </div>
            <div className="zh-top">
                <SumClockRing ringRef={clock.ring} limitMs={clock.limitMs} className="zh-ring" />
                <p className={`zh-sign kiosk-math${flash ? ' is-solved' : ''}${signClass(question)}`} aria-live="polite">
                    <SpelSign question={question} feedback={feedback} flash={flash} choices={options} views={views} answerClassName="zh-sign-answer" />
                </p>
            </div>
            <div ref={podRef} className="zh-pod" role="group" aria-label="Kies het antwoord">
                {options.map((c, i) => {
                    const face = views?.[i];
                    const look = pod[i % pod.length];
                    const beat = beats[i % beats.length];
                    const mine = pickedIdx === i;
                    const state = mine && phase === 'right' ? ' is-fed'
                        : mine && phase === 'wrong' ? ' is-nope'
                        : flash && i === answerIdx && feedback && !feedback.correct ? ' is-answer'
                        : flash ? ' is-rest' : '';
                    const ate = mine && phase === 'right' && landed === question.key;
                    return (
                        // Keyed by place, not by question: the same seals stay, only their signs change.
                        <div key={i} ref={el => { spots.current[i] = el; }} className={`zh-spot${state}${ate ? ' has-eaten' : ''}`} data-look={look.id} data-girth={girthOf(fed[i] ?? 0)}
                            style={{ '--i': i, '--bob': `${beat.bob}s`, '--bob-at': `${beat.bobAt}s`, '--beg': `${beat.beg}s`, '--beg-at': `${beat.begAt}s` } as CSSProperties}>
                            <div className="zh-bob">
                                <button type="button" className="zh-seal" disabled={phase !== 'play' || dive.under} aria-label={choiceLabel(c, face)} onClick={() => choose(i)}>
                                    <span className="zh-board-wrap">
                                        <span key={question.key} className={`zh-board kiosk-math is-${boardKind(face)}`} style={{ '--face-chars': faceChars(face) } as CSSProperties} aria-hidden><SpelChoiceFace value={c} view={face} /></span>
                                        <span className="zh-pole" aria-hidden />
                                    </span>
                                    <span className="zh-body-wrap">
                                        <SealArt look={look} girth={girthOf(fed[i] ?? 0)} />
                                        <span className="zh-mouth-at" ref={el => { mouths.current[i] = el; }} aria-hidden />
                                        {ate && <Burst key={question.key} kind="sparkle" x="50%" y="12%" spread={90} count={8} seed={question.index + 1} />}
                                    </span>
                                </button>
                                <Floe />
                                <Splash />
                                {ate && <Burst key={`s${question.key}`} kind="splash" x="50%" y="88%" spread={60} count={8} seed={question.index + 5} />}
                                {dive.under && <Burst key={`d${dive.n}`} kind="splash" x="50%" y="70%" spread={80} count={10} seed={dive.n * 7 + i} />}
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="zh-shore">
                <Bucket left={left} total={progress.total ?? left} fishRef={bucketOut} />
            </div>
            {flight && (
                <span className="zh-fly" style={{ left: flight.x, top: flight.y, '--dx': `${flight.dx}px`, '--dy': `${flight.dy}px`, '--arc': `${flight.arc}px`, '--face': flight.dx > 0 ? -1 : 1 } as CSSProperties} aria-hidden>
                    <span className="zh-fly-y"><FishArt /></span>
                </span>
            )}
        </div>
    );
}

/** The end picture: the game's seals, as round as they ate themselves, clapping on one floe. */
export function ZeehondEnding({ progress }: SkinEndingProps) {
    const looks = lastPod?.looks ?? pickPod(1);
    // Without a record (a reload), share the fish out evenly.
    const fed = lastPod?.fed ?? looks.map((_, i) => Math.floor((progress.right + looks.length - 1 - i) / looks.length));
    return (
        <div className="spel-ending zh-ending">
            <div className="zh-ending-sea" aria-hidden />
            <div className="zh-ending-pod" aria-hidden>
                {looks.map((look, i) => (
                    <span key={look.id} className="zh-ending-seal" style={{ '--i': i } as CSSProperties}>
                        <SealArt look={look} girth={girthOf(fed[i] ?? 0)} />
                    </span>
                ))}
            </div>
            <span className="zh-ending-floe" aria-hidden><Floe /></span>
        </div>
    );
}
