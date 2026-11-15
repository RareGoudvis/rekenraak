import { useEffect, useId, useRef, useState } from 'react';
import { CaretRight, Timer, Users } from '@phosphor-icons/react';
// Labels, icons and thumbnails only: the registry's skin components are lazy, so nothing of a game loads here.
import type { SKINS } from '../spelen/skins/registry';
import GameThumb from '../spelen/GameThumb';
import { gameBlurb } from './gameBlurbs';
import type { GameCardOf } from './topicGames';

type Skin = (typeof SKINS)[number];

const marksOf = (meta: Skin['meta']) => `${meta.timed ? ', op tijd' : ''}${meta.players === 2 ? ', 2 spelers' : meta.players === '1-2' ? ', 1 of 2 spelers' : ''}`;

interface Props {
    games: GameCardOf[];
    onPlay(skin: Skin): void;
}

// "Of speel een spel": one row of picture cards (thumbnail, name) of every game that plays the chosen oefening.
// A tap starts it; more cards scroll sideways (an arrow for a mouse, a finger just swipes).
export default function GameRow({ games, onPlay }: Props) {
    const uid = useId();
    const rowRef = useRef<HTMLDivElement>(null);
    const [more, setMore] = useState(false);
    useEffect(() => {
        const row = rowRef.current;
        if (!row) return;
        const check = () => setMore(row.scrollLeft + row.clientWidth < row.scrollWidth - 48);
        check();
        row.addEventListener('scroll', check, { passive: true });
        window.addEventListener('resize', check);
        return () => { row.removeEventListener('scroll', check); window.removeEventListener('resize', check); };
    }, [games.length]);
    const scrollOn = () => {
        const row = rowRef.current;
        const smooth = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        row?.scrollBy?.({ left: row.clientWidth * 0.75, behavior: smooth ? 'smooth' : 'auto' });
    };
    if (!games.length) return null;
    return (
        <div className="zelf-play">
            <div ref={rowRef} className="zelf-play-row" role="group" aria-label="Kies een spel">
                {games.map(({ skin, nu }, n) => {
                    const { meta } = skin;
                    const blurb = gameBlurb(meta.id, meta.label);
                    const why = `${uid}-w${n}`;
                    return (
                        <button key={meta.id} type="button" className="zelf-play-tile" title={blurb === meta.label ? undefined : blurb}
                            aria-label={`${meta.label}${marksOf(meta)}${nu ? ', nu extra leuk' : ''}`}
                            aria-describedby={blurb === meta.label ? undefined : why} onClick={() => onPlay(skin)}>
                            <GameThumb skin={skin} />
                            {nu && <span className="zelf-play-nu" aria-hidden>nu!</span>}
                            {(meta.timed || meta.players) && (
                                <span className="zelf-play-marks" aria-hidden>
                                    {meta.timed && <span className="zelf-play-mark"><Timer weight="bold" /></span>}
                                    {meta.players && <span className="zelf-play-mark"><Users weight="bold" /></span>}
                                </span>
                            )}
                            <span className="zelf-play-title" aria-hidden>{meta.label}</span>
                            {blurb !== meta.label && <span id={why} hidden>{blurb}</span>}
                        </button>
                    );
                })}
            </div>
            {more && <button type="button" className="zelf-play-more" aria-label="Meer spellen" onClick={scrollOn}><CaretRight weight="bold" aria-hidden /></button>}
        </div>
    );
}
