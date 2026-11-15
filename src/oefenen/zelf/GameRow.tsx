import { useId } from 'react';
import { Timer, Users } from '@phosphor-icons/react';
// Labels, icons and thumbnails only: the registry's skin components are lazy, so nothing of a game loads here.
import type { SKINS } from '../spelen/skins/registry';
import GameThumb from '../spelen/GameThumb';
import { gameBlurb } from './gameBlurbs';
import { groupGames, type GameCardOf } from './topicGames';

type Skin = (typeof SKINS)[number];

const marksOf = (meta: Skin['meta']) => `${meta.timed ? ', op tijd' : ''}${meta.players === 2 ? ', 2 spelers' : meta.players === '1-2' ? ', 1 of 2 spelers' : ''}`;

interface Props {
    games: GameCardOf[];
    onPlay(skin: Skin): void;
}

// "Of speel een spel": picture cards (thumbnail, name) of every game that plays the chosen oefening, in a grid per category.
// A tap starts it.
export default function GameRow({ games, onPlay }: Props) {
    const uid = useId();
    if (!games.length) return null;
    let n = 0;
    return (
        <div className="zelf-play" role="group" aria-label="Kies een spel">
            {groupGames(games).map(group => (
                <section key={group.id} className="zelf-play-group" aria-labelledby={`${uid}-g-${group.id}`}>
                    <h3 id={`${uid}-g-${group.id}`} className="zelf-play-head">{group.label}</h3>
                    <div className="zelf-play-grid">
                        {group.games.map(({ skin, nu }) => {
                            const { meta } = skin;
                            const blurb = gameBlurb(meta.id, meta.label);
                            const why = `${uid}-w${n++}`;
                            return (
                                <button key={meta.id} type="button" className="zelf-play-tile" title={blurb === meta.label ? undefined : blurb}
                                    aria-label={`${meta.label}${marksOf(meta)}${nu ? ', nu extra leuk' : ''}`}
                                    aria-describedby={blurb === meta.label ? undefined : why} onClick={() => onPlay(skin)}>
                                    <GameThumb skin={skin} />
                                    {nu && <span className="zelf-play-nu" aria-hidden>nu!</span>}
                                    {(meta.timed || meta.players) && (
                                        <span className="zelf-play-marks" aria-hidden>
                                            {meta.timed && <span className="zelf-play-mark is-timer"><Timer weight="bold" /></span>}
                                            {meta.players && <span className="zelf-play-mark is-players"><Users weight="bold" /></span>}
                                        </span>
                                    )}
                                    <span className="zelf-play-title" aria-hidden>{meta.label}</span>
                                    {blurb !== meta.label && <span id={why} hidden>{blurb}</span>}
                                </button>
                            );
                        })}
                    </div>
                </section>
            ))}
        </div>
    );
}
