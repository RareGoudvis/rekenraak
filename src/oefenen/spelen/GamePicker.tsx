import { Timer, Users } from '@phosphor-icons/react';
import { SKINS } from './skins/registry';
import type { SkinMeta } from './skins/types';
import './spelen.css';

interface Props {
    onPick(meta: SkinMeta): void;
}

// One tile per registered skin; a skin without a component yet is shown as binnenkort. A clock marks timed games.
export default function GamePicker({ onPick }: Props) {
    return (
        <div className="spel-tiles" role="group" aria-label="Kies een spel">
            {SKINS.map(({ meta, icon: Icon, Component, Screen }) => (
                <button key={meta.id} type="button" className={`spel-tile${Component || Screen ? '' : ' is-soon'}`} disabled={!Component && !Screen}
                    onClick={() => onPick(meta)} aria-label={`${meta.label}${meta.timed ? ', op tijd' : ''}${meta.players === 2 ? ', 2 spelers' : ''}${Component || Screen ? '' : ', binnenkort'}`}>
                    <Icon className="spel-tile-icon" weight="duotone" aria-hidden />
                    <span className="spel-tile-label">{meta.label}</span>
                    {meta.timed && <span className="spel-tile-timed"><Timer weight="bold" aria-hidden /> op tijd</span>}
                    {meta.players === 2 && <span className="spel-tile-timed"><Users weight="bold" aria-hidden /> 2 spelers</span>}
                    {!Component && !Screen && <span className="spel-tile-soon">binnenkort</span>}
                </button>
            ))}
        </div>
    );
}
