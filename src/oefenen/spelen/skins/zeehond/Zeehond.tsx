import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type Ref } from 'react';
import type { SkinProps } from '../types';
import { SpelChoiceFace, SpelSign } from '../../SpelVisual';
import { choiceLabel, faceKind, signClass } from '../../spelChoice';
import { fishLeft, flightOf, type Flight } from './feed';
import './zeehond.css';

// Zeehondjes voeren: an icy sea with four seals on ice floes, each by a sign with an answer. Tap (or 1–4) the
// seal with the answer: a fish flies from the bucket in a soft arc into its mouth and it claps its flippers.
// A wrong seal shakes its head and looks away (no red); the right one waves its sign. Untimed, round of 15.
// The bucket on the pupil's side empties fish by fish. Under reduced motion the fish simply appears at the seal.

const KEYS = ['1', '2', '3', '4'];
// A phrase reads in Nunito, even a short one ("8 uur"); times ("08:15") and numbers stay in the math font.
const boardKind = (face: Parameters<typeof faceKind>[0]) => {
    const k = faceKind(face);
    return k === 'short' && /[a-z]/i.test(face?.text ?? '') ? 'words' : k;
};

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

function SealArt() {
    return (
        <svg className="zh-art" viewBox="0 0 120 104" aria-hidden>
            <path className="zh-tail" d="M30 96 L10 102 L16 90 Z M90 96 L110 102 L104 90 Z" />
            <path className="zh-body" d="M14 100 C8 72 30 50 60 50 C90 50 112 72 106 100 Z" />
            <ellipse className="zh-belly" cx="60" cy="84" rx="28" ry="15" />
            <g className="zh-head">
                <circle className="zh-skull" cx="60" cy="36" r="28" />
                <g className="zh-face">
                    <circle className="zh-cheek" cx="40" cy="44" r="5" />
                    <circle className="zh-cheek" cx="80" cy="44" r="5" />
                    <circle className="zh-eye" cx="48" cy="31" r="5" />
                    <circle className="zh-eye" cx="72" cy="31" r="5" />
                    <circle className="zh-glint" cx="50" cy="29" r="1.8" />
                    <circle className="zh-glint" cx="74" cy="29" r="1.8" />
                    <ellipse className="zh-muzzle" cx="54" cy="44" rx="8" ry="6" />
                    <ellipse className="zh-muzzle" cx="66" cy="44" rx="8" ry="6" />
                    <ellipse className="zh-nose" cx="60" cy="39.5" rx="5" ry="3.5" />
                    <path className="zh-whisker" d="M46 44 L36 42 M46 47 L37 49 M74 44 L84 42 M74 47 L83 49" />
                    <path className="zh-mouth" d="M55 51 Q60 55 65 51" />
                </g>
            </g>
            <path className="zh-flip zh-flip-l" d="M38 64 C26 70 18 80 20 88 C28 86 38 78 44 70 Z" />
            <path className="zh-flip zh-flip-r" d="M82 64 C94 70 102 80 100 88 C92 86 82 78 76 70 Z" />
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

function Bucket({ left, total, fishRef, reducedMotion }: { left: number; total: number; fishRef: Ref<HTMLSpanElement>; reducedMotion: boolean }) {
    // Up to five fish stick out, fewer as the bucket empties; the last fish still shows one.
    const tails = left <= 0 ? 0 : Math.max(1, Math.ceil((left / Math.max(1, total)) * 5));
    return (
        <div className={`zh-bucket${reducedMotion ? ' is-still' : ''}`} role="img" aria-label={`Nog ${left} ${left === 1 ? 'vis' : 'vissen'} in de emmer`}>
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

export default function Zeehond({ question, choices, views, phase, feedback, onAnswer, progress, reducedMotion }: SkinProps) {
    // The pick, with the fish's throw measured at the tap (shown only if the seal was right).
    const [picked, setPicked] = useState<{ key: string; index: number; flight: Flight | null } | null>(null);
    const options = choices ?? [];
    const pickedNow = picked && question && picked.key === question.key ? picked : null;
    const pickedIdx = pickedNow ? pickedNow.index : null;
    const answerIdx = feedback ? options.indexOf(feedback.expected) : -1;

    const root = useRef<HTMLDivElement>(null);
    const bucketOut = useRef<HTMLSpanElement>(null);
    const mouths = useRef<(HTMLSpanElement | null)[]>([]);

    const pick = (i: number) => {
        if (phase !== 'play' || !question || options[i] === undefined) return;
        const box = root.current?.getBoundingClientRect();
        const from = bucketOut.current?.getBoundingClientRect();
        const to = mouths.current[i]?.getBoundingClientRect();
        setPicked({ key: question.key, index: i, flight: box && from && to && !reducedMotion ? flightOf(question.key, box, from, to) : null });
        onAnswer(options[i]);
    };
    const pickRef = useRef(pick);
    useLayoutEffect(() => { pickRef.current = pick; });

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
            const i = KEYS.indexOf(e.key);
            if (i >= 0) { e.preventDefault(); pickRef.current(i); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    if (!question) return <div className="zh-root" />;
    const flash = phase === 'right' || phase === 'wrong';
    const left = fishLeft(progress);
    const flight = phase === 'right' ? pickedNow?.flight : null;

    return (
        <div ref={root} className={`zh-root${views ? ' has-pictures' : ''}${phase === 'help' ? ' is-paused' : ''}${reducedMotion ? ' is-still' : ''}`}>
            <div className="zh-sea" aria-hidden>
                <svg className="zh-berg" viewBox="0 0 200 60" preserveAspectRatio="none"><path d="M0 60 L30 22 L46 34 L70 8 L96 40 L110 30 L134 60 Z" /></svg>
                <svg className="zh-berg is-far" viewBox="0 0 200 60" preserveAspectRatio="none"><path d="M40 60 L80 18 L100 34 L126 14 L170 60 Z" /></svg>
            </div>
            <div className="zh-top">
                <p className={`zh-sign kiosk-math${flash ? ' is-solved' : ''}${signClass(question)}`} aria-live="polite">
                    <SpelSign question={question} feedback={feedback} flash={flash} choices={options} views={views} answerClassName="zh-sign-answer" />
                </p>
            </div>
            <div className="zh-pod" role="group" aria-label="Kies het antwoord">
                {options.map((c, i) => {
                    const face = views?.[i];
                    const mine = pickedIdx === i;
                    const state = mine && phase === 'right' ? ' is-fed'
                        : mine && phase === 'wrong' ? ' is-nope'
                        : flash && i === answerIdx && feedback && !feedback.correct ? ' is-answer'
                        : flash ? ' is-rest' : '';
                    return (
                        <div key={`${question.key}-${i}`} className={`zh-spot${state}`} style={{ '--i': i, '--fill': `var(--zh-seal-${i % 4})` } as CSSProperties}>
                            <div className="zh-bob">
                                <button type="button" className="zh-seal" disabled={phase !== 'play'} aria-label={choiceLabel(c, face)} onClick={() => pick(i)}>
                                    <span className="zh-board-wrap">
                                        <span className={`zh-board kiosk-math is-${boardKind(face)}`} aria-hidden><SpelChoiceFace value={c} view={face} /></span>
                                        <span className="zh-pole" aria-hidden />
                                    </span>
                                    <span className="zh-body-wrap">
                                        <SealArt />
                                        <span className="zh-mouth-at" ref={el => { mouths.current[i] = el; }} aria-hidden />
                                        {mine && phase === 'right' && reducedMotion && <FishArt className="zh-fed-fish" />}
                                        {mine && phase === 'right' && !reducedMotion && (
                                            <span className="zh-bubbles" aria-hidden>{[0, 1, 2].map(b => <span key={b} className="zh-bubble" style={{ '--b': b } as CSSProperties} />)}</span>
                                        )}
                                    </span>
                                    <span className="zh-key" aria-hidden>{i + 1}</span>
                                </button>
                                <Floe />
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="zh-shore">
                <Bucket left={left} total={progress.total ?? left} fishRef={bucketOut} reducedMotion={reducedMotion} />
            </div>
            {flight && (
                <span className="zh-fly" style={{ left: flight.x, top: flight.y, '--dx': `${flight.dx}px`, '--dy': `${flight.dy}px`, '--arc': `${flight.arc}px`, '--face': flight.dx > 0 ? -1 : 1 } as CSSProperties} aria-hidden>
                    <span className="zh-fly-y"><FishArt /></span>
                </span>
            )}
        </div>
    );
}
