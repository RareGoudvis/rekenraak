import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { Star } from '@phosphor-icons/react';
import type { SkinProps } from '../types';
import { SpelChoiceFace, SpelSign } from '../../SpelVisual';
import { choiceLabel, faceChars, faceKind, pictureClass, signClass } from '../../spelChoice';
import { Burst, Clouds, replay } from '../../scene';
import { floatAt, floatPace, floatPath, type FloatGeom, type FloatPath } from './float';
import { birdAt, birdFlight, birdPerch, nextLand, slotState, type Land } from './scenery';
import Lands from './Lands';
import './ballonnen.css';

// Ballonnen: the sum on a sign, four balloons float up past it and wrap round to the bottom. Tap (or 1–4)
// the right one and it pops; a wrong one goes pfff, zigzags away and the scene shakes, then the right
// balloon glows. A new question swaps the numbers in place and blows up a fresh balloon where one went.
// Now and then a bird flies by: tapping it switches the landscape (never an answer). One rAF loop moves
// the balloons and the bird (transforms only, sizes measured on resize); everything else is CSS. Frozen under help.

const BITS = 10;
const SLOTS = [0, 1, 2, 3];
// A streak this long earns the "op een rij" ribbon (owner brief: praise, never shame).
const RIBBON_FROM = 3;
const RIBBON_MS = 1400;

// The landscape outlives a round (Opnieuw spelen keeps the pupil's pick for this visit).
let keptLand: Land = 'gras';

function BalloonArt() {
    return (
        <svg className="bal-art" viewBox="0 0 100 160" aria-hidden>
            <path className="bal-string" d="M50 110 C 42 124, 58 136, 50 158" />
            {/* The air escaping from the knot, shown only while a wrong pick deflates. */}
            <path className="bal-air" d="M43 118 Q36 128 40 140 M50 121 Q50 132 50 144 M57 118 Q64 128 60 140" />
            <path className="bal-knot" d="M43 112 L57 112 L50 101 Z" />
            <g className="bal-skin">
                <ellipse className="bal-body" cx="50" cy="54" rx="42" ry="50" />
                <ellipse className="bal-shine" cx="33" cy="34" rx="7" ry="13" transform="rotate(25 33 34)" />
            </g>
        </svg>
    );
}

