import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { Star } from '@phosphor-icons/react';
import { formatMathNumber } from '../../../../services/math/formatters';
import type { SkinProps } from '../types';
import { floatAt, floatPace, floatPath, type FloatGeom, type FloatPath } from './float';
import './ballonnen.css';

// Ballonnen: the sum on a sign, four balloons float up past it and wrap round to the bottom. Tap (or 1–4)
// the right one and it pops; a wrong one floats away while the right balloon lights up. A new question
// swaps the numbers in place and blows up a fresh balloon where one popped. One rAF loop moves the
// balloons (transforms only, sizes measured on resize); everything else is CSS. Frozen under help.

const BITS = 10;
const SLOTS = [0, 1, 2, 3];
// A streak this long earns the "op een rij" ribbon (owner brief: praise, never shame).
const RIBBON_FROM = 3;
const RIBBON_MS = 1400;

function Cloud({ className }: { className: string }) {
    return (
        <svg className={`bal-cloud ${className}`} viewBox="0 0 120 60" aria-hidden>
            <path d="M18 50 Q4 50 6 38 Q8 27 22 29 Q24 12 42 14 Q52 2 68 10 Q84 4 90 20 Q110 18 112 34 Q116 50 98 50 Z" />
        </svg>
    );
}

function BalloonArt() {
    return (
        <svg className="bal-art" viewBox="0 0 100 160" aria-hidden>
            <path className="bal-string" d="M50 110 C 42 124, 58 136, 50 158" />
            <path className="bal-knot" d="M43 112 L57 112 L50 101 Z" />
            <ellipse className="bal-body" cx="50" cy="54" rx="42" ry="50" />
            <ellipse className="bal-shine" cx="33" cy="34" rx="7" ry="13" transform="rotate(25 33 34)" />
        </svg>
    );
}

// The stage as the float maths needs it; read on mount and on resize only (never inside the loop).
function measure(sky: HTMLDivElement): FloatGeom | null {
    const bal = sky.querySelector<HTMLElement>('.bal');
    const num = sky.querySelector<HTMLElement>('.bal-num');
    const top = sky.querySelector<HTMLElement>('.bal-top');
    if (!bal || sky.clientHeight <= 0 || bal.offsetHeight <= 0) return null;
    const bh = bal.offsetHeight;
    return {
        w: sky.clientWidth, h: sky.clientHeight, bw: bal.offsetWidth, bh,
        // SYNC: ballonnen.css .bal-num top: 33.75%.
        numAt: bh * 0.3375, numHalf: (num?.offsetHeight ?? bh * 0.15) / 2,
        top: top ? top.offsetTop + top.offsetHeight : 0,
    };
}

