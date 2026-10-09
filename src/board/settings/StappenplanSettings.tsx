import { Section, Segmented, Toggle, ListEditor, ItemInput, ItemRow, ColorDot, Button, ButtonRow, Hint } from './controls';
import { useSetProps } from './baseProps';
import { stappenplanProps, CHECK_STYLES, STAPPENPLAN_TEMPLATES, listToText, textToList, isRowEdit, type ListItem } from './listModel';
import type { BoardWidget } from '../boardTypes';

export default function StappenplanSettings({ widget }: { widget: BoardWidget }) {
    const set = useSetProps(widget);
    const p = stappenplanProps(widget);
    return (
        <>
            <Section title="Stappen">
                <ListEditor<ListItem>
                    label="Rijen" items={p.items} addLabel="Stap toevoegen"
                    newItem={() => ({ text: '', color: null })}
                    itemName={(it, i) => it.text || `rij ${i + 1}`}
                    onChange={(list) => set(isRowEdit(list, p.items) ? { list } : { list, done: [] })}
                    bulk={{ toText: listToText, fromText: textToList }}
                    renderItem={(it, update, i) => (
                        <ItemRow>
                            <ColorDot label={`Kleur rij ${i + 1}`} value={it.color} onChange={(color) => update({ ...it, color })} />
                            <ItemInput label={`Rij ${i + 1}`} value={it.text} placeholder="Nieuwe stap" onChange={(text) => update({ ...it, text })} />
                        </ItemRow>
                    )}
                />
                <Hint>Begin een rij met # voor een titel, ## voor een tussentitel.</Hint>
                <Toggle label="Nummering" checked={p.numbered} onChange={(v) => set({ numbered: v })} />
            </Section>
            <Section title="Sjablonen">
                <ButtonRow>
                    {STAPPENPLAN_TEMPLATES.map(t => (
                        <Button key={t.name} onClick={() => set({ list: t.items.map(text => ({ text, color: null })), done: [] })}>{t.name}</Button>
                    ))}
                </ButtonRow>
                <Hint>Een sjabloon vervangt alle rijen.</Hint>
            </Section>
            <Section title="Afvinken">
                <Toggle label="Stappen afvinken (tik op een stap)" checked={p.tappable} onChange={(v) => set({ tappable: v })} />
                {p.tappable && (
                    <>
                        <Segmented label="Gedane stap" value={p.checkStyle} onChange={(v) => set({ checkStyle: v })} options={CHECK_STYLES} />
                        <Toggle label="Grote tikvakken" checked={p.bigTap} onChange={(v) => set({ bigTap: v })} />
                        <ButtonRow><Button onClick={() => set({ done: [] })}>Alles opnieuw (vinkjes weg)</Button></ButtonRow>
                    </>
                )}
            </Section>
        </>
    );
}
