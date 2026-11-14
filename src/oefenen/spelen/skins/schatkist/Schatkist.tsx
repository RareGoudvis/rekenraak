import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { formatMathNumber } from '../../../../services/math/formatters';
import SpelKeypad from '../../SpelKeypad';
import type { SkinEndingProps, SkinProps } from '../types';
import { CHESTS, CODE_LEN, newHunt, nextChest, reveal, tryCode, type Hunt } from './code';
import './schatkist.css';

// Schatkist: a pirate island and a chest with a 4-digit lock. Each right answer reveals one digit of the code
// (the last digit of that answer, shown on the parchment); after four, the pupil types the code into the lock on
// the same keypad. A wrong code shakes the lock, the digits stay in view. The chest opens with gold coins; three
// chests make the round (the skin's own finish). A wrong sum costs nothing but gives no digit. Untimed.

// How long the open chest shows its coins before the next chest.
const OPEN_MS = 1900;
// Chests opened in the last round, for its end screen (same chunk).
let opened = 0;

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

function Island({ children }: { children: ReactNode }) {
    return (
        <svg className="sk-svg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMax meet" aria-hidden>
            <rect className="sk-sea" x={-2000} y={190} width={4400} height={1000} />
            <path className="sk-wave" d="M-200 214 Q-180 206 -160 214 M330 222 Q350 214 370 222 M20 236 Q40 228 60 236 M370 262 Q390 254 410 262" />
            <circle className="sk-sun" cx="352" cy="56" r="26" />
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

export default function Schatkist({ question, phase, feedback, onAnswer, onFinish, sound, progress, reducedMotion }: SkinProps) {
    const [hunt, setHunt] = useState<Hunt>(newHunt);
    // The question whose right answer gave the latest digit (one digit per question).
    const [revealedFor, setRevealedFor] = useState<string | null>(null);
    const [typed, setTyped] = useState('');
    if (question && phase === 'right' && feedback?.correct && revealedFor !== question.key) {
        setRevealedFor(question.key);
        setHunt(h => reveal(h, feedback.expected));
    }

    useEffect(() => { opened = 0; }, []);
    // The open chest shows its coins, then the next chest; after the last one the round ends.
    const finish = useRef(onFinish);
    useLayoutEffect(() => { finish.current = onFinish; });
    const score = useRef(progress.score);
    useLayoutEffect(() => { score.current = progress.score; });
    useEffect(() => {
        if (hunt.stage !== 'open') return;
        const last = hunt.chest + 1 >= CHESTS;
        const id = window.setTimeout(() => {
            if (last) finish.current?.({ title: 'De schat is van jou!', lead: `${CHESTS} schatkisten open, ${score.current} juist` });
            else setHunt(nextChest);
        }, last ? OPEN_MS - 500 : OPEN_MS);
        return () => window.clearTimeout(id);
    }, [hunt.stage, hunt.chest]);

    if (!question) return <div className="sk-root" />;
    const flash = phase === 'right' || phase === 'wrong';
    const coding = hunt.stage === 'code' && phase === 'play';
    const open = hunt.stage === 'open' || hunt.stage === 'done';
    const [before, after = ''] = question.text.split('?');

    const submitCode = (code: string) => {
        const next = tryCode(hunt, code);
        setTyped('');
        if (next.stage === 'open') {
            opened = hunt.chest + 1;
            // The last chest's coins sound with the end screen.
            if (hunt.chest + 1 < CHESTS) sound('win');
        } else sound('lost');
        setHunt(next);
    };

    const note = open ? 'De kist is open!'
        : coding ? (hunt.misses ? 'Kijk nog eens goed naar de cijfers.' : 'Typ de code in het slot.')
        : phase === 'wrong' ? 'Geen cijfer deze keer.'
        : hunt.last ? <>Het antwoord was <b className="kiosk-math">{formatMathNumber(Number(hunt.last.answer))}</b>, dus het cijfer is <b className="kiosk-math">{hunt.last.digit}</b>.</>
        : 'Elk juist antwoord geeft een cijfer van de code.';
    const newest = phase === 'right' ? hunt.digits.length - 1 : -1;

    return (
        <div className={`sk-root${phase === 'help' ? ' is-paused' : ''}${reducedMotion ? ' is-still' : ''}${coding ? ' is-code' : ''}${open ? ' is-open' : ''}`}>
            <div className="sk-world">
                <div className={`sk-parchment${coding && hunt.misses ? ` is-look-${hunt.misses % 2}` : ''}`}>
                    <p className="sk-chests">Kist {hunt.chest + 1} van {CHESTS}</p>
                    <p className="sk-note" aria-live="polite"><span>{note}</span></p>
                    <div className="sk-digits" role="img" aria-label={`De code tot nu toe: ${hunt.digits.join(' ') || 'nog geen cijfers'}`}>
                        {Array.from({ length: CODE_LEN }, (_, i) => (
                            <span key={i} className={`sk-digit kiosk-math${hunt.digits[i] ? '' : ' is-empty'}${i === newest ? ' is-new' : ''}`}>{hunt.digits[i] ?? ''}</span>
                        ))}
                    </div>
                </div>
                <div className="sk-scene">
                    <Island>
                        <Chest key={hunt.chest} open={open} shown={coding ? typed : ''} shake={hunt.misses} />
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
                        <p className={`sk-sign kiosk-math${flash ? ' is-solved' : ''}`} aria-live="polite">
                            {flash && feedback
                                ? <>{before}<span className="sk-sign-answer">{formatMathNumber(Number(feedback.expected))}</span>{after}</>
                                : question.text}
                        </p>
                        <SpelKeypad questionKey={question.key} onAnswer={onAnswer} disabled={phase !== 'play'} />
                    </>
                )}
            </div>
        </div>
    );
}

/** The end screen: the open chest full of coins (or a closed one when the round ran out first). */
export function SchatkistEnding({ reducedMotion }: SkinEndingProps) {
    return (
        <div className={`spel-ending sk-ending${reducedMotion ? ' is-still' : ''}`}>
            <Island>
                <Chest open={opened > 0} />
            </Island>
        </div>
    );
}
