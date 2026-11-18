import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { mulberry32 } from '../../distractors';
import type { SpelQuestion } from '../../spelQuestion';
import type { SkinProps } from '../../skins/types';
import { Burst } from '../../scene';
import { SpelLine, SpelText } from '../../SpelVisual';
import { Bee, Wasp } from './art';
import { HEX } from './view';
import { WASP_MS, waspChoices, waspsGone, waspVerdict, type WaspRule, type WaspVerdict } from './hive';

// After a meadow a wasp comes for the nest (Normaal and up). Three sums of the boards already played, each with
// three honey drops; a right drop sends a bee at the wasp, a wrong one lets it come closer. Enough right (1, 2 or
// all 3: hive.ts waspRule) chases it off, one wrong too many and it claims the nest (the friendly early end).
// Onmogelijk brings more wasps per battle (3 sums each, every one right; a wasp flies off after its three). The
// session never sees these sums: they were asked (or shown) on the boards before and are logged there; this is the
// skin's own little fight.


interface Props extends Pick<SkinProps, 'sound'> {
    sums: readonly SpelQuestion[];
    // How many wasps, sums and right answers this battle has (sums = sums.length).
    rule: WaspRule;
    // The other sums played, for the drops' other answers.
    pool: readonly SpelQuestion[];
    seed: number;
    paused: boolean;
    onDone(verdict: WaspVerdict): void;
}

export default function WaspChallenge({ sums, rule, pool, seed, sound, paused, onDone }: Props) {
    const choices = useMemo(() => {
        const rng = mulberry32(seed);
        return sums.map(q => waspChoices(q, pool.filter(o => o.key !== q.key), rng));
    }, [sums, pool, seed]);
    const [at, setAt] = useState(0);
    const [results, setResults] = useState<boolean[]>([]);
    const [picked, setPicked] = useState<string | null>(null);
    const verdict = waspVerdict(results, rule);
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
            if (!waspVerdict(results, rule)) setAt(a => a + 1);
        }, right ? WASP_MS.right : WASP_MS.wrong);
        return () => window.clearTimeout(id);
    }, [picked, results, paused, rule]);
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
    const gone = waspsGone(results, rule);
    const many = rule.wasps > 1;
    return (
        <div className={`hx-wasp${settled ? ` is-${settled}` : ''}${many ? ' is-swarm' : ''}`} style={{ '--near': wrong, '--wasps': rule.wasps } as CSSProperties}>
            <div className="hx-wasp-zone" aria-hidden>
                {Array.from({ length: rule.wasps }, (_, w) => (
                    // A swarm: the wasp whose three were all right flies off dizzy, the others stay.
                    <span key={w} className={`hx-wasp-fly${w < gone && !settled ? ' is-gone' : ''}`} style={{ '--w': w } as CSSProperties}>
                        <span className="hx-wasp-turn"><Wasp mood={w < gone ? 'dizzy' : mood} /></span>
                    </span>
                ))}
                {/* Each right drop: a bee darts at the wasp. */}
                {right > 0 && !settled && <span key={`dart-${right}`} className="hx-dart"><Bee mood="busy" /></span>}
                {settled === 'chased' && <Burst kind="sparkle" x="50%" y="45%" spread={110} count={10} seed={seed} />}
            </div>
            <section className="hx-wasp-card" aria-label={many ? `${rule.wasps} wespen!` : 'Een wesp!'}>
                {settled ? (
                    <p className="hx-wasp-title" aria-live="polite">{settled === 'chased' ? 'Weggejaagd!' : many ? 'De wespen pakken het nest!' : 'De wesp pakt het nest!'}</p>
                ) : (
                    <>
                        <p className="hx-wasp-title" aria-live="polite">{many ? `${rule.wasps} wespen! Jaag ze weg.` : 'Een wesp! Jaag hem weg.'}</p>
                        <p className="hx-wasp-rule">{rule.need === rule.sums ? `Alle ${rule.sums} juist` : `${rule.need} van de ${rule.sums} juist`}</p>
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
                    {Array.from({ length: rule.sums }, (_, i) => (
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
