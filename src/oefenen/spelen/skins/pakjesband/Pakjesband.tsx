import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import type { SkinProps } from '../types';
import { SpelChoiceFace, SpelSign } from '../../SpelVisual';
import { choiceLabel, faceKind, pictureClass, signClass } from '../../spelChoice';
import { beltDone, beltStep, isOff, parcelAt, runStart } from './belt';
import './pakjesband.css';

// Pakjesband: on a rooftop at dusk four wrapped parcels ride a belt from left to right, each with an answer.
// Tap (or 1–4) the right one and it hops off and slides down the chimney (whoomp); a wrong one bounces off the
// belt. A parcel falling off the end is a miss (onMiss), then the next sum. One rAF loop
// moves the belt (a transform per parcel, track measured on resize); the belt stands still outside play.
// Under reduced motion the parcels stand still and there is no deadline.

const STARS: readonly [number, number, number][] = [[6, 8, 1], [18, 22, .7], [31, 6, .8], [72, 9, .9], [86, 24, .7], [93, 6, 1], [48, 18, .6]];

function StarArt() {
    return (
        <svg className="pk-star-art" viewBox="0 0 20 20" aria-hidden>
            <path d="M10 1 L12.6 7 L19 7.6 L14 11.8 L15.6 18.4 L10 14.8 L4.4 18.4 L6 11.8 L1 7.6 L7.4 7 Z" />
        </svg>
    );
}

function ParcelArt() {
    return (
        <svg className="pk-art" viewBox="0 0 100 100" aria-hidden>
            <path className="pk-bow" d="M50 22 C 30 2, 14 14, 26 24 C 32 28, 44 26, 50 22 C 56 26, 68 28, 74 24 C 86 14, 70 2, 50 22 Z" />
            <rect className="pk-box" x="6" y="22" width="88" height="74" rx="8" />
            <rect className="pk-ribbon" x="42" y="22" width="16" height="74" />
            <path className="pk-box-line" d="M6 22 L94 22" />
        </svg>
    );
}

// A plain mitre-shaped vane on a pole with the four winds: only the shape, no figure.
function Weathervane() {
    return (
        <svg className="pk-vane" viewBox="0 0 60 120" aria-hidden>
            <path className="pk-iron" d="M30 118 L30 38" />
            <path className="pk-iron" d="M12 78 L48 78" />
            <circle className="pk-gold" cx="30" cy="78" r="4" />
            <path className="pk-gold" d="M16 46 L16 22 Q16 8 30 2 Q44 8 44 22 L44 46 Z" />
            <path className="pk-vane-line" d="M16 34 L44 34 M30 46 L30 14" />
        </svg>
    );
}

// A horse silhouette on the roof edge, head up, one hoof lifted.
function Horse() {
    return (
        <svg className="pk-horse" viewBox="0 0 120 90" aria-hidden>
            <path d="M14 40 Q4 44 6 62 Q10 54 16 50 Z" />
            <ellipse cx="52" cy="44" rx="38" ry="17" />
            <path d="M78 36 L92 8 Q96 2 102 6 L116 18 Q119 24 113 26 L100 24 L92 44 Z" />
            <path d="M96 6 L98 -2 L102 5 Z" />
            <rect x="22" y="50" width="8" height="38" rx="3" />
            <rect x="34" y="52" width="8" height="36" rx="3" />
            <rect x="66" y="52" width="8" height="36" rx="3" />
            <path d="M78 50 L86 50 L92 68 L86 72 Z" />
        </svg>
    );
}

