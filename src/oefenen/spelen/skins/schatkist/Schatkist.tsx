import { useEffect, useLayoutEffect, useRef, useState, type AnimationEvent, type CSSProperties, type ReactNode } from 'react';
import { SpelSignBox } from '../../SpelVisual';
import { answerTextOf } from '../../spelFormat';
import SpelKeypad from '../../SpelKeypad';
import { Clouds } from '../../scene';
import type { SkinEndingProps, SkinProps } from '../types';
import { CHESTS, CODE_LEN, newHunt, nextChest, reveal, tryCode, type Hunt } from './code';
import { coinsOf, earnTo, gem, heapSlot, lootLine, newHeap, right, steal, wrong, HEAP_X, HEAP_Y, SHORE, type Heap, type Loot } from './heap';
import { DAY, SUNSET, skyFor, type Sky } from './sky';
import './schatkist.css';

// Schatkist: a pirate island and a chest with a 4-digit lock. Each right answer reveals one digit of the code
// (the last digit of that answer, shown on the parchment) and a coin hops onto the heap beside the chest; after
// four, the pupil types the code into the lock on the same keypad. A wrong code shakes the lock, the digits stay in
// view. The chest opens with gold coins and a gem for the heap. Untimed: three chests make the round (the skin's
// own finish). Met tijd: as many chests as the clock allows, the sun rising and setting with it. A wrong sum gives
// no digit; three in a row bring a crab that carries the newest coin or gem off the heap into the sea.

// How long the open chest shows its coins before the next chest.
const OPEN_MS = 1900;
// The last round, for its end screen (same chunk): chests opened and the heap as it was left.
let opened = 0;
let lastHeap: Heap = newHeap();

// A pile in the chest's mouth, bulging over the rim.
const COINS: [number, number, number][] = [[148, 178, 0], [172, 172, 1], [196, 176, 2], [220, 172, 3], [246, 178, 4], [160, 158, 5], [184, 154, 6], [210, 156, 7], [236, 160, 8], [198, 138, 9]];

function Coin({ x, y, i }: { x: number; y: number; i: number }) {
    return (
        <g className="sk-coin" style={{ '--i': i } as CSSProperties}>
            <circle cx={x} cy={y} r="11" />
            <circle className="sk-coin-ring" cx={x} cy={y} r="6" />
        </g>
    );
}

/** The chest: closed with its lock (the windows show `shown`), or open with coins. */
export function Chest({ open, shown = '', shake = 0 }: { open: boolean; shown?: string; shake?: number }) {
    return (
        <g className={`sk-chest${open ? ' is-open' : ''}`}>
            <ellipse className="sk-chest-shadow" cx="200" cy="272" rx="98" ry="10" />
            {open ? (
                <>
                    <path className="sk-wood" d="M126 152 L136 106 Q140 92 200 92 Q260 92 264 106 L274 152 Z" />
                    <path className="sk-band" d="M131 130 L269 130" />
                    <path className="sk-inside" d="M120 190 L124 150 L276 150 L280 190 Z" />
                    {COINS.map(([x, y, i]) => <Coin key={i} x={x} y={y} i={i} />)}
                    <path className="sk-glint" d="M250 108 L254 120 L266 124 L254 128 L250 140 L246 128 L234 124 L246 120 Z" />
                </>
            ) : (
                <path className="sk-wood" d="M116 192 L116 166 Q116 138 200 138 Q284 138 284 166 L284 192 Z" />
            )}
            <rect className="sk-wood" x="120" y="190" width="160" height="80" rx="6" />
            <path className="sk-band" d="M140 190 L140 270 M260 190 L260 270" />
            {!open && <path className="sk-band" d="M140 192 L140 142 M260 192 L260 142" />}
            {!open && (
                <g className={`sk-lock${shake ? ` is-shake-${shake % 2}` : ''}`}>
                    <rect className="sk-plate" x="146" y="172" width="108" height="48" rx="10" />
                    {Array.from({ length: CODE_LEN }, (_, i) => (
                        <g key={i}>
                            <rect className="sk-window" x={154 + i * 24} y="180" width="20" height="32" rx="4" />
                            <text className="sk-window-num" x={164 + i * 24} y="204" textAnchor="middle">{shown[i] ?? ''}</text>
                        </g>
                    ))}
                </g>
            )}
        </g>
    );
}

