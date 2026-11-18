import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { mulberry32 } from '../../distractors';
import type { SpelQuestion } from '../../spelQuestion';
import { Burst } from '../../scene';
import { SpelLine, SpelText } from '../../SpelVisual';
import { Bee, Crown, HoneyPot, Queen, type QueenMood } from './art';
import { waspChoices } from './hive';
import { BOSS, bossLeft, bossVerdict, type BossRule, type BossVerdict } from './boss';
import { playHive } from './sounds';

// The Wespenkoningin after the last board (Moeilijk and Onmogelijk, boss.ts). Her entrance, then sum after sum with
// a wasp battle's three honey drops: right = a swarm of bees stings her (her bar drops), wrong = she swoops down and
// grabs a honey pot. Her bar empty: she flees with a sore bottom; her last pot: she flies off with the honey. Like
// the wasp battles the session never sees these sums: they were asked (or shown) on the boards and are logged there.

interface Props {
    sums: readonly SpelQuestion[];
    rule: BossRule;
    // Every sum played, for the drops' other answers.
    pool: readonly SpelQuestion[];
    seed: number;
    paused: boolean;
    onDone(verdict: BossVerdict): void;
}

// Bees in one sting swarm, and honey drips in the win.
const SWARM = 5;
const DRIPS = 7;