function BirdArt() {
    return (
        <svg className="bal-bird-art" viewBox="0 0 80 60" aria-hidden>
            <path className="bal-bird-tail" d="M16 30 L2 22 L5 33 L0 43 L17 38 Z" />
            <ellipse className="bal-bird-body" cx="38" cy="34" rx="24" ry="17" />
            <ellipse className="bal-bird-belly" cx="43" cy="41" rx="14" ry="8" />
            <path className="bal-bird-beak" d="M60 28 L76 33 L60 38 Z" />
            <circle className="bal-bird-eye" cx="51" cy="27" r="4.5" />
            <circle className="bal-bird-pupil" cx="52.5" cy="27" r="2" />
            <path className="bal-bird-wing" d="M38 31 Q24 4 10 9 Q16 30 34 39 Z" />
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

export default function Ballonnen({ question, choices, views, phase, feedback, onAnswer, progress, events, reducedMotion, sound }: SkinProps) {
    const [picked, setPicked] = useState<{ key: string; index: number } | null>(null);
    const [ribbon, setRibbon] = useState<{ count: number; at: number } | null>(null);
    const [land, setLand] = useState<Land>(keptLand);
    const [switched, setSwitched] = useState(false);
    const options = choices ?? [];
    const pickedIdx = picked && question && picked.key === question.key ? picked.index : null;
    // The balloon that popped or went away on the last question comes back blown up anew.
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

    // A wrong pick: the scene gives a short shake (the sign stays put and readable).
    const scene = useRef<HTMLDivElement>(null);
    useEffect(() => events.on('wrong', () => { if (!reducedMotion) replay(scene.current, 'spel-shake'); }), [events, reducedMotion]);

    useEffect(() => events.on('streak', ({ count }) => { if (count >= RIBBON_FROM) setRibbon({ count, at: Date.now() }); }), [events]);
    useEffect(() => {
        if (!ribbon) return;
        const id = window.setTimeout(() => setRibbon(null), RIBBON_MS);
        return () => window.clearTimeout(id);
    }, [ribbon]);

    // ── The float: game time, the measured stage, the four boxes and the bird ──
    const sky = useRef<HTMLDivElement>(null);
    const slots = useRef<(HTMLDivElement | null)[]>([]);
    const stage = useRef<{ g: FloatGeom; path: FloatPath } | null>(null);
    const tau = useRef(0);
    // The bird keeps its own clock (s of play): the streak speeds up the balloons, never the bird.
    const birdT = useRef(0);
    const bird = useRef<HTMLButtonElement>(null);
    const live = useRef({ phase, streak: progress.streak, reducedMotion, land });
    useLayoutEffect(() => { live.current = { phase, streak: progress.streak, reducedMotion, land }; });

    const placeBird = (g: FloatGeom) => {
        const el = bird.current;
        if (!el) return;
        const bw = el.offsetWidth, bh = el.offsetHeight;
        if (live.current.reducedMotion) {
            const { x, y } = birdPerch(live.current.land, g.w, g.h, bw, bh);
            el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
            el.dataset.k = 'perch';
            return;
        }
        const f = birdFlight(birdT.current);
        if (!f) {
            if (el.dataset.k) { el.dataset.k = ''; el.style.transform = ''; delete el.dataset.flee; }
            return;
        }
        // A new flight: a bird that was tapped last time comes back calm.
        if (el.dataset.k !== String(f.k)) { el.dataset.k = String(f.k); delete el.dataset.flee; }
        el.dataset.dir = f.dir === 1 ? 'right' : 'left';
        const { x, y } = birdAt(f, g.w, g.top, bw, bh);
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    };

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
        placeBird(st.g);
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

    // Reduced motion: still balloons and a bird on the ground, placed once per change (a new landscape moves its perch).
    useLayoutEffect(() => { placeRef.current(); }, [reducedMotion, land]);

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
            birdT.current += dt;
            placeRef.current();
        };
        raf = requestAnimationFrame(frame);
        return () => cancelAnimationFrame(raf);
    }, [reducedMotion]);

    // The bird: a tap switches the landscape and sends it off; it never answers and never counts as a mistake.
    const tapBird = () => {
        const el = bird.current;
        if (!el || !el.dataset.k || el.dataset.flee) return;
        if (el.dataset.k !== 'perch') el.dataset.flee = '1';
        const next = nextLand(land);
        keptLand = next;
        setLand(next);
        setSwitched(true);
        sound('flip');
    };

    if (!question) return <div className="bal-sky" />;
    const flash = phase === 'right' || phase === 'wrong';
    const paused = phase === 'help';
    const input = { picked: pickedIdx, fresh: freshIdx, answer: answerIdx, flash, correct: !!feedback?.correct };

    return (
        <div ref={sky} className={`bal-sky is-${land}${pictureClass(views)}${paused ? ' is-paused' : ''}${reducedMotion ? ' is-still' : ''}`} data-land={land}>
            <div ref={scene} className="bal-scene">
                <Lands land={land} switched={switched} reducedMotion={reducedMotion} paused={paused} />
                <Clouds layer="far" outline={false} count={3} size={[90, 150]} band={[10, 46]} speed={120} seed={5} paused={paused} reducedMotion={reducedMotion} />
                <Clouds layer="near" count={2} size={[120, 190]} band={[4, 28]} speed={80} seed={12} paused={paused} reducedMotion={reducedMotion} />

                <div className="bal-field" role="group" aria-label="Kies het antwoord">
                    {SLOTS.filter(i => options[i] !== undefined).map(i => {
                        const c = options[i];
                        const view = views?.[i];
                        const state = slotState(i, input);
                        return (
                            <div key={i} ref={el => { slots.current[i] = el; }} className={`bal-slot is-${state}`}
                                style={{ '--i': i, '--fill': `var(--spel-fill-${i})` } as CSSProperties}>
                                <div className="bal-bob">
                                    {state === 'answer' && <span className="bal-glow" aria-hidden />}
                                    <button type="button" className="bal" disabled={phase !== 'play'} aria-label={choiceLabel(c, view)}
                                        // A moving target: the tap counts where the finger lands, not where it lifts.
                                        onPointerDown={e => { if (e.button === 0) pick(i); }}
                                        onClick={() => pick(i)}>
                                        <BalloonArt />
                                        {/* Keyed per question: the new number fades in on the same balloon. */}
                                        <span key={question.key} className={`bal-num kiosk-math is-${faceKind(view)}`} style={{ '--face-chars': faceChars(view) } as CSSProperties} aria-hidden><SpelChoiceFace value={c} view={view} /></span>
                                    </button>
                                    {state === 'popped' && !reducedMotion && (
                                        <span className="bal-burst" aria-hidden>
                                            {Array.from({ length: BITS }, (_, b) => <span key={b} className="bal-bit" style={{ '--a': `${(360 / BITS) * b}deg` } as CSSProperties} />)}
                                        </span>
                                    )}
                                    {state === 'deflate' && <Burst key={question.key} kind="smoke" x="50%" y="70%" spread={44} count={7} seed={question.index + 2} reducedMotion={reducedMotion} />}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <button ref={bird} type="button" className="bal-bird" tabIndex={-1} aria-label="Vogel: tik voor een ander landschap" data-k=""
                    // Never takes the focus: keys 1–4 keep answering and no focus ring is left behind.
                    onMouseDown={e => e.preventDefault()}
                    onPointerDown={e => { if (e.button === 0) tapBird(); }}>
                    <span className="bal-bird-fly"><BirdArt /></span>
                </button>
            </div>

            <div className="bal-top">
                <p className={`bal-sign kiosk-math${flash ? ' is-solved' : ''}${signClass(question)}`} aria-live="polite">
                    <SpelSign question={question} feedback={feedback} flash={flash} choices={options} views={views} answerClassName="bal-sign-answer" />
                </p>
                {ribbon && (
                    <p key={ribbon.at} className="bal-ribbon" role="status">
                        <Star weight="fill" aria-hidden /> {ribbon.count} op een rij!
                    </p>
                )}
            </div>
        </div>
    );
}