// A flat coin seen from the side, and a cut gem; both centred on 0 0.
function LootShape({ kind, n }: { kind: Loot['kind']; n: number }) {
    if (kind === 'gem') {
        return (
            <g className={`sk-gem is-${n % 3}`}>
                <path d="M-9 -4 L-5 -10 L5 -10 L9 -4 L0 8 Z" />
                <path className="sk-gem-cut" d="M-9 -4 L9 -4 M-4 -4 L0 8 L4 -4 M-5 -10 L-2 -4 M5 -10 L2 -4" />
            </g>
        );
    }
    return (
        <g className="sk-heap-coin">
            <path className="sk-coin-side" d="M-10 0 V3.5 A10 5.5 0 0 0 10 3.5 V0" />
            <ellipse rx="10" ry="5.5" />
            <ellipse className="sk-coin-ring" rx="5" ry="2.6" />
        </g>
    );
}

// Where a new coin or gem hops from: the chest's lock for a coin, its open mouth for a gem.
const FROM = { coin: { x: 200, y: 150 }, gem: { x: 200, y: 160 } };

/** The heap beside the chest. */
export function Hoard({ heap, settled }: { heap: Heap; settled?: boolean }) {
    let gems = 0;
    return (
        <g className={`sk-hoard${settled ? ' is-settled' : ''}`}>
            <ellipse className="sk-heap-shadow" cx={HEAP_X} cy={HEAP_Y + 4} rx={heap.items.length ? Math.min(62, 16 + heap.items.length * 2.2) : 0} ry="6" />
            {/* Gems after the coins, so a coin landing higher up never hides one. */}
            {heap.items.map((l, i) => ({ l, i, n: l.kind === 'gem' ? gems++ : 0 })).sort((a, b) => Number(a.l.kind === 'gem') - Number(b.l.kind === 'gem')).map(({ l, i, n }) => {
                const p = heapSlot(i);
                const from = FROM[l.kind];
                return (
                    <g key={l.id} className="sk-loot" style={{ transform: `translate(${p.x}px, ${p.y}px)` }}>
                        <g className="sk-fly-x" style={{ '--fx': `${from.x - p.x}px` } as CSSProperties}>
                            <g className="sk-fly-y" style={{ '--fy': `${from.y - p.y}px` } as CSSProperties}>
                                <LootShape kind={l.kind} n={n} />
                            </g>
                        </g>
                    </g>
                );
            })}
        </g>
    );
}

// The crab's trip: in from the sea to the heap, with the loot back to the shore, under with a splash.
// still = reduced motion: it stands at the shore with the loot until the next sum.
type CrabTrip = { loot: Loot; gemN: number; phase: 'come' | 'carry' | 'dive' | 'still'; at: { x: number; y: number }; forKey: string };

function Crab({ trip, onStep }: { trip: CrabTrip; onStep(e: AnimationEvent<SVGGElement>): void }) {
    const style = { '--hx': `${trip.at.x + 26}px`, '--tx': `${SHORE.x}px`, '--ty': `${SHORE.y}px` } as CSSProperties;
    const carrying = trip.phase === 'carry' || trip.phase === 'dive' || trip.phase === 'still';
    return (
        <g className={`sk-crab is-${trip.phase}`} style={style} onAnimationEnd={onStep}>
            {trip.phase === 'dive' && (
                <g className="sk-splash" aria-hidden>
                    <ellipse className="sk-splash-ring" cx="0" cy="2" rx="20" ry="5" />
                    {[-14, -5, 5, 14].map((dx, i) => <circle key={i} className="sk-splash-drop" cx={dx} cy="-2" r="3" style={{ '--dx': `${dx * 1.4}px` } as CSSProperties} />)}
                </g>
            )}
            <g className="sk-crab-body" transform="scale(1.2)">
                <path className="sk-crab-leg" d="M-14 2 L-24 8 L-27 14 M-12 6 L-20 13 L-21 19 M14 2 L24 8 L27 14 M12 6 L20 13 L21 19" />
                <path className="sk-crab-arm" d="M-12 -4 L-20 -12 M12 -4 L20 -12" />
                <path className="sk-crab-claw" d="M-20 -12 Q-30 -16 -26 -26 L-21 -20 L-16 -24 Q-14 -14 -20 -12 Z M20 -12 Q30 -16 26 -26 L21 -20 L16 -24 Q14 -14 20 -12 Z" />
                <ellipse className="sk-crab-shell" cx="0" cy="0" rx="16" ry="11" />
                <path className="sk-crab-stalk" d="M-5 -9 L-6 -17 M5 -9 L6 -17" />
                <circle className="sk-crab-eye" cx="-6" cy="-19" r="4" />
                <circle className="sk-crab-eye" cx="6" cy="-19" r="4" />
                <circle className="sk-crab-pupil" cx="-5" cy="-19" r="1.6" />
                <circle className="sk-crab-pupil" cx="7" cy="-19" r="1.6" />
                <path className="sk-crab-grin" d="M-5 3 Q0 7 5 3" />
                {carrying && <g className="sk-crab-coin" transform="translate(0 -30)"><LootShape kind={trip.loot.kind} n={trip.gemN} /></g>}
            </g>
        </g>
    );
}

