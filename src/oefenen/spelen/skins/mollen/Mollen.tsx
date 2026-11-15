import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import type { SkinProps } from '../types';
import { SpelChoiceFace, SpelSign } from '../../SpelVisual';
import { choiceLabel, faceChars, faceKind, pictureClass, signClass, viewFor } from '../../spelChoice';
import { MOLE, molePace, newField, stepField, viewOf, type MoleField } from './moles';
import './mollen.css';

// Mollen meppen: six holes in a garden; moles pop up for a moment, each with a number. Tap (or 1–6) the
// mole with the answer: a squeaky toy hammer bonks it and it sees stars. A wrong mole is a wrong answer
// (the sign shows the right one) and it taunts: tongue out, a little dance, "Nana!", then it ducks. Two minutes; the moles get a little quicker with the streak. Game time
// only runs while the sum waits, so "Hoe los ik dit op?" and the flashes freeze every mole.

type HoleView = ReturnType<typeof viewOf>[number];
const KEYS = ['1', '2', '3', '4', '5', '6'];
const sameView = (a: readonly HoleView[], b: readonly HoleView[]) =>
    a.length === b.length && a.every((v, i) => v?.id === b[i]?.id && v?.up === b[i]?.up);

function MoleArt() {
    return (
        <svg className="ml-art" viewBox="0 0 100 110" aria-hidden>
            <path className="ml-fur" d="M8 110 L8 52 Q8 6 50 6 Q92 6 92 52 L92 110 Z" />
            <ellipse className="ml-belly" cx="50" cy="88" rx="30" ry="26" />
            <circle className="ml-eye" cx="35" cy="38" r="6" />
            <circle className="ml-eye" cx="65" cy="38" r="6" />
            <circle className="ml-glint" cx="37" cy="36" r="2" />
            <circle className="ml-glint" cx="67" cy="36" r="2" />
            <ellipse className="ml-snout" cx="50" cy="54" rx="16" ry="11" />
            <ellipse className="ml-nose" cx="50" cy="49" rx="7" ry="5" />
            <path className="ml-tooth" d="M45 63 L45 70 L50 70 L50 63 M50 63 L50 70 L55 70 L55 63" />
            {/* Shown only while the mole taunts (is-nope): a cheeky tongue out of the corner of the mouth, above the number. */}
            <path className="ml-tongue" d="M50 60 Q66 55 76 61 Q82 69 75 73 Q66 75 52 67 Z M62 61 L67 68" />
            <ellipse className="ml-paw" cx="20" cy="104" rx="12" ry="7" />
            <ellipse className="ml-paw" cx="80" cy="104" rx="12" ry="7" />
        </svg>
    );
}

// A squeaky toy hammer: a soft red head with yellow bands.
function Hammer() {
    return (
        <svg className="ml-hammer" viewBox="0 0 120 80" aria-hidden>
            <rect className="ml-handle" x="54" y="30" width="62" height="12" rx="6" />
            <rect className="ml-head" x="6" y="8" width="54" height="56" rx="14" />
            <path className="ml-band" d="M20 8 L20 64 M46 8 L46 64" />
        </svg>
    );
}

function StarBit({ i }: { i: number }) {
    return (
        <span className="ml-orbit" style={{ '--i': i } as CSSProperties}>
            <svg className="ml-star" viewBox="0 0 20 20" aria-hidden>
                <path d="M10 1 L12.6 7 L19 7.6 L14 11.8 L15.6 18.4 L10 14.8 L4.4 18.4 L6 11.8 L1 7.6 L7.4 7 Z" />
            </svg>
        </span>
    );
}

