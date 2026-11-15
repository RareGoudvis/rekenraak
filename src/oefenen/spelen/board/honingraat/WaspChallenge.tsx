import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { mulberry32 } from '../../distractors';
import type { SpelQuestion } from '../../spelQuestion';
import type { SkinProps } from '../../skins/types';
import { Burst } from '../../scene';
import { SpelLine, SpelText } from '../../SpelVisual';
import { Bee, Wasp } from './art';
import { HEX } from './view';
import { WASP, WASP_MS, waspChoices, waspVerdict, type WaspVerdict } from './hive';

// Moeilijk: a wasp comes for the nest. Five sums of the boards already played, each with three honey drops;
// a right drop sends a bee at the wasp, a wrong one lets it come closer. Four right chases it off, a second
// wrong one and it claims the nest (the friendly early end). The session never sees these sums: they were
// asked (or shown) on the boards before and are logged there; this is the skin's own little fight.


interface Props extends Pick<SkinProps, 'reducedMotion' | 'sound'> {
    sums: readonly SpelQuestion[];
    // The other sums played, for the drops' other answers.
    pool: readonly SpelQuestion[];
    seed: number;
    paused: boolean;
    onDone(verdict: WaspVerdict): void;
}

export default function WaspChallenge({ sums, pool, seed, reducedMotion, sound, paused, onDone }: Props) {
    const choices = useMemo(() => {
        const rng = mulberry32(seed);
        return sums.map(q => waspChoices(q, pool.filter(o => o.key !== q.key), rng));
    }, [sums, pool, seed]);
    const [at, setAt] = useState(0);
    const [results, setResults] = useState<boolean[]>([]);
    const [picked, setPicked] = useState<string | null>(null);
    const verdict = waspVerdict(results);
    const settled = picked === null && verdict;
    const voice = useRef(sound);
    useEffect(() => { voice.current = sound; });
    const done = useRef(onDone);
    useEffect(() => { done.current = onDone; });
    useEffect(() => { voice.current('launch'); }, []);

    // After a pick: the next sum, or the verdict.
    useEffect(() => {
        if (picked === null || paused) return;
        const right = results.at(-1);
        const id = window.setTimeout(() => {
            setPicked(null);
            if (!waspVerdict(results)) setAt(a => a + 1);
        }, right ? WASP_MS.right : WASP_MS.wrong);
        return () => window.clearTimeout(id);
    }, [picked, results, paused]);
    useEffect(() => {
        if (!settled || paused) return;
        if (settled === 'chased') voice.current('win');
        const id = window.setTimeout(() => done.current(settled), settled === 'chased' ? WASP_MS.chased : WASP_MS.claimed);
        return () => window.clearTimeout(id);
    }, [settled, paused]);

    const q = sums[Math.min(at, sums.length - 1)];
    const rightValue = choices[Math.min(at, sums.length - 1)]?.find(c => c.value === (q.same ?? q.answer))?.value;
    const tap = (value: string) => {
        if (picked !== null || verdict) return;
        const ok = value === rightValue;
        setPicked(value);
        setResults(r => [...r, ok]);
        voice.current(ok ? 'hit' : 'lost');
    };
    const wrong = results.filter(r => !r).length;
    const right = results.length - wrong;
    const mood = settled === 'chased' ? 'dizzy' : settled === 'claimed' || picked !== null && picked !== rightValue ? 'grin' : 'cheeky';
    return (
        <div className={`hx-wasp${settled ? ` is-${settled}` : ''}${reducedMotion ? ' is-still' : ''}`} style={{ '--near': wrong } as CSSProperties}>
            <div className="hx-wasp-zone" aria-hidden>
                <span className="hx-wasp-fly"><span className="hx-wasp-turn"><Wasp mood={mood} /></span></span>
                {/* Each right drop: a bee darts at the wasp. */}
                {right > 0 && !settled && <span key={`dart-${right}`} className="hx-dart"><Bee mood="busy" /></span>}
                {settled === 'chased' && <Burst kind="sparkle" x="50%" y="45%" spread={110} count={10} seed={seed} reducedMotion={reducedMotion} />}
            </div>
            <section className="hx-wasp-card" aria-label="Een wesp!">
                {settled ? (
                    <p className="hx-wasp-title" aria-live="polite">{settled === 'chased' ? 'Weggejaagd!' : 'De wesp pakt het nest!'}</p>
                ) : (
                    <>
                        <p className="hx-wasp-title" aria-live="polite">Een wesp! Jaag hem weg.</p>
                        <p className="hx-wasp-rule">{WASP.need} van de {WASP.sums} juist</p>
                        <p className="hx-wasp-sum kiosk-math" key={q.key}><SpelLine text={q.text} /></p>
                        <div className="hx-drops" role="group" aria-label="Kies het antwoord">
                            {choices[at]?.map(c => {
                                const state = picked === null ? '' : c.value === rightValue ? ' is-right' : c.value === picked ? ' is-wrong' : ' is-dim';
                                return (
                                    <button key={`${q.key}-${c.value}`} type="button" className={`hx-drop-btn${state}`} onClick={() => tap(c.value)} disabled={picked !== null} aria-label={c.text}>
                                        <svg viewBox="0 0 80 100" aria-hidden><path className="hx-drop-art" d="M40 4 C52 26 72 44 72 64 C72 84 58 96 40 96 C22 96 8 84 8 64 C8 44 28 26 40 4 Z" /><ellipse className="hx-drop-shine" cx="27" cy="58" rx="6" ry="10" transform="rotate(20 27 58)" /></svg>
                                        <span className="kiosk-math" aria-hidden><SpelText text={c.text} /></span>
                                    </button>
                                );
                            })}
                        </div>
                    </>
                )}
                <span className="hx-wasp-pips" role="img" aria-label={`${right} juist, ${wrong} fout`}>
                    {Array.from({ length: WASP.sums }, (_, i) => (
                        <svg key={i} className={`hx-pip${results[i] === true ? ' is-on' : results[i] === false ? ' is-miss' : ''}`} viewBox="0 0 100 116" aria-hidden><polygon points={HEX} /></svg>
                    ))}
                </span>
            </section>
            <div className="hx-guards" aria-hidden>
                {[0, 1, 2].map(i => (
                    <span key={i} className="hx-guard" style={{ '--g': i } as CSSProperties}>
                        <span className="hx-guard-turn"><Bee mood={settled === 'chased' ? 'happy' : settled === 'claimed' ? 'worried' : 'busy'} /></span>
                    </span>
                ))}
            </div>
        </div>
    );
}
