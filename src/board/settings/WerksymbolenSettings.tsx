import { useState } from 'react';
import { Section, Segmented, Slider, Toggle, ListEditor, ItemInput, ItemRow, ColorDot, IconPicker, Button, ButtonRow, Hint, TextField } from './controls';
import { useSetProps } from './baseProps';
import { werksymbolenModel, tapSymbol, WS_ICONS, BUILT_IN_SETS, loadWerksets, saveWerkset, deleteWerkset, type WerkSymbol, type WerkSet } from './werksymbolenModel';
import { rndId, type BoardWidget } from '../boardTypes';

export default function WerksymbolenSettings({ widget }: { widget: BoardWidget }) {
    const set = useSetProps(widget);
    const m = werksymbolenModel(widget);
    const [sets, setSets] = useState<WerkSet[]>(loadWerksets);
    const [setName, setSetName] = useState('');
    const [msg, setMsg] = useState<string | null>(null);

    const applySet = (s: WerkSet) => set({ symbols: s.symbols.map(x => ({ ...x })), active: m.multi ? [] : s.symbols[0]?.key, title: s.name });

    return (
        <>
            <Section title="Nu actief">
                <ButtonRow>
                    {m.symbols.map(s => (
                        <Button key={s.key} pressed={m.active.includes(s.key)} onClick={() => set({ active: tapSymbol(m, s.key) })}>
                            {s.label || WS_ICONS[s.icon]?.name}
                        </Button>
                    ))}
                </ButtonRow>
                <Toggle label="Meerdere tegelijk actief" checked={m.multi} onChange={(v) => set({ multi: v, active: v ? m.active : m.active[0] ?? m.symbols[0]?.key })} />
                <Toggle label="Enkel het actieve symbool tonen" checked={m.onlyActive} onChange={(v) => set({ onlyActive: v })} />
            </Section>
            <Section title="Symbolen">
                <ListEditor<WerkSymbol>
                    label="Lijst" items={m.symbols} min={1} addLabel="Symbool toevoegen"
                    newItem={() => ({ key: rndId(), label: 'Nieuw symbool', icon: 'ster', color: null })}
                    itemName={(s) => s.label || 'symbool'}
                    onChange={(symbols) => set({ symbols })}
                    renderItem={(s, update, i) => (
                        <ItemRow>
                            <IconPicker label={`Icoon symbool ${i + 1}`} value={s.icon} icons={WS_ICONS} onChange={(icon) => update({ ...s, icon })} />
                            <ColorDot label={`Kleur symbool ${i + 1}`} value={s.color} onChange={(color) => update({ ...s, color })} />
                            <ItemInput label={`Naam symbool ${i + 1}`} value={s.label} onChange={(label) => update({ ...s, label })} />
                        </ItemRow>
                    )}
                />
                <Hint>De kleur is de kleur van een actief symbool (standaard rood).</Hint>
            </Section>
            <Section title="Weergave">
                <Segmented label="Schikking" value={m.layout} onChange={(v) => set({ layout: v })}
                    options={[{ value: 'raster', label: 'Raster' }, { value: 'rij', label: 'Eén rij' }, { value: 'kolom', label: 'Kolom' }]} />
                {m.layout === 'raster' && <Slider label="Kolommen" value={m.columns} min={2} max={5} onChange={(v) => set({ columns: v })} />}
                <Segmented label="Grootte" value={m.size} onChange={(v) => set({ size: v })}
                    options={[{ value: 'klein', label: 'Klein' }, { value: 'normaal', label: 'Normaal' }, { value: 'groot', label: 'Groot' }]} />
                <Toggle label="Naam tonen" checked={m.showLabel} onChange={(v) => set({ iconOnly: !v })} />
            </Section>
            <Section title="Sets">
                <ButtonRow>
                    {BUILT_IN_SETS.map(s => <Button key={s.name} onClick={() => applySet(s)}>{s.name}</Button>)}
                </ButtonRow>
                {sets.length > 0 && (
                    <ButtonRow>
                        {sets.map(s => (
                            <span key={s.name} style={{ display: 'inline-flex', gap: '2px' }}>
                                <Button onClick={() => applySet(s)}>{s.name}</Button>
                                <Button danger label={`Set ${s.name} verwijderen`} onClick={() => setSets(deleteWerkset(s.name))}>×</Button>
                            </span>
                        ))}
                    </ButtonRow>
                )}
                <TextField label="Naam voor deze set" value={setName} placeholder="bv. Hoekenwerk" onChange={setSetName} />
                <ButtonRow>
                    <Button onClick={() => {
                        const next = saveWerkset(setName, m.symbols);
                        if (next) { setSets(next); setMsg(`Set "${setName.trim() || 'Mijn set'}" bewaard.`); setSetName(''); } else setMsg('Kon niet bewaren (opslag vol?).');
                    }}>Bewaar symbolen als set</Button>
                </ButtonRow>
                <Hint>{msg ?? 'Een set kiezen vervangt de symbolen en de titel. Jouw sets gelden voor alle borden.'}</Hint>
            </Section>
        </>
    );
}
