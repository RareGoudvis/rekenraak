import { useEffect, useId, useState, type CSSProperties } from 'react';
import { SpelSignBox } from '../../SpelVisual';
import SpelKeypad from '../../SpelKeypad';
import type { SkinEndingProps, SkinProps } from '../types';
import type { PrentEntry } from './prenten';
import { PRENT_H, PRENT_W } from './prenten/palette';
import { GRID, TILES, flippedFor, lastPrent, pickPrent, rememberPrent, tileOrder } from './pick';
import { photoCredit, photoUrl } from './photos';
import { devPrent, pictureFor, poolIds } from './picture';
import { usePhotoStatus } from './photoLoad';
import './prent.css';

// Verborgen prent: a funny animal photo hidden under 4 × 4 tiles. Each right answer flips one tile away (in a random
// order); 16 right shows the whole picture. A mistake never puts a tile back. Untimed, keypad. A photo that cannot
// load gives way to a drawn animal (prenten/).

// The round's picture, for its end screen (same chunk); the device memory is the fallback.
let current: string | null = null;

const SPARK = 'M0 -9 L2.5 -2.5 L9 0 L2.5 2.5 L0 9 L-2.5 2.5 L-9 0 L-2.5 -2.5 Z';

export interface PrentPhotoView { id: string; url: string; w: number; h: number; ready: boolean }

/** The picture in its frame, with the tiles that are still on (gone = the tile numbers that flipped away). A photo
 *  sets the frame's shape; without one the drawn animal fills a 400 × 300 frame. */
export function PrentPicture({ prent, photo, gone, label }: { prent: PrentEntry; photo?: PrentPhotoView | null; gone: ReadonlySet<number> | 'all'; label?: string }) {
    const clip = `pr-clip-${useId().replace(/:/g, '')}`;
    const W = PRENT_W;
    const H = photo ? Math.round((PRENT_W * photo.h) / photo.w) : PRENT_H;
    const TW = W / GRID, TH = H / GRID;
    const Art = prent.Art;
    return (
        <svg className="pr-svg" viewBox={`-10 -10 ${W + 20} ${H + 22}`} preserveAspectRatio="xMidYMid meet"
            style={{ '--pr-ratio': (W + 20) / (H + 22) } as CSSProperties}
            {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}>
            <defs>
                <clipPath id={clip}><rect width={W} height={H} rx="18" /></clipPath>
            </defs>
            <rect className="pr-shadow" y="6" width={W} height={H} rx="18" />
            <g clipPath={`url(#${clip})`}>
                {photo ? (
                    <g className="pr-photo" data-prent={photo.id}>
                        <rect className="pr-photo-wait" width={W} height={H} />
                        {photo.ready && <image href={photo.url} width={W} height={H} preserveAspectRatio="xMidYMid slice" />}
                    </g>
                ) : <Art />}
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
            <rect className="pr-border" width={W} height={H} rx="18" />
        </svg>
    );
}

// The round's picture as it shows now: the photo while it loads or once it did, the drawn animal when it failed.
function usePicture(id: string | null) {
    const { photo, drawn } = pictureFor(id);
    const status = usePhotoStatus(photo ? photoUrl(photo) : null);
    const view: PrentPhotoView | null = photo && status !== 'failed'
        ? { id: photo.id, url: photoUrl(photo), w: photo.w, h: photo.h, ready: status === 'ready' }
        : null;
    return { photo: view ? photo : null, view, drawn };
}

export default function Prent({ question, phase, feedback, onAnswer, progress, reducedMotion }: SkinProps) {
    // Picked once per round (a remount = a new round); pure, so a double render picks the same way.
    const [id] = useState(() => devPrent() ?? pickPrent(poolIds(), lastPrent()));
    const [order] = useState(() => tileOrder());
    useEffect(() => { current = id; rememberPrent(id); }, [id]);
    const { photo, view, drawn } = usePicture(id);
    const flipped = flippedFor(progress.goal?.count ?? progress.right, progress.goal?.target ?? TILES);
    const gone = new Set(order.slice(0, flipped));
    const done = flipped >= TILES;

    if (!question) return <div className="pr-root" />;
    const flash = phase === 'right' || phase === 'wrong';

    return (
        <div className={`pr-root${phase === 'help' ? ' is-paused' : ''}${reducedMotion ? ' is-still' : ''}${done ? ' is-done' : ''}`}>
            <div className="pr-world">
                <div className={`pr-stage${photo ? ' has-credit' : ''}`}>
                    <PrentPicture prent={drawn} photo={view} gone={gone} />
                    {/* Room for the credit is kept from the start, so the picture does not jump at the reveal. */}
                    {photo && <p className="pr-credit" aria-hidden={!done}>{photoCredit(photo)}</p>}
                </div>
            </div>
            <div className="pr-panel">
                <SpelSignBox className={`pr-sign${flash ? ' is-solved' : ''}`} question={question} feedback={feedback} flash={flash} answerClassName="pr-sign-answer" />
                <SpelKeypad questionKey={question.key} onAnswer={onAnswer} disabled={phase !== 'play'} />
            </div>
        </div>
    );
}

/** The end screen: the whole picture, whatever the score, with the photographer's credit. */
export function PrentEnding({ reducedMotion }: SkinEndingProps) {
    const { photo, view, drawn } = usePicture(current ?? lastPrent());
    return (
        <div className={`spel-ending pr-ending${photo ? ' is-photo' : ''}${reducedMotion ? ' is-still' : ''}`}>
            <div className={`pr-stage${photo ? ' has-credit' : ''}`}>
                <PrentPicture prent={drawn} photo={view} gone="all" label={`De prent: ${photo ? photo.alt : drawn.label}`} />
                {photo && <p className="pr-credit">{photoCredit(photo)}</p>}
            </div>
        </div>
    );
}
