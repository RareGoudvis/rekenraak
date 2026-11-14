import { useEffect, useId, useState, type CSSProperties } from 'react';
import { formatMathNumber } from '../../../../services/math/formatters';
import SpelKeypad from '../../SpelKeypad';
import type { SkinEndingProps, SkinProps } from '../types';
import { PRENTEN, prentById, type PrentEntry } from './prenten';
import { PRENT_H, PRENT_W } from './prenten/palette';
import { GRID, TILES, flippedFor, lastPrent, pickPrent, rememberPrent, tileOrder } from './pick';
import './prent.css';

// Verborgen prent: a funny animal hidden under 4 × 4 tiles. Each right answer flips one tile away (in a random
// order); 16 right shows the whole picture. A mistake never puts a tile back. Untimed, keypad.

// The round's picture, for its end screen (same chunk); the device memory is the fallback.
let current: string | null = null;

const TW = PRENT_W / GRID;
const TH = PRENT_H / GRID;
const SPARK = 'M0 -9 L2.5 -2.5 L9 0 L2.5 2.5 L0 9 L-2.5 2.5 L-9 0 L-2.5 -2.5 Z';

/** The picture in its frame, with the tiles that are still on (gone = the tile numbers that flipped away). */
export function PrentPicture({ prent, gone, label }: { prent: PrentEntry; gone: ReadonlySet<number> | 'all'; label?: string }) {
    const clip = `pr-clip-${useId().replace(/:/g, '')}`;
    const Art = prent.Art;
    return (
        <svg className="pr-svg" viewBox={`-10 -10 ${PRENT_W + 20} ${PRENT_H + 22}`} preserveAspectRatio="xMidYMid meet"
            {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}>
            <defs>
                <clipPath id={clip}><rect width={PRENT_W} height={PRENT_H} rx="18" /></clipPath>
            </defs>
            <rect className="pr-shadow" y="6" width={PRENT_W} height={PRENT_H} rx="18" />
            <g clipPath={`url(#${clip})`}>
                <Art />
                {gone !== 'all' && Array.from({ length: TILES }, (_, i) => {
                    const col = i % GRID, row = Math.floor(i / GRID);
                    const x = col * TW, y = row * TH;
                    return (
                        <g key={i} className={`pr-tile${gone.has(i) ? ' is-gone' : ''}`} data-tile={i}
                            style={{ transformOrigin: `${x + TW / 2}px ${y + TH / 2}px`, '--pr-tile': `var(--pr-tile-${(col + row) % 4})` } as CSSProperties}>
                            <rect x={x + 3} y={y + 3} width={TW - 6} height={TH - 6} rx="10" />
                            <path className="pr-spark" d={SPARK} transform={`translate(${x + TW / 2} ${y + TH / 2})`} />
                        </g>
                    );
                })}
            </g>
            <rect className="pr-border" width={PRENT_W} height={PRENT_H} rx="18" />
        </svg>
    );
}

export default function Prent({ question, phase, feedback, onAnswer, progress, reducedMotion }: SkinProps) {
    // Picked once per round (a remount = a new round); pure, so a double render picks the same way.
    const [id] = useState(() => pickPrent(PRENTEN.map(p => p.id), lastPrent()));
    const [order] = useState(() => tileOrder());
    useEffect(() => { current = id; rememberPrent(id); }, [id]);
    const prent = prentById(id) ?? PRENTEN[0];
    const flipped = flippedFor(progress.goal?.count ?? progress.right, progress.goal?.target ?? TILES);
    const gone = new Set(order.slice(0, flipped));

    if (!question) return <div className="pr-root" />;
    const flash = phase === 'right' || phase === 'wrong';
    const [before, after = ''] = question.text.split('?');

    return (
        <div className={`pr-root${phase === 'help' ? ' is-paused' : ''}${reducedMotion ? ' is-still' : ''}${flipped >= TILES ? ' is-done' : ''}`}>
            <div className="pr-world">
                <PrentPicture prent={prent} gone={gone} />
            </div>
            <div className="pr-panel">
                <p className={`pr-sign kiosk-math${flash ? ' is-solved' : ''}`} aria-live="polite">
                    {flash && feedback
                        ? <>{before}<span className="pr-sign-answer">{formatMathNumber(Number(feedback.expected))}</span>{after}</>
                        : question.text}
                </p>
                <SpelKeypad questionKey={question.key} onAnswer={onAnswer} disabled={phase !== 'play'} />
            </div>
        </div>
    );
}

/** The end screen: the whole picture, whatever the score. */
export function PrentEnding({ reducedMotion }: SkinEndingProps) {
    const prent = prentById(current ?? lastPrent()) ?? PRENTEN[0];
    return (
        <div className={`spel-ending pr-ending${reducedMotion ? ' is-still' : ''}`}>
            <PrentPicture prent={prent} gone="all" label={`De prent: ${prent.label}`} />
        </div>
    );
}