export default function QueenFight({ sums, rule, pool, seed, paused, onDone }: Props) {
    const choices = useMemo(() => {
        const rng = mulberry32(seed);
        return sums.map(q => waspChoices(q, pool.filter(o => o.key !== q.key), rng));
    }, [sums, pool, seed]);
    const [intro, setIntro] = useState(true);
    const [at, setAt] = useState(0);
    const [results, setResults] = useState<boolean[]>([]);
    const [picked, setPicked] = useState<string | null>(null);
    const verdict = bossVerdict(results, rule);
    const settled = picked === null && verdict;
    const done = useRef(onDone);
    useEffect(() => { done.current = onDone; });

    useEffect(() => { playHive('queen'); }, []);
    useEffect(() => {
        if (!intro || paused) return;
        const id = window.setTimeout(() => setIntro(false), BOSS.ms.intro);
        return () => window.clearTimeout(id);
    }, [intro, paused]);

    // After a pick: her "au" a beat after the stings, then the next sum or the verdict.
    useEffect(() => {
        if (picked === null || paused) return;
        const right = results.at(-1);
        const ouch = right ? window.setTimeout(() => playHive('ouch'), 320) : undefined;
        const id = window.setTimeout(() => {
            setPicked(null);
            if (!bossVerdict(results, rule)) setAt(a => a + 1);
        }, right ? BOSS.ms.hit : BOSS.ms.grab);
        return () => { window.clearTimeout(id); window.clearTimeout(ouch); };
    }, [picked, results, paused, rule]);
    // The win's confetti comes in waves (one Burst is under a second).
    const [wave, setWave] = useState(0);
    useEffect(() => {
        if (settled !== 'fled' || paused || wave >= 2) return;
        const id = window.setTimeout(() => setWave(w => w + 1), 900);
        return () => window.clearTimeout(id);
    }, [settled, paused, wave]);
    useEffect(() => {
        if (!settled || paused) return;
        playHive(settled);
        const id = window.setTimeout(() => done.current(settled), BOSS.ms[settled]);
        return () => window.clearTimeout(id);
    }, [settled, paused]);

    const i = Math.min(at, sums.length - 1);
    const q = sums[i];
    const rightValue = q.same ?? q.answer;
    const tap = (value: string) => {
        if (intro || picked !== null || verdict) return;
        const ok = value === rightValue;
        setPicked(value);
        setResults(r => [...r, ok]);
        playHive(ok ? 'sting' : 'grab');
    };
    const last = picked !== null ? results.at(-1) : undefined;
    const moment = settled ? settled : last === true ? 'hit' : last === false ? 'grab' : intro ? 'intro' : 'fight';
    const mood: QueenMood = settled === 'fled' ? 'sore' : settled === 'robbed' || last === false ? 'grin' : last === true ? 'ouch' : 'cheeky';
    const { health, pots } = bossLeft(results, rule);
    const taken = rule.pots - pots;
    const hits = results.filter(Boolean).length;
    const bubble = { intro: 'Mmm, honing!', hit: 'Au!', grab: 'Hihi!', fled: 'Auwauw!', robbed: 'Dankjewel!', fight: null }[moment];
    return (
        <div className={`hx-wasp hx-boss is-${moment}`} style={{ '--taken': taken } as CSSProperties}>
            <div className="hx-q-zone">
                <div className="hx-q-bar" role="img" aria-label={`Koningin: nog ${health} van ${rule.hits}`}>
                    <span className="hx-q-bar-crown" aria-hidden><Crown /></span>
                    <span className="hx-q-bar-name">Koningin</span>
                    <span className="hx-q-segs" aria-hidden>
                        {Array.from({ length: rule.hits }, (_, s) => <span key={s} className={`hx-q-seg${s >= health ? ' is-gone' : ''}`} />)}
                    </span>
                </div>
                <div className="hx-q-sky" aria-hidden>
                    <span className="hx-q-fly">
                        <span className="hx-q-hover">
                            {/* Remounted per hit, so her wobble and flash play every time. */}
                            <span key={`hurt-${hits}`} className="hx-q-hurt"><Queen mood={mood} /></span>
                            <span className="hx-q-carried">
                                {Array.from({ length: taken }, (_, p) => <span key={p} className="hx-q-carried-pot"><HoneyPot /></span>)}
                            </span>
                        </span>
                        {bubble && <span key={`${moment}-${results.length}`} className="hx-q-bubble">{bubble}</span>}
                    </span>
                    {last === true && (
                        <span key={`swarm-${hits}`} className="hx-q-swarm">
                            {Array.from({ length: SWARM }, (_, b) => <span key={b} className="hx-q-dart" style={{ '--k': b } as CSSProperties}><Bee mood="busy" /></span>)}
                        </span>
                    )}
                    {last === true && <Burst key={`spark-${hits}`} kind="sparkle" x="58%" y="42%" spread={70} count={7} seed={seed + hits} />}
                </div>
                <div className="hx-q-shelf" role="img" aria-label={`Nog ${pots} ${pots === 1 ? 'pot' : 'potten'} honing`}>
                    {Array.from({ length: rule.pots }, (_, p) => (
                        // She drops what she took as she flees: the shelf is full again.
                        <span key={p} className={`hx-q-pot${p >= pots && settled !== 'fled' ? ' is-taken' : ''}`}><HoneyPot /></span>
                    ))}
                </div>
            </div>
            <section className="hx-wasp-card hx-q-card" aria-label="De Wespenkoningin">
                {intro ? (
                    <>
                        <p className="hx-wasp-title hx-q-banner" aria-live="polite">De koningin komt eraan!</p>
                        <p className="hx-wasp-rule">Raak haar {rule.hits} keer voor ze je {rule.pots} potten pakt!</p>
                    </>
                ) : settled ? (
                    <p className="hx-wasp-title hx-q-banner" aria-live="polite">{settled === 'fled' ? 'Ze vlucht! De honing is gered!' : 'Oei! Ze vliegt weg met de honing!'}</p>
                ) : (
                    <>
                        <p className="hx-wasp-title" aria-live="polite">Raak de koningin!</p>
                        <p className="hx-wasp-sum kiosk-math" key={`${q.key}-${at}`}><SpelLine text={q.text} /></p>
                        <div className="hx-drops" role="group" aria-label="Kies het antwoord">
                            {choices[i]?.map(c => {
                                const state = picked === null ? '' : c.value === rightValue ? ' is-right' : c.value === picked ? ' is-wrong' : ' is-dim';
                                return (
                                    <button key={`${q.key}-${at}-${c.value}`} type="button" className={`hx-drop-btn${state}`} onClick={() => tap(c.value)} disabled={picked !== null} aria-label={c.text}>
                                        <svg viewBox="0 0 80 100" aria-hidden><path className="hx-drop-art" d="M40 4 C52 26 72 44 72 64 C72 84 58 96 40 96 C22 96 8 84 8 64 C8 44 28 26 40 4 Z" /><ellipse className="hx-drop-shine" cx="27" cy="58" rx="6" ry="10" transform="rotate(20 27 58)" /></svg>
                                        <span className="kiosk-math" aria-hidden><SpelText text={c.text} /></span>
                                    </button>
                                );
                            })}
                        </div>
                    </>
                )}
            </section>
            <div className="hx-guards" aria-hidden>
                {[0, 1, 2].map(g => (
                    <span key={g} className="hx-guard" style={{ '--g': g } as CSSProperties}>
                        <span className="hx-guard-turn"><Bee mood={settled === 'fled' ? 'happy' : settled === 'robbed' ? 'worried' : 'busy'} pollen={settled === 'fled' && g === 1} /></span>
                    </span>
                ))}
            </div>
            {settled === 'fled' && (
                <>
                    <Burst key={`c-${wave}`} kind="pieces" x={['50%', '28%', '72%'][wave]} y="36%" spread={260} count={30} seed={seed + wave} />
                    <Burst key={`s-${wave}`} kind="sparkle" x={['30%', '70%', '50%'][wave]} y="28%" spread={140} count={12} seed={seed + wave + 5} />
                    <span className="hx-q-drips" aria-hidden>
                        {Array.from({ length: DRIPS }, (_, d) => <span key={d} className="hx-q-drip" style={{ '--k': d } as CSSProperties} />)}
                    </span>
                </>
            )}
        </div>
    );
}
