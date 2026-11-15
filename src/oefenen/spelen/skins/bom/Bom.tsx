import { useState, type CSSProperties } from 'react';
import { SpelSignBox } from '../../SpelVisual';
import SpelKeypad from '../../SpelKeypad';
import type { SkinEndingProps, SkinProps } from '../types';
import { WRONG_PENALTY_MS, penaltyHit } from './penalty';
import { BOM, FUSE_PATH, clockText, fuseLeft, fusePoint, isHurry } from './fuse';
import './bom.css';

// Bom: a cartoon bomb with a big clock and a burning fuse. Each right answer fills one segment of the
// "ontmanteld" bar; N right before the clock runs out defuses it. A wrong answer costs 3 s of the clock (round.wrongPenaltyMs): the clock flashes red and "−3 s" floats off. Time up is
// a harmless PUF! cloud with confetti on the end screen. No rAF loop: the fuse follows the shell's clock.

type Face = 'clock' | 'smile' | 'oh';

const STAR = 'M0 -15 L4 -5 L14 -6 L6 1 L10 12 L0 5 L-10 12 L-6 1 L-14 -6 L-4 -5 Z';

function BombArt({ face, clock = '', fuse = 1, spark = true, flag = false, hit = null, still = false }: { face: Face; clock?: string; fuse?: number; spark?: boolean; flag?: boolean; hit?: number | null; still?: boolean }) {
    const tip = fusePoint(fuse);
    return (
        <g className="bom-art">
            <ellipse className="bom-shadow" cx="140" cy="242" rx="74" ry="10" />
            {spark && <path className="bom-fuse-dim" d={FUSE_PATH} pathLength={100} />}
            <path className="bom-fuse" d={FUSE_PATH} pathLength={100} style={{ strokeDashoffset: (1 - fuse) * 100 }} />
            <rect className="bom-cap" x="118" y="68" width="44" height="22" rx="5" />
            <circle className="bom-body" cx="140" cy="160" r="78" />
            <path className="bom-shine" d="M92 132 A56 56 0 0 1 122 100" />
            {face === 'clock' && (
                // Keyed per mistake so the red flash and the floating "−3 s" restart each time.
                <g className={`bom-display${hit !== null ? ' is-hit' : ''}`} key={`d${hit}`}>
                    <rect x="88" y="134" width="104" height="52" rx="10" />
                    <text x="140" y="172" textAnchor="middle">{clock}</text>
                    {hit !== null && !still && <text className="bom-minus" x="196" y="128" textAnchor="middle" aria-hidden>{`−${WRONG_PENALTY_MS / 1000}s`}</text>}
                </g>
            )}
            {face === 'smile' && (
                <g className="bom-face">
                    <circle className="bom-eye" cx="114" cy="148" r="12" />
                    <circle className="bom-eye" cx="166" cy="148" r="12" />
                    <circle className="bom-pupil" cx="117" cy="150" r="5" />
                    <circle className="bom-pupil" cx="169" cy="150" r="5" />
                    <path className="bom-smile" d="M106 180 Q140 212 174 180" />
                    <circle className="bom-cheek" cx="96" cy="182" r="8" />
                    <circle className="bom-cheek" cx="184" cy="182" r="8" />
                </g>
            )}
            {face === 'oh' && (
                <g className="bom-face">
                    <circle className="bom-eye" cx="114" cy="146" r="14" />
                    <circle className="bom-eye" cx="166" cy="146" r="14" />
                    <circle className="bom-pupil" cx="114" cy="148" r="5" />
                    <circle className="bom-pupil" cx="166" cy="148" r="5" />
                    <ellipse className="bom-oh" cx="140" cy="190" rx="11" ry="13" />
                </g>
            )}
            {spark && fuse > 0 && (
                <g className="bom-spark" style={{ transform: `translate(${tip.x}px, ${tip.y}px)` }}>
                    <g className={`bom-spark-jump${hit !== null ? ' is-hit' : ''}`} key={`j${hit}`}>
                    <g className="bom-spark-flick">
                        <path className="bom-spark-star" d={STAR} />
                        <circle className="bom-spark-core" r="4" />
                    </g>
                    </g>
                </g>
            )}
            {flag && (
                <g className="bom-flag">
                    <path className="bom-flag-pole" d="M140 68 L140 14" />
                    <path className="bom-flag-cloth" d="M140 14 L184 26 L140 40 Z" />
                </g>
            )}
        </g>
    );
}

