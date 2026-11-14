import { useEffect, useState, type CSSProperties } from 'react';
import { formatMathNumber } from '../../../../services/math/formatters';
import SpelKeypad from '../../SpelKeypad';
import type { SkinProps } from '../types';
import { BH, BW, GROUND, VIEW_H, VIEW_W, jitter, towerScale } from './tower';
import './pinguintoren.css';

// Pinguïntoren: the calm game. Each right answer stacks an ice block and the penguin hops onto it; a
// mistake wobbles the tower and the top block slides into the sea (never below the floe). No red, no clock.

function Penguin() {
    return (
        <g className="pt-penguin-art">
            <ellipse className="pt-feet" cx="-10" cy="-3" rx="10" ry="5" />
            <ellipse className="pt-feet" cx="10" cy="-3" rx="10" ry="5" />
            <ellipse className="pt-flipper" cx="-21" cy="-26" rx="6" ry="15" transform="rotate(18 -21 -26)" />
            <ellipse className="pt-flipper" cx="21" cy="-26" rx="6" ry="15" transform="rotate(-18 21 -26)" />
            <ellipse className="pt-body" cx="0" cy="-32" rx="22" ry="30" />
            <ellipse className="pt-belly" cx="0" cy="-24" rx="15" ry="19" />
            <circle className="pt-eye" cx="-8" cy="-47" r="5" />
            <circle className="pt-eye" cx="8" cy="-47" r="5" />
            <circle className="pt-pupil" cx="-7" cy="-46" r="2.4" />
            <circle className="pt-pupil" cx="9" cy="-46" r="2.4" />
            <path className="pt-beak" d="M-5 -41 L5 -41 L0 -34 Z" />
        </g>
    );
}

function Block({ i, className = '' }: { i: number; className?: string }) {
    const x = VIEW_W / 2 - BW / 2 + jitter(i);
    const y = GROUND - (i + 1) * BH;
    return (
        <g className={`pt-block ${className}`}>
            <rect className={`pt-ice${i % 2 ? ' is-alt' : ''}`} x={x} y={y} width={BW} height={BH} rx="5" />
            <path className="pt-shine" d={`M${x + 9} ${y + 8} L${x + 30} ${y + 8}`} />
        </g>
    );
}

export default function Pinguintoren({ question, phase, feedback, onAnswer, progress, events, reducedMotion }: SkinProps) {
    const goal = progress.goal?.target ?? 20;
    const count = progress.goal?.count ?? progress.score;
    // The last change of the tower: up = a block landed, down = the top block fell (from = the height before).
    const [seen, setSeen] = useState({ count, change: null as 'up' | 'down' | null, from: count, n: 0 });
    if (seen.count !== count) setSeen({ count, change: count > seen.count ? 'up' : 'down', from: seen.count, n: seen.n + 1 });
    const [wobble, setWobble] = useState(0);
    useEffect(() => events.on('wrong', () => setWobble(w => w + 1)), [events]);

    if (!question) return <div className="pt-root" />;
    const flash = phase === 'right' || phase === 'wrong';
    const [lhs] = question.text.split('?');
    const scale = towerScale(count, goal);
    const top = count - 1;
    const goalY = GROUND - goal * BH;

    return (
        <div className={`pt-root${phase === 'help' ? ' is-paused' : ''}${reducedMotion ? ' is-still' : ''}`}>
            <div className="pt-world">
                <svg className="pt-svg" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="xMidYMax meet" aria-hidden>
                    <path className="pt-cloud" d="M14 62 Q4 62 6 53 Q8 45 18 47 Q20 35 33 37 Q41 28 52 34 Q64 30 67 42 Q80 41 81 52 Q83 62 70 62 Z" />
                    <path className="pt-cloud is-far" d="M168 30 Q161 30 162 24 Q164 19 170 20 Q172 12 181 14 Q187 8 194 12 Q203 10 205 18 Q214 17 214 24 Q215 30 206 30 Z" />
                    <rect className="pt-sea" x={-2000} y={GROUND + 6} width={VIEW_W + 4000} height={VIEW_H} />
                    <g className="pt-cam" style={{ transform: `scale(${scale})` }}>
                        <path className="pt-floe" d={`M30 ${GROUND + 14} L44 ${GROUND} L196 ${GROUND} L212 ${GROUND + 14} Z`} />
                        <g className="pt-goal">
                            <path className="pt-goal-line" d={`M40 ${goalY} L200 ${goalY}`} />
                            <path className="pt-pole" d={`M200 ${goalY} L200 ${goalY - 44}`} />
                            <path className="pt-flag" d={`M200 ${goalY - 44} L236 ${goalY - 36} L200 ${goalY - 26} Z`} />
                            <text className="pt-goal-num" x={196} y={goalY - 8} textAnchor="end">{goal}</text>
                        </g>
                        {/* Behind the tower: the penguin hops down in front of the falling block. */}
                        {seen.change === 'down' && seen.from > count && !reducedMotion && (
                            <g key={`fall-${seen.n}`} className="pt-fall" style={{ '--drop': `${seen.from * BH}px` } as CSSProperties}>
                                <Block i={seen.from - 1} />
                            </g>
                        )}
                        {/* Two identical wobble animations, alternated, so each mistake restarts it without a remount. */}
                        <g className={`pt-tower${wobble ? ` is-wobble-${wobble % 2}` : ''}`}>
                            {Array.from({ length: count }, (_, i) => (
                                <Block key={i} i={i} className={i === top && seen.change === 'up' ? 'is-new' : ''} />
                            ))}
                            <g className="pt-penguin" style={{ transform: `translate(${VIEW_W / 2 + (count ? jitter(top) : 0)}px, ${GROUND - count * BH}px)` }}>
                                <g key={seen.n} className={seen.change === 'up' ? 'pt-hop' : seen.change === 'down' ? 'pt-land' : ''}>
                                    <Penguin />
                                </g>
                            </g>
                        </g>
                    </g>
                </svg>
            </div>

            <div className="pt-panel">
                <p className={`pt-sign kiosk-math${flash ? ' is-solved' : ''}`} aria-live="polite">
                    {flash && feedback
                        ? <>{lhs}<span className="pt-sign-answer">{formatMathNumber(Number(feedback.expected))}</span></>
                        : question.text}
                </p>
                <SpelKeypad questionKey={question.key} onAnswer={onAnswer} disabled={phase !== 'play'} />
            </div>
        </div>
    );
}
