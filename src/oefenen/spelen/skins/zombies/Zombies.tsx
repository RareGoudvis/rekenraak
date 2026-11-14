import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { formatMathNumber } from '../../../../services/math/formatters';
import SpelKeypad from '../../SpelKeypad';
import type { SkinProps } from '../types';
import { ZOMBIE, joinAt, stepCloser, walk, zombieSpeed } from './walk';
import './zombies.css';

// Zombies: silly round zombies shuffle in from the right, the front one holding the sum on a sign. A right
// answer flops it over in a puff of smoke; a wrong one brings it a step closer. At the door it only bumps
// (a boing) and that sum counts as a mistake: no game over, the round ends on the clock.
// One small rAF loop moves them (positions live outside React); everything else is CSS.

type Mood = 'walk' | 'flop' | 'boing';
interface Zombie { id: number; mood: Mood }

const PUFFS = 6;
const START: Zombie[] = Array.from({ length: ZOMBIE.count }, (_, id) => ({ id, mood: 'walk' }));

// Moves one zombie's lane; data-x is its spot on the street (tests, debugging).
function place(el: HTMLDivElement | undefined, x: number | undefined) {
    if (!el || x === undefined) return;
    el.style.transform = `translateX(${x}%)`;
    el.dataset.x = x.toFixed(1);
}

function ZombieArt() {
    return (
        <svg className="zb-art" viewBox="0 0 100 130" aria-hidden>
            <g className="zb-leg zb-leg-a">
                <rect className="zb-pants" x="33" y="96" width="14" height="26" rx="6" />
                <ellipse className="zb-shoe" cx="36" cy="124" rx="11" ry="5" />
            </g>
            <g className="zb-leg zb-leg-b">
                <rect className="zb-pants" x="54" y="96" width="14" height="26" rx="6" />
                <ellipse className="zb-shoe" cx="57" cy="124" rx="11" ry="5" />
            </g>
            <ellipse className="zb-skin" cx="50" cy="76" rx="27" ry="27" />
            <path className="zb-shirt" d="M23 78 Q50 62 77 78 L78 94 L71 101 L64 94 L57 102 L50 94 L43 102 L36 94 L29 101 L22 94 Z" />
            <circle className="zb-skin" cx="50" cy="38" r="27" />
            <path className="zb-hair" d="M42 13 Q47 3 53 11 Q57 4 62 12" />
            <circle className="zb-eye" cx="38" cy="35" r="10" />
            <circle className="zb-eye" cx="61" cy="32" r="8" />
            <circle className="zb-pupil" cx="34" cy="38" r="4.5" />
            <circle className="zb-pupil" cx="63" cy="29" r="3.5" />
            <path className="zb-mouth" d="M36 53 Q48 62 61 51" />
            <rect className="zb-tooth" x="44" y="55" width="6" height="6" rx="1" />
            {/* Arms out front, the zombie way: an outline stroke under a skin stroke. */}
            <path className="zb-arm-line" d="M38 72 L6 68" />
            <path className="zb-arm-skin" d="M38 72 L6 68" />
            <path className="zb-arm-line" d="M40 84 L9 84" />
            <path className="zb-arm-skin" d="M40 84 L9 84" />
        </svg>
    );
}

function House() {
    return (
        <svg className="zb-house-art" viewBox="0 0 120 150" aria-hidden>
            <rect className="zb-chimney" x="80" y="12" width="14" height="32" />
            <path className="zb-roof" d="M4 64 L60 16 L116 64 Z" />
            <rect className="zb-wall" x="12" y="60" width="96" height="88" />
            <rect className="zb-window" x="22" y="76" width="30" height="28" rx="3" />
            <path className="zb-window-bar" d="M37 76 L37 104 M22 90 L52 90" />
            <g className="zb-door">
                <rect className="zb-door-leaf" x="66" y="90" width="32" height="58" rx="3" />
                <circle className="zb-knob" cx="73" cy="120" r="3" />
            </g>
        </svg>
    );
}

function Star({ i }: { i: number }) {
    return (
        <span className="zb-orbit" style={{ '--i': i } as CSSProperties}>
            <svg className="zb-star" viewBox="0 0 20 20" aria-hidden>
                <path d="M10 1 L12.6 7 L19 7.6 L14 11.8 L15.6 18.4 L10 14.8 L4.4 18.4 L6 11.8 L1 7.6 L7.4 7 Z" />
            </svg>
        </span>
    );
}