// The "ontmanteld" bar: one segment per right answer to go, on two rows past BOM.rowMax.
function Bar({ count, target, freshKey }: { count: number; target: number; freshKey: number | null }) {
    const perRow = Math.min(target, BOM.rowMax);
    return (
        <div className="bom-bar" role="img" aria-label={`${count} van ${target} ontmanteld`} style={{ '--bom-cols': perRow } as CSSProperties}>
            {Array.from({ length: target }, (_, i) => (
                <span key={i === count - 1 && freshKey !== null ? `s${i}-${freshKey}` : `s${i}`}
                    className={`bom-seg${i < count ? ' is-done' : ''}${i === count - 1 && freshKey !== null ? ' is-new' : ''}`} />
            ))}
        </div>
    );
}

export default function Bom({ question, phase, feedback, onAnswer, progress, reducedMotion }: SkinProps) {
    const target = progress.goal?.target ?? 10;
    const count = Math.min(progress.goal?.count ?? 0, target);
    // A segment just filled pops in (keyed per fill, so the next one restarts).
    const [seen, setSeen] = useState({ count, n: 0, up: false });
    if (seen.count !== count) setSeen({ count, n: seen.n + 1, up: count > seen.count });
    // A counted mistake cost time (round.wrongPenaltyMs): flash the clock, once per mistake.
    const [hit, setHit] = useState({ mistakes: progress.mistakes, n: 0 });
    if (hit.mistakes !== progress.mistakes) setHit({ mistakes: progress.mistakes, n: penaltyHit(hit.mistakes, progress.mistakes) ? hit.n + 1 : hit.n });
    if (!question) return <div className="bom-root" />;
    const flash = phase === 'right' || phase === 'wrong';
    const hurry = isHurry(progress.msLeft);
    return (
        <div className={`bom-root${hurry ? ' is-hurry' : ''}${phase === 'help' ? ' is-paused' : ''}${reducedMotion ? ' is-still' : ''}`}>
            <div className="bom-world">
                <Bar count={count} target={target} freshKey={seen.up ? seen.n : null} />
                <svg className="bom-svg" viewBox="0 0 300 260" preserveAspectRatio="xMidYMax meet" aria-hidden>
                    <g className={`bom-breathe${phase === 'right' ? ' is-relief' : ''}`}>
                        <BombArt face="clock" clock={clockText(progress.msLeft)} fuse={fuseLeft(progress.msLeft, progress.msTotal)} hit={hit.n > 0 && phase === 'wrong' ? hit.n : null} still={reducedMotion} />
                    </g>
                </svg>
            </div>
            <div className="bom-panel">
                <SpelSignBox className={"bom-sign"} question={question} feedback={feedback} flash={flash} answerClassName="bom-sign-answer" />
                <SpelKeypad questionKey={question.key} onAnswer={onAnswer} disabled={phase !== 'play'} />
            </div>
        </div>
    );
}

const CONFETTI = 16;

function Confetti({ reducedMotion }: { reducedMotion: boolean }) {
    return (
        <span className={`bom-confetti${reducedMotion ? ' is-still' : ''}`} aria-hidden>
            {Array.from({ length: CONFETTI }, (_, i) => (
                <span key={i} className="bom-bit" style={{ '--i': i, '--x': `${(i * 37) % 100}%`, '--c': `var(--spel-fill-${1 + (i % 5)})` } as CSSProperties} />
            ))}
        </span>
    );
}

// The end screen: defused = the bomb smiles under a little flag; time up = a big soft PUF! cloud with confetti.
export function BomEnding({ outcome, reducedMotion }: SkinEndingProps) {
    const won = outcome === 'won';
    return (
        <div className={`spel-ending bom-ending${won ? ' is-won' : ' is-puf'}${reducedMotion ? ' is-still' : ''}`}>
            <svg viewBox="0 0 300 260" preserveAspectRatio="xMidYMid meet" aria-hidden>
                {won ? (
                    <g className="bom-hop"><BombArt face="smile" fuse={0.12} spark={false} flag /></g>
                ) : (
                    <>
                        <g className="bom-cloud">
                            {[[64, 140, 50], [124, 104, 60], [196, 112, 56], [246, 158, 42], [48, 196, 40], [150, 176, 70], [236, 212, 38]].map(([x, y, r], i) => (
                                <circle key={i} cx={x} cy={y} r={r} style={{ '--i': i } as CSSProperties} />
                            ))}
                        </g>
                        {/* A small sooty bomb in front of the cloud, surprised but fine. */}
                        <g transform="translate(150 150) scale(.6) translate(-140 -160)">
                            <g className="bom-peek"><BombArt face="oh" fuse={0} spark={false} /></g>
                        </g>
                    </>
                )}
            </svg>
            {!won && <p className="bom-puf" aria-hidden>PUF!</p>}
            <Confetti reducedMotion={reducedMotion} />
        </div>
    );
}
