import { useState, type ReactNode } from 'react';
import { CaretDown } from '@phosphor-icons/react';
import type { Leerjaar } from '../../config/gradePresets';
import type { ZelfChoice } from '../../oefenen/zelf/zelfSessie';
import { FRANS_DIRS, FRANS_DIR_LABELS, FRANS_MODES_ORDER, FRANS_MODE_LABELS, VERB_GROUPS, verbsOfGroup } from './fransCards';
import { NUMBER_SETS, NUMBER_WAYS, WORD_WAYS } from './woordCards';
import { groupIsOn, readPicks, savePicks, setGroup, toggleGroup, toggleList, toggleVerb, type FransPicks } from './fransPicks';
import { fransChoiceOf, type FransTopic } from './fransZelf';
import type { VerbGroup } from './verbs';
import './frans.css';

// The options screens of the three Frans cards (owner 2026-11-18): the game options' look (labels over segments),
// toggles where several may be on, the device's last pick already chosen; every change makes the Keuze screen's choice.

interface SubjectOptionsProps {
    grade: Leerjaar;
    onChoice(choice: ZelfChoice): void;
}

function usePicks(topic: FransTopic, { grade, onChoice }: SubjectOptionsProps): [FransPicks, (next: FransPicks) => void] {
    const [picks, setPicks] = useState(readPicks);
    const update = (next: FransPicks) => { setPicks(next); savePicks(next); onChoice(fransChoiceOf(topic, next, grade)); };
    return [picks, update];
}

// One option row: its label over a segmented choice (kiosk.css .kid-seg); stack = one segment per line on a phone.
function Seg<T extends string>({ id, label, options, value, onPick, stack }: {
    id: string; label: string; value: T; stack?: boolean;
    options: readonly { value: T; label: string; short?: string }[]; onPick(v: T): void;
}) {
    return (
        <div className="kid-option">
            <p className="kid-option-label" id={id}>{label}</p>
            <div role="group" aria-labelledby={id} className={`kid-seg${stack ? ' fr-seg-stack' : ''}`}>
                {options.map(o => (
                    <button key={o.value} type="button" className="kid-seg-btn" aria-pressed={o.value === value}
                        aria-label={o.short ? o.label : undefined} onClick={() => onPick(o.value)}>{o.short ?? o.label}</button>
                ))}
            </div>
        </div>
    );
}

// Toggles where several may be on (verb groups, verbs, dagen / maanden): pills that wrap.
const Chip = ({ on, onClick, children, small }: { on: boolean; onClick(): void; children: ReactNode; small?: boolean }) => (
    <button type="button" className={`fr-chip${small ? ' is-small' : ''}`} aria-pressed={on} onClick={onClick}>{children}</button>
);

const Panel = ({ children }: { children: ReactNode }) => <section className="zelf-step fr-options" aria-label="Wat wil je oefenen?">{children}</section>;

function VerbOptions(props: SubjectOptionsProps) {
    const [picks, update] = usePicks('werkwoorden', props);
    const p = picks.werkwoorden;
    const set = (next: typeof p) => update({ ...picks, werkwoorden: next });
    // The verb lists fold open per group (closed at first, so a phone sees Hoe? and Richting without scrolling far).
    const [open, setOpen] = useState<Partial<Record<VerbGroup, boolean>>>({});
    return (
        <Panel>
            <div className="kid-option">
                <p className="kid-option-label" id="fr-opt-groups">Welke werkwoorden?</p>
                <div role="group" aria-labelledby="fr-opt-groups" className="fr-chips">
                    {VERB_GROUPS.map(g => <Chip key={g.group} on={groupIsOn(p, g.group)} onClick={() => set(toggleGroup(p, g.group))}>{g.label}</Chip>)}
                </div>
                {VERB_GROUPS.filter(g => groupIsOn(p, g.group)).map(g => {
                    const own = verbsOfGroup(g.group);
                    const on = own.filter(v => p.verbs.includes(v)).length;
                    const isOpen = !!open[g.group];
                    return (
                        <div key={g.group} className="fr-group">
                            <button type="button" className="fr-fold" aria-expanded={isOpen} aria-controls={`fr-verbs-${g.group}`}
                                onClick={() => setOpen(o => ({ ...o, [g.group]: !isOpen }))}>
                                <span>{g.label}: {on === own.length ? 'alle' : `${on} van ${own.length}`}</span>
                                <CaretDown weight="bold" aria-hidden className="fr-fold-caret" />
                            </button>
                            {isOpen && (
                                <div id={`fr-verbs-${g.group}`} className="fr-verbs">
                                    <div role="group" aria-label={`Werkwoorden ${g.label}`} className="fr-chips">
                                        {own.map(v => <Chip key={v} small on={p.verbs.includes(v)} onClick={() => set(toggleVerb(p, v))}>{v}</Chip>)}
                                    </div>
                                    <div className="fr-verbs-quick">
                                        <button type="button" className="kiosk-btn" onClick={() => set(setGroup(p, g.group, true))}>Alles aan</button>
                                        <button type="button" className="kiosk-btn" onClick={() => set(setGroup(p, g.group, false))}>Alles uit</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            <Seg id="fr-opt-hoe" label="Hoe?" stack value={p.mode} onPick={mode => set({ ...p, mode })}
                options={FRANS_MODES_ORDER.map(m => ({ value: m, label: FRANS_MODE_LABELS[m] }))} />
            <Seg id="fr-opt-richting" label="Richting" value={p.dir} onPick={dir => set({ ...p, dir })}
                options={FRANS_DIRS.map(d => ({ value: d, ...FRANS_DIR_LABELS[d] }))} />
        </Panel>
    );
}

function WordOptions(props: SubjectOptionsProps) {
    const [picks, update] = usePicks('woorden', props);
    const p = picks.woorden;
    const set = (next: typeof p) => update({ ...picks, woorden: next });
    return (
        <Panel>
            <div className="kid-option">
                <p className="kid-option-label" id="fr-opt-lists">Wat wil je oefenen?</p>
                <div role="group" aria-labelledby="fr-opt-lists" className="fr-chips">
                    <Chip on={p.dagen} onClick={() => set(toggleList(p, 'dagen'))}>Dagen</Chip>
                    <Chip on={p.maanden} onClick={() => set(toggleList(p, 'maanden'))}>Maanden</Chip>
                </div>
            </div>
            <Seg id="fr-opt-richting" label="Richting" value={p.dir} onPick={dir => set({ ...p, dir })} options={WORD_WAYS.map(w => ({ value: w.dir, label: w.label, short: w.short }))} />
        </Panel>
    );
}

function NumberOptions(props: SubjectOptionsProps) {
    const [picks, update] = usePicks('getallen', props);
    const p = picks.getallen;
    const set = (next: typeof p) => update({ ...picks, getallen: next });
    return (
        <Panel>
            <Seg id="fr-opt-getallen" label="Welke getallen?" stack value={p.set} onPick={s => set({ ...p, set: s })} options={NUMBER_SETS.map(n => ({ value: n.set, label: n.label }))} />
            <Seg id="fr-opt-richting" label="Richting" value={p.dir} onPick={dir => set({ ...p, dir })} options={NUMBER_WAYS.map(w => ({ value: w.dir, label: w.label, short: w.short }))} />
        </Panel>
    );
}

/** A Frans card's options screen; every change hands over the choice it makes. */
export default function FransOptions({ topic, ...props }: SubjectOptionsProps & { topic: FransTopic }) {
    if (topic === 'werkwoorden') return <VerbOptions {...props} />;
    if (topic === 'woorden') return <WordOptions {...props} />;
    return <NumberOptions {...props} />;
}