export default function Zombies({ question, phase, feedback, onAnswer, onMiss, progress, events, reducedMotion }: SkinProps) {
    const [line, setLine] = useState<Zombie[]>(START);
    // A new question: the zombie that flopped or bumped leaves, a newcomer joins at the back.
    const [seenKey, setSeenKey] = useState(question?.key);
    if (question && question.key !== seenKey) {
        setSeenKey(question.key);
        setLine(l => {
            const stay = l.filter(z => z.mood === 'walk');
            let id = Math.max(...l.map(z => z.id)) + 1;
            while (stay.length < ZOMBIE.count) stay.push({ id: id++, mood: 'walk' });
            return stay;
        });
    }
    const [wobble, setWobble] = useState({ n: 0, id: -1 });

    // Positions in % of the street, outside React: the loop writes them straight to the lanes.
    const xs = useRef(new Map<number, number>());
    const lanes = useRef(new Map<number, HTMLDivElement>());
    const live = useRef({ phase, streak: progress.streak, onMiss, line });
    useLayoutEffect(() => { live.current = { phase, streak: progress.streak, onMiss, line }; });

    const attach = (id: number, el: HTMLDivElement | null) => {
        if (!el) { lanes.current.delete(id); return; }
        lanes.current.set(id, el);
        if (!xs.current.has(id)) xs.current.set(id, joinAt(xs.current.size ? Math.max(...xs.current.values()) : null));
        place(el, xs.current.get(id));
    };
    // Forget the zombies that left.
    useEffect(() => {
        const ids = new Set(line.map(z => z.id));
        for (const id of [...xs.current.keys()]) if (!ids.has(id)) xs.current.delete(id);
    }, [line]);

    useEffect(() => {
        const offRight = events.on('correct', () => setLine(l => l.map((z, i) => (i === 0 ? { ...z, mood: 'flop' } : z))));
        const offWrong = events.on('wrong', ({ given }) => {
            const front = live.current.line[0];
            // An empty answer is the bump at the door: that zombie already says boing.
            if (!front || given === '') return;
            xs.current.set(front.id, stepCloser(xs.current.get(front.id) ?? ZOMBIE.start));
            place(lanes.current.get(front.id), xs.current.get(front.id));
            setWobble(w => ({ n: w.n + 1, id: front.id }));
        });
        return () => { offRight(); offWrong(); };
    }, [events]);

    useEffect(() => {
        let raf = 0;
        let last: number | null = null;
        const frame = (t: number) => {
            raf = requestAnimationFrame(frame);
            // A long gap (a hidden tab) never teleports the zombies.
            const dt = last === null ? 0 : Math.min(0.1, Math.max(0, (t - last) / 1000));
            last = t;
            const st = live.current;
            // Only while the sum waits for an answer: still during a flash and under "Hoe los ik dit op?".
            if (st.phase !== 'play') return;
            const walking = st.line.filter(z => z.mood === 'walk');
            if (!walking.length) return;
            const step = walk(walking.map(z => xs.current.get(z.id) ?? ZOMBIE.start), dt, zombieSpeed(st.streak));
            walking.forEach((z, i) => { xs.current.set(z.id, step.xs[i]); place(lanes.current.get(z.id), step.xs[i]); });
            if (step.atDoor) {
                const front = walking[0].id;
                // Stop at once; the session's wrong flash follows from onMiss.
                live.current = { ...st, phase: 'wrong', line: st.line.map(z => (z.id === front ? { ...z, mood: 'boing' } : z)) };
                setLine(l => l.map(z => (z.id === front ? { ...z, mood: 'boing' } : z)));
                st.onMiss();
            }
        };
        raf = requestAnimationFrame(frame);
        return () => cancelAnimationFrame(raf);
    }, []);

    if (!question) return <div className="zb-root" />;
    const flash = phase === 'right' || phase === 'wrong';
    const [lhs] = question.text.split('?');
    const bump = line[0]?.mood === 'boing';

    return (
        <div className={`zb-root${phase === 'play' ? ' is-moving' : ''}${phase === 'help' ? ' is-paused' : ''}${reducedMotion ? ' is-still' : ''}`}>
            <div className="zb-street">
                <span className="zb-moon" aria-hidden />
                <div className="zb-ground" aria-hidden />
                <div className={`zb-house${bump ? ' is-bumped' : ''}`}><House /></div>
                <div className="zb-track">
                    {line.map((z, i) => {
                        const front = i === 0;
                        const wob = front && z.mood === 'walk' && wobble.id === z.id ? ` is-wobble-${wobble.n % 2}` : '';
                        return (
                            <div key={z.id} ref={el => attach(z.id, el)} className="zb-lane" data-zombie={front ? 'front' : 'back'}
                                style={{ zIndex: ZOMBIE.count - i }}>
                                <div className={`zb-zombie is-${z.mood}${wob}`} style={{ '--zb-shirt': `var(--spel-fill-${z.id % 6})` } as CSSProperties}>
                                    <div className="zb-body">
                                        <p className={`zb-sign kiosk-math${front ? ' is-front' : ''}`} aria-live={front ? 'polite' : undefined} aria-hidden={!front}>
                                            {!front ? '?'
                                                : flash && feedback ? <>{lhs}<span className="zb-sign-answer">{formatMathNumber(Number(feedback.expected))}</span></>
                                                : question.text}
                                        </p>
                                        <span className="zb-pole" aria-hidden />
                                        <ZombieArt />
                                        {z.mood === 'boing' && !reducedMotion && (
                                            <span className="zb-dizzy" aria-hidden>{[0, 1, 2].map(s => <Star key={s} i={s} />)}</span>
                                        )}
                                    </div>
                                    {z.mood === 'flop' && !reducedMotion && (
                                        <span className="zb-smoke" aria-hidden>
                                            {Array.from({ length: PUFFS }, (_, p) => <span key={p} className="zb-puff" style={{ '--a': `${(360 / PUFFS) * p}deg` } as CSSProperties} />)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            <div className="zb-controls">
                <SpelKeypad questionKey={question.key} onAnswer={onAnswer} disabled={phase !== 'play'} />
            </div>
        </div>
    );
}
