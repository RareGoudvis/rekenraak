import { useState } from 'react';
// Labels, icons and thumbnails only: the registry's skin components are lazy, so nothing of a game loads here.
import { SKINS } from './skins/registry';
import { thumbOf } from './thumbs';

type Skin = (typeof SKINS)[number];

// Colours follow the registry order, so a game keeps its colour wherever it sits.
const tintOf = (id: string) => `var(--kid-tint-${(Math.max(0, SKINS.findIndex(s => s.meta.id === id)) % 6) + 1})`;

/** A game's picture: its thumbnail; until it loads, or when it is missing, its icon on a coloured panel. */
export default function GameThumb({ skin, className = 'zelf-play-thumb' }: { skin: Skin; className?: string }) {
    const [broken, setBroken] = useState(false);
    const { meta, icon: Icon } = skin;
    return (
        <span className={className} style={{ '--tint': tintOf(meta.id) } as React.CSSProperties} aria-hidden>
            <Icon className="zelf-play-icon" weight="duotone" />
            {!broken && <img src={thumbOf(meta.id)} alt="" width={480} height={300} loading="lazy" decoding="async" draggable={false} onError={() => setBroken(true)} />}
        </span>
    );
}
