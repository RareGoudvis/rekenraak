import { useId, useState } from 'react';
import { GameController, PencilSimple } from '@phosphor-icons/react';
import type { SKINS } from '../spelen/skins/registry';
import GameThumb from '../spelen/GameThumb';
import { oefenThumbOf } from './topicGames';
import { topicIcon } from './topicIcons';

const HAS_GAME = 'Er zijn spelletjes';
const HAS_OEFEN = 'Je kan oefenen';

/** A topic's Oefenmodus picture; until it loads, or when it is missing, the topic's icon on its section colour. */
function OefenThumb({ id, label }: { id: string; label: string }) {
    const [broken, setBroken] = useState(false);
    const { icon, size } = topicIcon(id, label);
    return (
        <span className="zelf-topic-thumb is-oefen" aria-hidden>
            <span className={`zelf-badge is-xl${size}`}>{icon}</span>
            {!broken && <img src={oefenThumbOf(id)} alt="" width={480} height={300} loading="lazy" decoding="async" draggable={false} onError={() => setBroken(true)} />}
        </span>
    );
}

interface Props {
    id: string;
    label: string;
    // The game whose picture fits the topic at this leerjaar (topicGames.ts); null = its Oefenmodus picture.
    game: (typeof SKINS)[number] | null;
    // A game plays one of its choices at this leerjaar: the controller sticker.
    hasGame: boolean;
    disabled: boolean;
    onPick(): void;
}

// A topic on the topics screen: a picture on top (a game that plays it, or its exercise screen), the name below,
// small stickers for "games" and "oefenen" in the picture's corner. The name stays the button's whole name.
export default function TopicCard({ id, label, game, hasGame, disabled, onPick }: Props) {
    const uid = useId();
    return (
        <button type="button" className="zelf-topic" data-topic={id} disabled={disabled} onClick={onPick} aria-describedby={`${uid}-d`}>
            <span className="zelf-topic-pic" aria-hidden>
                {game ? <GameThumb skin={game} className="zelf-topic-thumb" /> : <OefenThumb id={id} label={label} />}
                <span className="zelf-topic-marks">
                    {hasGame && <span className="zelf-topic-mark is-game" title={HAS_GAME}><GameController weight="fill" /></span>}
                    <span className="zelf-topic-mark is-oefen" title={HAS_OEFEN}><PencilSimple weight="fill" /></span>
                </span>
            </span>
            <span className="zelf-topic-title">{label}</span>
            <span id={`${uid}-d`} hidden>{hasGame ? `${HAS_GAME}. ${HAS_OEFEN}.` : `${HAS_OEFEN}.`}</span>
        </button>
    );
}
