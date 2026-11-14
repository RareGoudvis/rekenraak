import { useState } from 'react';
import { Timer } from '@phosphor-icons/react';
import { SKINS } from './skins/registry';
import type { SkinMeta } from './skins/types';
import SpelOptions from './SpelOptions';
import './spelen.css';

interface Props {
    onPick(meta: SkinMeta): void;
}

// One tile per registered skin; a skin without a component yet is shown as binnenkort. A clock marks timed games.
// A skin with options (meta.options) first shows its pre-start screen; onPick then gets the resolved meta.
export default function GamePicker({ onPick }: Props) {
    const [setup, setSetup] = useState<SkinMeta | null>(null);
    if (setup) return <SpelOptions meta={setup} onStart={onPick} onBack={() => setSetup(null)} />;
    return (
        <div className="spel-tiles" role="group" aria-label="Kies een spel">
            {SKINS.map(({ meta, icon: Icon, Component }) => (
                <button key={meta.id} type="button" className={`spel-tile${Component ? '' : ' is-soon'}`} disabled={!Component}
                    onClick={() => (meta.options?.length ? setSetup(meta) : onPick(meta))} aria-label={`${meta.label}${meta.timed ? ', op tijd' : ''}${Component ? '' : ', binnenkort'}`}>
                    <Icon className="spel-tile-icon" weight="duotone" aria-hidden />
                    <span className="spel-tile-label">{meta.label}</span>
                    {meta.timed && <span className="spel-tile-timed"><Timer weight="bold" aria-hidden /> op tijd</span>}
                    {!Component && <span className="spel-tile-soon">binnenkort</span>}
                </button>
            ))}
        </div>
    );
}
