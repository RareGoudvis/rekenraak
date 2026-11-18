import { ArrowUUpLeft, Play } from '@phosphor-icons/react';
import { useState } from 'react';
import type { SkinMeta } from './skins/types';
import { loadChoices, resolveMeta, saveChoices } from './skins/options';
import { skinById } from './skins/registry';
import GameThumb from './GameThumb';
import LevelIcon from './levels/LevelIcon';
import { tintOf } from './thumbs';
import { usePillWrap } from '../kiosk/pillWrap';

interface Props {
    meta: SkinMeta;
    // The game's one-line description under its name; empty = none.
    blurb?: string;
    // What the game plays ("Optellen: Met brug"), a small line under the blurb.
    note?: string;
    // The meta the round starts with (picks recorded, round patched).
    onStart(meta: SkinMeta): void;
    onBack(): void;
}

// The pre-start screen of a skin with options, drawn as the start of that game: its picture, name and line on top,
// one compact row of segments per option (the last pick or the default already chosen), then Start spel.
export default function SpelOptions({ meta, blurb, note, onStart, onBack }: Props) {
    const [chosen, setChosen] = useState(() => loadChoices(meta));
    const start = () => { saveChoices(meta.id, chosen); onStart(resolveMeta(meta, chosen)); };
    const skin = skinById(meta.id);
    const noteRef = usePillWrap<HTMLParagraphElement>();
    const shown = meta.options?.filter(o => !o.when || chosen[o.when.id] === o.when.value) ?? [];
    // The half-line options pair up; an odd last one gets the whole line, so its longer labels never wrap.
    const halves = shown.filter(o => !o.wide);
    const alone = halves.length > 1 && halves.length % 2 === 1 ? halves[halves.length - 1].id : null;
    return (
        <section className="spel-options" aria-labelledby="spel-options-title" style={{ '--tint': tintOf(meta.id) } as React.CSSProperties}>
            <div className="spel-options-hero">
                {skin && <GameThumb skin={skin} className="zelf-play-thumb spel-options-thumb" />}
                <div className="spel-options-text">
                    <h2 id="spel-options-title" className="spel-options-title">{meta.label}</h2>
                    {blurb && <p className="spel-options-blurb">{blurb}</p>}
                    {note && <p ref={noteRef} className="spel-options-note">{note}</p>}
                </div>
            </div>
            {shown.length > 0 && (
                <div className={`spel-options-panel${shown.length > 2 ? ' is-many' : ''}`}>
                    {shown.map(o => (
                        <div key={o.id} className={`kid-option${o.wide ? ' is-wide' : ''}${o.id === alone ? ' is-alone' : ''}`}>
                            <p className="kid-option-label" id={`spel-opt-${o.id}`}>{o.label}</p>
                            <div role="group" aria-labelledby={`spel-opt-${o.id}`} className="kid-seg">
                                {o.choices.map(c => (
                                    <button key={c.value} type="button" aria-pressed={chosen[o.id] === c.value} className="kid-seg-btn"
                                        onClick={() => setChosen(p => ({ ...p, [o.id]: c.value }))}>{c.icon && <LevelIcon icon={c.icon} />}{c.label}</button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <div className="spel-options-actions">
                <button type="button" className="kiosk-btn kiosk-btn-quiet" onClick={onBack}>
                    <ArrowUUpLeft aria-hidden /> Ander spel
                </button>
                <button type="button" className="kiosk-btn kiosk-btn-primary kiosk-btn-big spel-options-start" onClick={start} autoFocus>
                    <Play weight="fill" aria-hidden /> Start spel
                </button>
            </div>
        </section>
    );
}
