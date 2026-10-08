import { useState } from 'react';
import { Section, Segmented, Slider, TextArea } from './controls';
import { useSetProps } from './baseProps';
import { groepjesProps, NAMES_KEY } from '../widgetSizing';
import type { BoardWidget } from '../boardTypes';

export default function GroepjesSettings({ widget }: { widget: BoardWidget }) {
    const set = useSetProps(widget);
    const g = groepjesProps(widget);
    const [names, setNames] = useState(() => localStorage.getItem(NAMES_KEY) ?? '');
    const saveNames = (v: string) => { setNames(v); localStorage.setItem(NAMES_KEY, v); };
    return (
        <>
            <Section title="Verdelen">
                <Segmented label="Verdelen op" value={g.mode} onChange={(v) => set({ mode: v })}
                    options={[{ value: 'aantal', label: 'Aantal groepen' }, { value: 'grootte', label: 'Groepsgrootte' }]} />
                {g.mode === 'aantal'
                    ? <Slider label="Aantal groepen" value={g.groups} min={2} max={10} onChange={(v) => set({ groups: v })} />
                    : <Slider label="Leerlingen per groep" value={g.size} min={2} max={8} onChange={(v) => set({ size: v })} />}
            </Section>
            <Section title="Regels">
                <TextArea label="Moeten samen (Naam, Naam per lijn)" value={g.mustTogether} rows={3} placeholder="Emma, Noah" onChange={(v) => set({ mustTogether: v })} />
                <TextArea label="Mogen niet samen" value={g.cannotTogether} rows={3} placeholder="Lina, Sem" onChange={(v) => set({ cannotTogether: v })} />
            </Section>
            <Section title="Klaslijst (gedeeld met namenkiezer)">
                <TextArea label="Eén naam per lijn" value={names} rows={6} onChange={saveNames} />
            </Section>
        </>
    );
}
