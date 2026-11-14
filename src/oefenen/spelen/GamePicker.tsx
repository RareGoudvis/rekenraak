import { useState } from 'react';
import { Timer, Users } from '@phosphor-icons/react';
import { SKINS } from './skins/registry';
import type { SkinMeta } from './skins/types';
import { NUMBER_CONTENT, skinsFor, type SpelContent } from './accepts';
import { SEASON_LABEL, pickerToday, seasonsOn } from './seasons';
import SpelOptions from './SpelOptions';
import './spelen.css';

interface Props {
    onPick(meta: SkinMeta): void;
    // What the chosen card asks of a game; only the skins that accept it are shown. Absent = whole numbers.
    content?: SpelContent;
    // The day for the seasonal shelf (tests); absent = today (pickerToday).
    today?: Date;
}

type Tile = (typeof SKINS)[number];

function GameTile({ tile: { meta, icon: Icon, Component, Screen }, onPick, tag }: { tile: Tile; onPick(meta: SkinMeta): void; tag?: string }) {
    const ready = !!(Component || Screen);
    return (
        <button type="button" className={`spel-tile${ready ? '' : ' is-soon'}`} disabled={!ready} onClick={() => onPick(meta)}
            aria-label={`${meta.label}${meta.timed ? ', op tijd' : ''}${meta.players === 2 ? ', 2 spelers' : ''}${ready ? '' : ', binnenkort'}`}>
            <Icon className="spel-tile-icon" weight="duotone" aria-hidden />
            <span className="spel-tile-label">{meta.label}</span>
            {meta.timed && <span className="spel-tile-timed"><Timer weight="bold" aria-hidden /> op tijd</span>}
            {meta.players === 2 && <span className="spel-tile-timed"><Users weight="bold" aria-hidden /> 2 spelers</span>}
            {tag && <span className="spel-tile-season">{tag}</span>}
            {!ready && <span className="spel-tile-soon">binnenkort</span>}
        </button>
    );
}

// One tile per skin that accepts the chosen content (the others stay hidden); a clock marks timed games.
// In-season games also sit on a "Nu extra leuk" shelf on top; every game is always playable.
// A skin with options (meta.options) first shows its pre-start screen; onPick then gets the resolved meta.
export default function GamePicker({ onPick, content = NUMBER_CONTENT, today }: Props) {
    const [setup, setSetup] = useState<SkinMeta | null>(null);
    if (setup) return <SpelOptions meta={setup} onStart={onPick} onBack={() => setSetup(null)} />;
    const tiles = skinsFor(SKINS, content);
    const now = seasonsOn(today ?? pickerToday());
    const extra = tiles.filter(t => t.meta.season && now.includes(t.meta.season));
    const pick = (meta: SkinMeta) => (meta.options?.length ? setSetup(meta) : onPick(meta));
    const all = (
        <div className="spel-tiles" role="group" aria-label="Kies een spel">
            {tiles.map(t => <GameTile key={t.meta.id} tile={t} onPick={pick} />)}
        </div>
    );
    if (!extra.length) return all;
    return (
        <div className="spel-shelves">
            <section className="spel-shelf is-extra" aria-labelledby="spel-shelf-extra">
                <h2 id="spel-shelf-extra" className="spel-shelf-title">Nu extra leuk</h2>
                <div className="spel-tiles spel-shelf-tiles" role="group" aria-label="Nu extra leuk">
                    {extra.map(t => <GameTile key={t.meta.id} tile={t} onPick={pick} tag={t.meta.season && SEASON_LABEL[t.meta.season]} />)}
                </div>
            </section>
            <section className="spel-shelf" aria-labelledby="spel-shelf-all">
                <h2 id="spel-shelf-all" className="spel-shelf-title">Alle spellen</h2>
                {all}
            </section>
        </div>
    );
}
