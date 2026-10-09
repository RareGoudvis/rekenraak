import { Section, Segmented, Slider, Toggle, Hint, Button, ButtonRow } from './controls';
import { NumberField, PaletteRow } from './mathControls';
import { useSetProps } from './baseProps';
import { mabmatProps, MAB_KEYS, MAB_LABEL, MAB_VALUE, MAB_DEFAULT_COLORS, type MabKey } from '../mathTools/mabmat';
import { TOOL_COLORS } from '../mathTools/shared';
import type { BoardWidget } from '../boardTypes';

const PLACE_NAME: Record<MabKey, string> = { d: 'duizendtallen', h: 'honderdtallen', t: 'tientallen', e: 'eenheden' };
// The standard MAB hues first, then the board's pastels.
const PALETTE = [...Object.values(MAB_DEFAULT_COLORS), ...TOOL_COLORS];

export default function MabMatSettings({ widget }: { widget: BoardWidget }) {
    const set = useSetProps(widget);
    const m = mabmatProps(widget);
    const total = MAB_KEYS.reduce((s, k) => s + m.counts[k] * MAB_VALUE[k], 0);
    const togglePlace = (k: MabKey) => {
        const next = m.places.includes(k) ? m.places.filter(x => x !== k) : [...m.places, k];
        if (next.length) set({ places: next });
    };
    // Lays the number out as its digits: 2 304 → 2 D, 3 H, 0 T, 4 E.
    const build = (n: number) => {
        const v = Math.max(0, Math.min(9999, Math.round(n)));
        set({ d: Math.floor(v / 1000), h: Math.floor(v / 100) % 10, t: Math.floor(v / 10) % 10, e: v % 10 });
    };

    return (
        <>
            <Section title="Plaatsen">
                <ButtonRow>
                    {MAB_KEYS.map(k => (
                        <Button key={k} pressed={m.places.includes(k)} onClick={() => togglePlace(k)} label={`Kolom ${PLACE_NAME[k]}`}>{MAB_LABEL[k]}</Button>
                    ))}
                </ButtonRow>
            </Section>
            <Section title="Blokjes">
                <Segmented label="Stijl" value={m.mabStyle} onChange={(v) => set({ mabStyle: v })}
                    options={[{ value: 'mab-color', label: 'Blokken' }, { value: 'mab-bw', label: 'Zwart-wit' }, { value: 'symbolic', label: 'Stippen' }]} />
                <Segmented label="Kleuren" value={m.colorScheme} onChange={(v) => set({ colorScheme: v })}
                    options={[{ value: 'standaard', label: 'Standaard' }, { value: 'eigen', label: 'Eigen kleur per plaats' }]} />
                {m.colorScheme === 'eigen' && m.places.map(k => (
                    <PaletteRow key={k} label={`Kleur ${PLACE_NAME[k]}`} value={m.placeColors[k]} palette={PALETTE}
                        onChange={(v) => set({ placeColors: { ...m.placeColors, [k]: v } })} />
                ))}
                <Slider label="Grootte" value={m.size} min={0.6} max={2} step={0.1} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => set({ size: v })} />
            </Section>
            <Section title="Bediening">
                <Toggle label="Knoppen + en −" checked={m.showButtons} onChange={(v) => set({ showButtons: v })} />
                <Toggle label="Knoppen inwisselen / ontbinden" checked={m.showWissel} onChange={(v) => set({ showWissel: v })} />
                <Toggle label="Tik op een kolom = blokje erbij" checked={m.tapAdds} onChange={(v) => set({ tapAdds: v })} />
                <Toggle label="Automatisch inwisselen bij 10" checked={m.autoWissel} onChange={(v) => set({ autoWissel: v })} />
                <Hint>Inwisselen: 10 eenheden worden 1 tiental (de kolommen lichten even op). Ontbinden doet het omgekeerde.</Hint>
            </Section>
            <Section title="Tonen">
                <Toggle label="Getal (totaal)" checked={m.showTotal} onChange={(v) => set({ showTotal: v })} />
                <Segmented label="Uitgeschreven" value={m.expanded} onChange={(v) => set({ expanded: v })}
                    options={[{ value: 'geen', label: 'Niet' }, { value: 'plaatsen', label: '1 H + 2 T' }, { value: 'waarden', label: '100 + 20' }]} />
            </Section>
            <Section title="Getal leggen">
                <NumberField label="Leg het getal" value={total} min={0} max={9999} onChange={build} />
                <ButtonRow>
                    <Button onClick={() => set({ d: 0, h: 0, t: 0, e: 0 })}>Alles wissen</Button>
                </ButtonRow>
            </Section>
        </>
    );
}