// A few small swells now and then on the open sea (CSS cycles; hidden under reduced motion).
// Placed where the sea shows on every screen: left of the island, right of it before the keypad, and further out on wide ones.
const SWELLS: [number, number, number][] = [[34, 203, 0], [362, 204, 1], [-64, 214, 2], [398, 217, 3], [470, 240, 4]];

// behind = between the sea and the sand (the crab diving in behind the island's edge).
function Island({ children, sky, behind }: { children: ReactNode; sky: Sky; behind?: ReactNode }) {
    return (
        <svg className="sk-svg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMax meet" aria-hidden>
            {/* The sun sits behind the sea so it can rise out of it and set into it. */}
            <circle className="sk-sun" cx={0} cy={0} r="26" style={{ transform: `translate(${sky.x}px, ${sky.y}px)` }} />
            <rect className="sk-sea" x={-2000} y={190} width={4400} height={1000} />
            <g className="sk-waves">
                <path className="sk-wave" d="M-200 214 Q-180 206 -160 214 M330 222 Q350 214 370 222 M20 236 Q40 228 60 236 M370 262 Q390 254 410 262" />
                <path className="sk-wave is-b" d="M-120 250 Q-100 242 -80 250 M420 230 Q440 222 460 230 M-20 212 Q0 204 20 212 M480 270 Q500 262 520 270" />
            </g>
            {SWELLS.map(([x, y, i]) => (
                <g key={i} className={`sk-swell is-${i}`} style={{ transform: `translate(${x}px, ${y}px)` }}>
                    <path className="sk-swell-body" d="M-22 4 Q-12 -10 2 -9 Q12 -8 14 -1 Q8 -5 4 -1 Q10 3 22 4 Z" />
                </g>
            ))}
            {behind}
            <path className="sk-sand" d="M-60 300 Q-40 222 80 220 Q200 206 320 220 Q440 224 460 300 Z" />
            {/* A palm tree. */}
            <path className="sk-trunk" d="M58 236 Q50 170 76 112 L88 116 Q66 172 74 236 Z" />
            <path className="sk-leaf" d="M82 112 Q48 86 14 104 Q46 100 80 118 Z M82 112 Q96 72 136 76 Q104 88 86 120 Z M82 112 Q122 104 146 128 Q112 116 84 118 Z M82 112 Q56 64 66 40 Q74 74 88 112 Z" />
            <circle className="sk-nut" cx="80" cy="120" r="7" />
            <circle className="sk-nut" cx="92" cy="122" r="7" />
            {children}
        </svg>
    );
}

// The sky colours as custom properties (dawn and sunset mixed into the day sky).
const skyStyle = (sky: Sky): CSSProperties => ({ '--sk-dawn': `${Math.round(sky.dawn * 100)}%`, '--sk-dusk': `${Math.round(sky.dusk * 100)}%` } as CSSProperties);

const chestsLine = (n: number) => (n === 0 ? 'Nog geen schatkist open' : `${n} ${n === 1 ? 'schatkist' : 'schatkisten'} open`);

