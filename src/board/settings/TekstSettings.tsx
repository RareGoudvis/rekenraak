import { Section, Segmented, Toggle, Slider, ColorSwatches, Button, ButtonRow, Hint, Row } from './controls';
import { useSetProps } from './baseProps';
import { tekstProps } from './tekstModel';
import { LIGHT_PALETTE } from './palettes';
import type { BoardWidget } from '../boardTypes';

const LINE_PALETTE = [
    { name: 'Blauwe lijn', hex: '#93c5fd' }, { name: 'Rode lijn', hex: '#fca5a5' },
    { name: 'Grijze lijn', hex: '#d1d5db' }, { name: 'Groene lijn', hex: '#86efac' },
];

export default function TekstSettings({ widget }: { widget: BoardWidget }) {
    const set = useSetProps(widget);
    const m = tekstProps(widget);
    return (
        <>
            <Section title="Letters">
                <Slider label="Lettergrootte" value={m.textPx} min={12} max={120} format={(v) => `${v} px`} onChange={(v) => set({ textPx: v })} />
                <Segmented label="Lettertype" value={m.font} onChange={(v) => set({ font: v })}
                    options={[{ value: 'mono', label: 'Typemachine' }, { value: 'sans', label: 'Gewoon' }]} />
                <ButtonRow>
                    <Button pressed={m.bold} onClick={() => set({ bold: !m.bold })}><strong>Vet</strong></Button>
                    <Button pressed={m.italic} onClick={() => set({ italic: !m.italic })}><em>Schuin</em></Button>
                </ButtonRow>
                <Segmented label="Uitlijnen" value={m.align} onChange={(v) => set({ align: v })}
                    options={[{ value: 'left', label: 'Links' }, { value: 'center', label: 'Midden' }, { value: 'right', label: 'Rechts' }]} />
            </Section>
            <Section title="Kleur">
                <Hint>De tekst krijgt de accentkleur (onder Kaart).</Hint>
                <Row label="Achtergrond" stacked><ColorSwatches compact label="Achtergrond" value={m.bg || null} noneLabel="Geen achtergrond" palette={LIGHT_PALETTE} onChange={(v) => set({ bg: v ?? '' })} /></Row>
            </Section>
            <Section title="Opmaak">
                <Slider label="Binnenmarge" value={m.padding} min={0} max={48} step={2} format={(v) => `${v} px`} onChange={(v) => set({ padding: v })} />
                <Segmented label="Lange regels" value={m.wrap} onChange={(v) => set({ wrap: v })}
                    options={[{ value: 'terugloop', label: 'Afbreken' }, { value: 'eenregel', label: 'Eén regel' }]} />
                <Segmented label="Opsomming" value={m.bullets} onChange={(v) => set({ bullets: v })}
                    options={[{ value: 'geen', label: 'Geen' }, { value: 'bolletjes', label: '• Bolletjes' }, { value: 'nummers', label: '1. Nummers' }]} />
                <Toggle label="Lijntjes (schrift)" checked={m.lines} onChange={(v) => set({ lines: v })} />
                {m.lines && (
                    <ColorSwatches label="Lijnkleur" value={m.lineColor} noneLabel="Blauwe lijn (standaard)" palette={LINE_PALETTE}
                        onChange={(v) => set({ lineColor: v ?? '#93c5fd' })} />
                )}
            </Section>
        </>
    );
}