export default function Ballonnen({ question, choices, phase, feedback, onAnswer, progress, events, reducedMotion }: SkinProps) {
    const [picked, setPicked] = useState<{ key: string; index: number } | null>(null);
    const [ribbon, setRibbon] = useState<{ count: number; at: number } | null>(null);
    const options = choices ?? [];
    const pickedIdx = picked && question && picked.key === question.key ? picked.index : null;
    // The balloon that popped or floated away on the last question comes back blown up anew.
    const freshIdx = picked && question && picked.key !== question.key ? picked.index : null;
    const answerIdx = feedback ? options.indexOf(feedback.expected) : -1;

    const pick = (i: number) => {
        if (phase !== 'play' || !question || options[i] === undefined) return;
        setPicked({ key: question.key, index: i });
        onAnswer(options[i]);
    };
    const pickRef = useRef(pick);
    useLayoutEffect(() => { pickRef.current = pick; });

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
            const i = ['1', '2', '3', '4'].indexOf(e.key);
            if (i >= 0) { e.preventDefault(); pickRef.current(i); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    useEffect(() => events.on('streak', ({ count }) => { if (count >= RIBBON_FROM) setRibbon({ count, at: Date.now() }); }), [events]);
    useEffect(() => {
        if (!ribbon) return;
        const id = window.setTimeout(() => setRibbon(null), RIBBON_MS);
        return () => window.clearTimeout(id);
    }, [ribbon]);

    // ── The float: game time, the measured stage, the four boxes ──
    const sky = useRef<HTMLDivElement>(null);
    const slots = useRef<(HTMLDivElement | null)[]>([]);
    const stage = useRef<{ g: FloatGeom; path: FloatPath } | null>(null);
    const tau = useRef(0);
    const live = useRef({ phase, streak: progress.streak, reducedMotion });
    useLayoutEffect(() => { live.current = { phase, streak: progress.streak, reducedMotion }; });

    const placeAll = () => {
        const st = stage.current;
        if (!st) return;
        const still = live.current.reducedMotion;
        slots.current.forEach((el, i) => {
            if (!el) return;
            const { x, y } = floatAt(st.g, st.path, i, still ? null : tau.current);
            el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
            // Its height on the stage (tests, debugging).
            el.dataset.y = y.toFixed(0);
        });
    };
    const placeRef = useRef(placeAll);
    useLayoutEffect(() => { placeRef.current = placeAll; });

    const hasQuestion = !!question;
    // Measure before the first paint (no flash of stacked balloons), then on every resize.
    useLayoutEffect(() => {
        const el = sky.current;
        if (!el || !hasQuestion) return;
        const remeasure = () => {
            const g = measure(el);
            stage.current = g ? { g, path: floatPath(g) } : null;
            placeRef.current();
        };
        remeasure();
        if (typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver(remeasure);
        ro.observe(el);
        return () => ro.disconnect();
    }, [hasQuestion]);

    // Reduced motion: still balloons, placed once per change.
    useLayoutEffect(() => { placeRef.current(); }, [reducedMotion]);

    useEffect(() => {
        if (reducedMotion) return;
        let raf = 0;
        let last: number | null = null;
        const frame = (t: number) => {
            raf = requestAnimationFrame(frame);
            // A long gap (a hidden tab) never jumps the balloons.
            const dt = last === null ? 0 : Math.min(0.1, Math.max(0, (t - last) / 1000));
            last = t;
            // "Hoe los ik dit op?": everything waits.
            if (live.current.phase === 'help') return;
            tau.current += dt * floatPace(live.current.streak);
            placeRef.current();
        };
        raf = requestAnimationFrame(frame);
        return () => cancelAnimationFrame(raf);
    }, [reducedMotion]);

    if (!question) return <div className="bal-sky" />;
    const flash = phase === 'right' || phase === 'wrong';
    const [lhs] = question.text.split('?');

    return (
        <div ref={sky} className={`bal-sky${phase === 'help' ? ' is-paused' : ''}${reducedMotion ? ' is-still' : ''}`}>
            <Cloud className="bal-cloud-a" />
            <Cloud className="bal-cloud-b" />
            <Cloud className="bal-cloud-c" />
            <svg className="bal-hills" viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden>
                <path d="M0 34 Q60 6 130 28 T260 24 T400 20 L400 60 L0 60 Z" />
            </svg>

            <div className="bal-top">
                <p className={`bal-sign kiosk-math${flash ? ' is-solved' : ''}`} aria-live="polite">
                    {flash && feedback
                        ? <>{lhs}<span className="bal-sign-answer">{formatMathNumber(Number(feedback.expected))}</span></>
                        : question.text}
                </p>
                {ribbon && (
                    <p key={ribbon.at} className="bal-ribbon" role="status">
                        <Star weight="fill" aria-hidden /> {ribbon.count} op een rij!
                    </p>
                )}
            </div>

            <div className="bal-field" role="group" aria-label="Kies het antwoord">
                {SLOTS.filter(i => options[i] !== undefined).map(i => {
                    const c = options[i];
                    const state = pickedIdx === i ? (feedback?.correct ? ' is-popped' : ' is-away')
                        : flash && i === answerIdx && !feedback?.correct ? ' is-answer'
                        : flash ? ' is-rest'
                        : freshIdx === i ? ' is-fresh' : '';
                    return (
                        <div key={i} ref={el => { slots.current[i] = el; }} className={`bal-slot${state}`}
                            style={{ '--i': i, '--fill': `var(--spel-fill-${i})` } as CSSProperties}>
                            <div className="bal-bob">
                                <button type="button" className="bal" disabled={phase !== 'play'} aria-label={formatMathNumber(Number(c))}
                                    // A moving target: the tap counts where the finger lands, not where it lifts.
                                    onPointerDown={e => { if (e.button === 0) pick(i); }}
                                    onClick={() => pick(i)}>
                                    <BalloonArt />
                                    {i === answerIdx && !feedback?.correct && <span className="bal-ring" aria-hidden />}
                                    {/* Keyed per question: the new number fades in on the same balloon. */}
                                    <span key={question.key} className="bal-num kiosk-math" aria-hidden>{formatMathNumber(Number(c))}</span>
                                    <span className="bal-key" aria-hidden>{i + 1}</span>
                                </button>
                                {state === ' is-popped' && !reducedMotion && (
                                    <span className="bal-burst" aria-hidden>
                                        {Array.from({ length: BITS }, (_, b) => <span key={b} className="bal-bit" style={{ '--a': `${(360 / BITS) * b}deg` } as CSSProperties} />)}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
