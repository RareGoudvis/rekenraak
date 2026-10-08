import { Section, Segmented, Slider, Toggle, TextField, Hint, Button, ButtonRow } from './controls';
import { PaletteRow } from './mathControls';
import { useSetProps } from './baseProps';
import { positietabelProps, POSITIE_PLAATSEN, PLACE_GROUPS } from '../mathTools/positietabel';
import { TOOL_COLORS } from '../mathTools/shared';
import type { BoardWidget } from '../boardTypes';

// Column presets for the common grades: E-T-H (L1-2), up to D/TD (L3-4), millions, decimals.
const PRESETS: ReadonlyArray<{ label: string; keys: string[] }> = [
    { label: 'H T E', keys: ['H', 'T', 'E'] },
    { label: 'tot D', keys: ['D', 'H', 'T', 'E'] },
    { label: 'tot HD', keys: ['HD', 'TD', 'D', 'H', 'T', 'E'] },
    { label: 'tot Mrd', keys: ['Mrd', 'HM', 'TM', 'M', 'HD', 'TD', 'D', 'H', 'T', 'E'] },
    { label: 'kommagetal', keys: ['T', 'E', 't', 'h', 'd'] },
];

export default function PositietabelSettings({ widget }: { widget: BoardWidget }) {
    const set = useSetProps(widget);
    const p = positietabelProps(widget);
    const rawNumber = typeof widget.props?.number === 'string' ? widget.props.number : '';
    const toggleCol = (key: string) => {
        const next = p.columns.includes(key) ? p.columns.filter(c => c !== key) : [...p.columns, key];
        if (next.length) set({ columns: next });
    };
    const groupsShown = PLACE_GROUPS.filter(g => POSITIE_PLAATSEN.some(k => k.group === g && p.columns.includes(k.key)));

    return (
        <>
            <Section title="Plaatsen">
                <div role="group" aria-label="Kolommen" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {POSITIE_PLAATSEN.map(k => (
                        <Button key={k.key} pressed={p.columns.includes(k.key)} onClick={() => toggleCol(k.key)} label={`Kolom ${k.name}`}>{k.label}</Button>
                    ))}
                </div>
                <ButtonRow>
                    {PRESETS.map(pr => <Button key={pr.label} onClick={() => set({ columns: pr.keys })}>{pr.label}</Button>)}
                </ButtonRow>
                <Slider label="Rijen" value={p.rows} min={1} max={8} onChange={(v) => set({ rows: v })} />
            </Section>
            <Section title="Kop">
                <Segmented label="Kolomnamen" value={p.header} onChange={(v) => set({ header: v })}
                    options={[{ value: 'afkorting', label: 'H T E' }, { value: 'naam', label: 'Naam' }, { value: 'beide', label: 'Beide' }, { value: 'geen', label: 'Geen' }]} />
                <Toggle label="Klassen erboven (duizenden, eenheden …)" checked={p.showGroups} onChange={(v) => set({ showGroups: v })} />
            </Section>
            <Section title="Kleur">
                <Segmented label="Kopkleur" value={p.colorMode} onChange={(v) => set({ colorMode: v })}
                    options={[{ value: 'zalm', label: 'Zalm' }, { value: 'groepen', label: 'Per klasse' }, { value: 'geen', label: 'Wit' }]} />
                {p.colorMode === 'groepen' && groupsShown.map(g => (
                    <PaletteRow key={g} label={g} value={p.groupColors[g]} palette={TOOL_COLORS}
                        onChange={(v) => set({ groupColors: { ...p.groupColors, [g]: v } })} />
                ))}
            </Section>
            <Section title="Getal en cijfers">
                <TextField label="Getal in de eerste rij (leeg = lege tabel)" value={rawNumber} placeholder="bv. 3 408 of 12,75"
                    onChange={(v) => set({ number: v.replace(/\s/g, '') })} />
                {rawNumber !== '' && p.number === '' && <Hint>Geen geldig getal: enkel cijfers en één komma (max. 3 decimalen).</Hint>}
                <Toggle label="Cellen invulbaar (tik en typ een cijfer)" checked={p.editable} onChange={(v) => set({ editable: v })} />
                <Segmented label="Cijfergrootte" value={p.digitSize <= 20 ? 20 : p.digitSize <= 30 ? 30 : 40} onChange={(v) => set({ digitSize: v })}
                    options={[{ value: 20, label: 'Normaal' }, { value: 30, label: 'Groot' }, { value: 40, label: 'Heel groot' }]} />
                <ButtonRow>
                    <Button onClick={() => set({ cells: {} })}>Wis getypte cijfers ({Object.keys(p.cells).length})</Button>
                </ButtonRow>
            </Section>
        </>
    );
}