export default function Schatkist({ question, phase, feedback, onAnswer, onFinish, onReport, sound, progress, reducedMotion }: SkinProps) {
    const timed = progress.msTotal !== null;
    const chests = timed ? Infinity : CHESTS;
    const [hunt, setHunt] = useState<Hunt>(newHunt);
    const [heap, setHeap] = useState<Heap>(newHeap);
    const [crab, setCrab] = useState<CrabTrip | null>(null);
    // The question whose answer was handled (one digit, one coin or one step of the crab's run per question).
    const [seenFor, setSeenFor] = useState<string | null>(null);
    const [typed, setTyped] = useState('');
    // Every counted right answer is a coin, from the very first one (the heap follows the score).
    if (progress.score > heap.earned) setHeap(h => earnTo(h, progress.score));
    if (question && feedback && (phase === 'right' || phase === 'wrong') && seenFor !== question.key) {
        setSeenFor(question.key);
        if (feedback.correct) {
            setHunt(h => reveal(h, feedback.expected));
            setHeap(right);
        } else {
            const next = wrong(heap, crab !== null);
            setHeap(next.heap);
            if (next.crab) {
                const idx = heap.items.findIndex(l => l.id === next.crab!.id);
                const gemN = heap.items.slice(0, idx).filter(l => l.kind === 'gem').length;
                const trip = { loot: next.crab, gemN, at: heapSlot(idx), forKey: question.key };
                // Reduced motion: no walk; the loot is gone at once and the crab stands at the shore with it.
                if (reducedMotion) {
                    setHeap(steal(next.heap, next.crab.id));
                    setCrab({ ...trip, phase: 'still' });
                } else setCrab({ ...trip, phase: 'come' });
            }
        }
    }
    // A still crab (reduced motion) leaves with the next question.
    if (crab?.phase === 'still' && question && crab.forKey !== question.key) setCrab(null);

    const onCrabStep = (e: AnimationEvent<SVGGElement>) => {
        if (e.target !== e.currentTarget || !crab) return;
        if (crab.phase === 'come') {
            setHeap(h => steal(h, crab.loot.id));
            setCrab({ ...crab, phase: 'carry' });
        } else if (crab.phase === 'carry') setCrab({ ...crab, phase: 'dive' });
        else if (crab.phase === 'dive') setCrab(null);
    };

    useEffect(() => { opened = 0; lastHeap = newHeap(); }, []);
    // The end screen shows the heap as it is; loot the crab already set out for is gone.
    useEffect(() => { lastHeap = crab?.phase === 'come' ? steal(heap, crab.loot.id) : heap; }, [heap, crab]);
    const loot = useRef(lastHeap);
    useLayoutEffect(() => { loot.current = crab?.phase === 'come' ? steal(heap, crab.loot.id) : heap; });
    // The open chest shows its coins, then the next chest; after the last one the round ends.
    const finish = useRef(onFinish);
    useLayoutEffect(() => { finish.current = onFinish; });
    const score = useRef(progress.score);
    useLayoutEffect(() => { score.current = progress.score; });
    useEffect(() => {
        if (hunt.stage !== 'open') return;
        const last = hunt.chest + 1 >= chests;
        const id = window.setTimeout(() => {
            if (last) finish.current?.({ title: 'De schat is van jou!', lead: `${score.current} juist, ${lootLine(loot.current)}` });
            else setHunt(h => nextChest(h, chests));
        }, last ? OPEN_MS - 500 : OPEN_MS);
        return () => window.clearTimeout(id);
    }, [hunt.stage, hunt.chest, chests]);
    // A timed round ends on the clock: its end screen counts the chests.
    const report = useRef(onReport);
    useLayoutEffect(() => { report.current = onReport; });
    const openedNow = hunt.chest + (hunt.stage === 'open' || hunt.stage === 'done' ? 1 : 0);
    const lootNow = lootLine(crab?.phase === 'come' ? steal(heap, crab.loot.id) : heap);
    useEffect(() => {
        if (timed) report.current?.({ lead: `${progress.score} juist, ${lootNow}`, detail: `${chestsLine(openedNow)}.` });
    }, [timed, openedNow, progress.score, lootNow]);

    const sky = timed ? skyFor(progress.msLeft, progress.msTotal) : DAY;
    if (!question) return <div className="sk-root" style={skyStyle(sky)} />;
    const flash = phase === 'right' || phase === 'wrong';
    const coding = hunt.stage === 'code' && phase === 'play';
    const open = hunt.stage === 'open' || hunt.stage === 'done';

    const submitCode = (code: string) => {
        const next = tryCode(hunt, code);
        setTyped('');
        if (next.stage === 'open') {
            opened = hunt.chest + 1;
            setHeap(gem);
            // The last chest's coins sound with the end screen.
            if (hunt.chest + 1 < chests) sound('win');
        } else sound('lost');
        setHunt(next);
    };

    const note = open ? 'De kist is open!'
        : coding ? (hunt.misses ? 'Kijk nog eens goed naar de cijfers.' : 'Typ de code in het slot.')
        : phase === 'wrong' ? 'Geen cijfer deze keer.'
        : hunt.last ? <>Het antwoord was <b className="kiosk-math">{answerTextOf(null, hunt.last.answer)}</b>, dus het cijfer is <b className="kiosk-math">{hunt.last.digit}</b>.</>
        : 'Elk juist antwoord geeft een cijfer van de code.';
    const newest = phase === 'right' ? hunt.digits.length - 1 : -1;
    const paused = phase === 'help';

    return (
        <div className={`sk-root${paused ? ' is-paused' : ''}${reducedMotion ? ' is-still' : ''}${coding ? ' is-code' : ''}${open ? ' is-open' : ''}${timed ? ' is-timed' : ''}`}
            style={skyStyle(sky)} data-coins={coinsOf(heap)}>
            <div className="sk-world">
                <div className="sk-sky">
                    <Clouds layer="far" outline={false} count={3} band={[4, 26]} size={[90, 150]} speed={80} seed={7} paused={paused} reducedMotion={reducedMotion} />
                    <Clouds layer="near" count={2} band={[8, 30]} size={[110, 170]} speed={55} seed={3} paused={paused} reducedMotion={reducedMotion} />
                </div>
                <div className={`sk-parchment${coding && hunt.misses ? ` is-look-${hunt.misses % 2}` : ''}`}>
                    <p className="sk-chests">{timed ? `Kist ${hunt.chest + 1}` : `Kist ${hunt.chest + 1} van ${CHESTS}`}</p>
                    <p className="sk-note" aria-live="polite"><span>{note}</span></p>
                    <div className="sk-digits" role="img" aria-label={`De code tot nu toe: ${hunt.digits.join(' ') || 'nog geen cijfers'}`}>
                        {Array.from({ length: CODE_LEN }, (_, i) => (
                            <span key={i} className={`sk-digit kiosk-math${hunt.digits[i] ? '' : ' is-empty'}${i === newest ? ' is-new' : ''}`}>{hunt.digits[i] ?? ''}</span>
                        ))}
                    </div>
                </div>
                <div className="sk-scene">
                    <Island sky={sky} behind={crab?.phase === 'dive' && <Crab trip={crab} onStep={onCrabStep} />}>
                        <Chest key={hunt.chest} open={open} shown={coding ? typed : ''} shake={hunt.misses} />
                        <Hoard heap={heap} settled={reducedMotion} />
                        {crab && crab.phase !== 'dive' && <Crab trip={crab} onStep={onCrabStep} />}
                    </Island>
                </div>
            </div>
            <div className="sk-panel">
                {coding || open ? (
                    <>
                        <p className="sk-sign is-code">{open ? 'Open!' : 'Typ de code'}</p>
                        <SpelKeypad key={`code-${hunt.chest}-${hunt.misses}`} questionKey={`code-${hunt.chest}-${hunt.misses}`} onAnswer={submitCode}
                            disabled={!coding} maxDigits={CODE_LEN} onType={setTyped} />
                    </>
                ) : (
                    <>
                        <SpelSignBox className={`sk-sign${flash ? ' is-solved' : ''}`} question={question} feedback={feedback} flash={flash} answerClassName="sk-sign-answer" />
                        <SpelKeypad questionKey={question.key} onAnswer={onAnswer} disabled={phase !== 'play'} />
                    </>
                )}
            </div>
        </div>
    );
}

/** The end screen: the chest (open, or closed when the round ran out first), the heap, and a sunset after a timed round. */
export function SchatkistEnding({ progress, reducedMotion }: SkinEndingProps) {
    const sky = progress.msTotal !== null ? SUNSET : DAY;
    return (
        <div className={`spel-ending sk-ending${reducedMotion ? ' is-still' : ''}`} style={skyStyle(sky)}>
            <Island sky={sky}>
                <Chest open={opened > 0} />
                <Hoard heap={lastHeap} settled />
            </Island>
        </div>
    );
}