export default function Pakjesband({ question, choices, views, phase, feedback, onAnswer, onMiss, reducedMotion }: SkinProps) {
    const [picked, setPicked] = useState<{ key: string; index: number; dx: number; dy: number } | null>(null);
    const options = choices ?? [];
    const pickedNow = picked && question && picked.key === question.key ? picked : null;
    const answerIdx = feedback ? options.indexOf(feedback.expected) : -1;
    const missed = !!feedback && feedback.given === '';

    const field = useRef<HTMLDivElement>(null);
    const mouth = useRef<HTMLSpanElement>(null);
    const parcels = useRef<(HTMLDivElement | null)[]>([]);
    const track = useRef(0);
    const run = useRef(runStart());
    const live = useRef({ phase, reducedMotion, onMiss, key: question?.key, missedKey: undefined as string | undefined });
    useLayoutEffect(() => { live.current = { ...live.current, phase, reducedMotion, onMiss, key: question?.key }; });

    const placeAll = () => {
        const still = live.current.reducedMotion;
        parcels.current.forEach((el, i) => {
            if (!el) return;
            const r = still ? -1 : run.current;
            const at = Math.min(parcelAt(i, r), 1.06);
            el.style.transform = `translate3d(${(at * track.current).toFixed(1)}px, 0, 0)`;
            el.classList.toggle('is-off', !still && isOff(i, r));
            // Its spot on the belt (tests, debugging).
            el.dataset.at = at.toFixed(3);
        });
    };
    const placeRef = useRef(placeAll);
    useLayoutEffect(() => { placeRef.current = placeAll; });

    // A new sum: the belt starts again from the left with four fresh parcels.
    useLayoutEffect(() => {
        run.current = runStart();
        placeRef.current();
    }, [question?.key]);

    const hasQuestion = !!question;
    useLayoutEffect(() => {
        const el = field.current;
        if (!el || !hasQuestion) return;
        const remeasure = () => {
            const parcel = el.querySelector<HTMLElement>('.pk-slot');
            track.current = Math.max(0, el.clientWidth - (parcel?.offsetWidth ?? 0));
            placeRef.current();
        };
        remeasure();
        if (typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver(remeasure);
        ro.observe(el);
        return () => ro.disconnect();
    }, [hasQuestion]);
    // After every render: a className change must not drop the loop's is-off, and reduced motion places still.
    useLayoutEffect(() => { placeRef.current(); });

    useEffect(() => {
        let raf = 0;
        let last: number | null = null;
        const frame = (t: number) => {
            raf = requestAnimationFrame(frame);
            // A long gap (a hidden tab) never jumps the belt.
            const dt = last === null ? 0 : Math.min(0.1, Math.max(0, (t - last) / 1000));
            last = t;
            const st = live.current;
            // Only while the sum waits: still during a flash, under "Hoe los ik dit op?" and under reduced motion.
            if (st.phase !== 'play' || st.reducedMotion) return;
            run.current = beltStep(run.current, dt);
            placeRef.current();
            if (beltDone(run.current) && st.missedKey !== st.key) {
                // Once per sum; the session's wrong flash follows.
                live.current = { ...st, missedKey: st.key, phase: 'wrong' };
                st.onMiss();
            }
        };
        raf = requestAnimationFrame(frame);
        return () => cancelAnimationFrame(raf);
    }, []);

    const pick = (i: number) => {
        if (phase !== 'play' || !question || options[i] === undefined) return;
        // Where the chimney is from this parcel, for the slide down.
        const p = parcels.current[i]?.getBoundingClientRect();
        const m = mouth.current?.getBoundingClientRect();
        const dx = p && m ? m.left + m.width / 2 - (p.left + p.width / 2) : 0;
        const dy = p && m ? m.top - p.bottom : 0;
        setPicked({ key: question.key, index: i, dx, dy });
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

    if (!question) return <div className="pk-root" />;
    const flash = phase === 'right' || phase === 'wrong';
    const right = phase === 'right' && pickedNow;

    return (
        <div className={`pk-root${views ? ' has-pictures' : ''}${pictureClass(views)}${phase === 'play' && !reducedMotion ? ' is-moving' : ''}${phase === 'help' ? ' is-paused' : ''}${reducedMotion ? ' is-still' : ''}`}>
            <span className="pk-moon" aria-hidden />
            {STARS.map(([x, y, s], k) => (
                <span key={k} className="pk-star" style={{ left: `${x}%`, top: `${y}%`, '--s': s, '--k': k } as CSSProperties} aria-hidden><StarArt /></span>
            ))}

            <div className="pk-top">
                <p className={`pk-sign kiosk-math${flash ? ' is-solved' : ''}${signClass(question)}`} aria-live="polite">
                    <SpelSign question={question} feedback={feedback} flash={flash} choices={options} views={views} answerClassName="pk-sign-answer" />
                </p>
            </div>

            <div className="pk-house" aria-hidden>
                <svg className="pk-roof" viewBox="0 0 400 100" preserveAspectRatio="none">
                    <path className="pk-roof-tiles" d="M34 0 L366 0 L400 100 L0 100 Z" />
                    <path className="pk-roof-line" d="M27 22 L373 22 M20 44 L380 44 M13 66 L387 66 M6 88 L394 88" />
                    <path className="pk-ridge" d="M30 0 L370 0" />
                </svg>
                <Weathervane />
                <Horse />
                {[10, 47, 88].map(x => <span key={x} className="pk-post" style={{ left: `${x}%` }} />)}
                <div className="pk-chimney-back"><span ref={mouth} className="pk-mouth" /></div>
                {right && !reducedMotion && <span className="pk-puff"><span /><span /><span /></span>}
            </div>
            {/* The chimney's front sits over the belt layer: a parcel sliding down disappears behind it. */}
            <div className="pk-chimney" aria-hidden />

            <div className="pk-line">
                <div ref={field} className="pk-field" role="group" aria-label="Kies het antwoord">
                    {options.map((c, i) => {
                        const state = pickedNow?.index === i ? (phase === 'right' ? ' is-down' : phase === 'wrong' ? ' is-bounce' : '')
                            : flash && i === answerIdx && !feedback?.correct ? (missed ? ' is-missed' : ' is-answer')
                            : flash ? ' is-rest' : '';
                        return (
                            <div key={`${question.key}-${i}`} ref={el => { parcels.current[i] = el; }} className={`pk-slot${state}`}>
                                <div className="pk-hop" style={{ '--fill': `var(--spel-fill-${i})`, '--dx': `${pickedNow?.index === i ? pickedNow.dx : 0}px`, '--dy': `${pickedNow?.index === i ? pickedNow.dy : 0}px` } as CSSProperties}>
                                    <button type="button" className="pk-parcel" disabled={phase !== 'play'} aria-label={choiceLabel(c, views?.[i])}
                                        // A moving target: the tap counts where the finger lands.
                                        onPointerDown={e => { if (e.button === 0) pick(i); }}
                                        onClick={() => pick(i)}>
                                        <ParcelArt />
                                        <span className={`pk-num kiosk-math is-${faceKind(views?.[i])}`} aria-hidden><SpelChoiceFace value={c} view={views?.[i]} /></span>
                                        <span className="pk-key" aria-hidden>{i + 1}</span>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className={`pk-belt${phase === 'play' && !reducedMotion ? ' is-running' : ''}`} aria-hidden>
                    {Array.from({ length: 9 }, (_, r) => <span key={r} className="pk-roller" />)}
                </div>
            </div>
        </div>
    );
}
