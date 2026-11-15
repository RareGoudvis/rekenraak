import { useState } from 'react';
import { ArrowUUpLeft, Play } from '@phosphor-icons/react';
import type { SkinMeta } from './skins/types';
import { loadChoices, resolveMeta, saveChoices } from './skins/options';
import { skinById } from './skins/registry';
import GameThumb from './GameThumb';

interface Props {
    meta: SkinMeta;
    // The meta the round starts with (picks recorded, round patched).
    onStart(meta: SkinMeta): void;
    onBack(): void;
}

// The pre-start screen of a skin with options: one row of big buttons per option, the last pick (or the
// default) already chosen, so one tap on Start is enough.
export default function SpelOptions({ meta, onStart, onBack }: Props) {
    const [chosen, setChosen] = useState(() => loadChoices(meta));
    const start = () => { saveChoices(meta.id, chosen); onStart(resolveMeta(meta, chosen)); };
    const skin = skinById(meta.id);
    return (
        <section className="spel-options" aria-labelledby="spel-options-title">
            {/* The game's picture above its name, as on the game cards. */}
            {skin && <GameThumb skin={skin} className="zelf-play-thumb spel-options-thumb" />}
            <h2 id="spel-options-title" className="spel-options-title">{meta.label}</h2>
            {meta.options?.filter(o => !o.when || chosen[o.when.id] === o.when.value).map(o => (
                <div key={o.id} className="spel-option">
                    <p className="spel-option-label" id={`spel-opt-${o.id}`}>{o.label}</p>
                    <div role="group" aria-labelledby={`spel-opt-${o.id}`} className="zelf-grid spel-option-choices">
                        {o.choices.map(c => {
                            const picked = chosen[o.id] === c.value;
                            return (
                                <button key={c.value} type="button" aria-pressed={picked} className={`zelf-choice zelf-choice-big${picked ? ' is-picked' : ''}`}
                                    onClick={() => setChosen(p => ({ ...p, [o.id]: c.value }))}>{c.label}</button>
                            );
                        })}
                    </div>
                </div>
            ))}
            <button type="button" className="kiosk-btn kiosk-btn-primary kiosk-btn-big spel-options-start" onClick={start} autoFocus>
                <Play weight="fill" aria-hidden /> Start
            </button>
            <button type="button" className="kiosk-btn" onClick={onBack}>
                <ArrowUUpLeft aria-hidden /> Ander spel
            </button>
        </section>
    );
}