export default function Mollen({ question, choices, views, phase, feedback, onAnswer, progress, reducedMotion }: SkinProps) {
    const options = choices ?? [];
    const [view, setView] = useState<HoleView[]>(() => viewOf(newField(0), 0));
    const [picked, setPicked] = useState<{ key: string; hole: number } | null>(null);
    const pickedHole = picked && question && picked.key === question.key ? picked.hole : null;

    // Game time (ms) and the field, outside React: the loop renders only when a mole comes up or goes down.
    const gameMs = useRef(0);
    const field = useRef<MoleField>(newField(0));
    const live = useRef({ phase, streak: progress.streak, options });
    useLayoutEffect(() => { live.current = { phase, streak: progress.streak, options }; });

    // A new sum: every mole ducks, fresh ones come up with the new numbers.
    const key = question?.key;
    useLayoutEffect(() => {
        field.current = newField(gameMs.current, field.current.nextId);
        setView(viewOf(field.current, gameMs.current));
    }, [key]);

    useEffect(() => {
        let raf = 0;
        let last: number | null = null;
        const frame = (t: number) => {
            raf = requestAnimationFrame(frame);
            // A long gap (a hidden tab) never skips moles.
            const dt = last === null ? 0 : Math.min(100, Math.max(0, t - last));
            last = t;
            const st = live.current;
            if (st.phase !== 'play') return;
            gameMs.current += dt;
            field.current = stepField(field.current, gameMs.current, st.options, Math.random, molePace(st.streak));
            const next = viewOf(field.current, gameMs.current);
            setView(v => (sameView(v, next) ? v : next));
        };
        raf = requestAnimationFrame(frame);
        return () => cancelAnimationFrame(raf);
    }, []);

    const tap = (hole: number) => {
        const m = view[hole];
        if (phase !== 'play' || !question || !m?.up) return;
        setPicked({ key: question.key, hole });
        onAnswer(m.value);
    };
    const tapRef = useRef(tap);
    useLayoutEffect(() => { tapRef.current = tap; });

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
            const i = KEYS.indexOf(e.key);
            if (i >= 0) { e.preventDefault(); tapRef.current(i); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    if (!question) return <div className="ml-root" />;
    const flash = phase === 'right' || phase === 'wrong';

    return (
        <div className={`ml-root${views ? ' has-pictures' : ''}${pictureClass(views)}${phase === 'help' ? ' is-paused' : ''}${reducedMotion ? ' is-still' : ''}`} style={{ '--ml-pace': molePace(progress.streak) } as CSSProperties}>
            <div className="ml-grass" aria-hidden />
            <div className="ml-top">
                <p className={`ml-sign kiosk-math${flash ? ' is-solved' : ''}${signClass(question)}`} aria-live="polite">
                    <SpelSign question={question} feedback={feedback} flash={flash} choices={options} views={views} answerClassName="ml-sign-answer" />
                </p>
            </div>
            <div className="ml-field" role="group" aria-label="Kies het antwoord">
                {Array.from({ length: MOLE.holes }, (_, h) => {
                    const m = view[h];
                    const up = !!m?.up;
                    const face = m ? viewFor(options, views, m.value) : undefined;
                    const mine = pickedHole === h;
                    const state = mine && phase === 'right' ? ' is-bonked'
                        : mine && phase === 'wrong' ? ' is-nope'
                        : flash && up && feedback && !feedback.correct && m?.value === feedback.expected ? ' is-answer'
                        : '';
                    return (
                        <div key={h} className={`ml-hole${up ? ' is-up' : ''}${state}`} data-mole={up ? m?.value : undefined}>
                            <span className="ml-pit" aria-hidden />
                            <div className="ml-clip">
                                <button type="button" className="ml-mole" disabled={phase !== 'play' || !up} tabIndex={up ? 0 : -1} aria-hidden={!up}
                                    aria-label={m ? choiceLabel(m.value, face) : undefined}
                                    // A moving target: the tap counts where the finger lands.
                                    onPointerDown={e => { if (e.button === 0) tap(h); }}
                                    onClick={() => tap(h)}>
                                    <MoleArt />
                                    {m && <span className={`ml-num kiosk-math is-${faceKind(face)}`} style={{ '--face-chars': faceChars(face) } as CSSProperties} aria-hidden><SpelChoiceFace value={m.value} view={face} /></span>}
                                </button>
                            </div>
                            <span className="ml-rim" aria-hidden />
                            {state === ' is-nope' && <span className="ml-bubble" aria-hidden>Nana!</span>}
                            {mine && phase === 'right' && !reducedMotion && (
                                <>
                                    <Hammer />
                                    <span className="ml-dizzy" aria-hidden>{[0, 1, 2].map(s => <StarBit key={s} i={s} />)}</span>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
