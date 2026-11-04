import { Section, Segmented, Toggle, ListEditor, ItemInput, ItemRow, ColorDot, Button, ButtonRow, Hint } from './controls';
import { useSetProps } from './baseProps';
import { checklistProps, CHECK_STYLES, CHECKLIST_TEMPLATES, listToText, textToList, isRowEdit, type ListItem } from './listModel';
import type { BoardWidget } from '../boardTypes';

export default function ChecklistSettings({ widget }: { widget: BoardWidget }) {
    const set = useSetProps(widget);
    const p = checklistProps(widget);
    // A reorder or removal shifts the rows, so the ticks restart; a text edit keeps them.
    const setList = (list: ListItem[], keepChecks: boolean) => set(keepChecks ? { list } : { list, checked: [] });
    return (
        <>
            <Section title="Items">
                <ListEditor<ListItem>
                    label="Lijst" items={p.items} addLabel="Item toevoegen"
                    newItem={() => ({ text: '', color: null })}
                    itemName={(it, i) => it.text || `item ${i + 1}`}
                    onChange={(list) => setList(list, isRowEdit(list, p.items))}
                    bulk={{ toText: listToText, fromText: textToList }}
                    renderItem={(it, update, i) => (
                        <ItemRow>
                            <ColorDot label={`Kleur item ${i + 1}`} value={it.color} onChange={(color) => update({ ...it, color })} />
                            <ItemInput label={`Item ${i + 1}`} value={it.text} placeholder="Nieuw item" onChange={(text) => update({ ...it, text })} />
                        </ItemRow>
                    )}
                />
            </Section>
            <Section title="Sjablonen">
                <ButtonRow>
                    {CHECKLIST_TEMPLATES.map(t => (
                        <Button key={t.name} onClick={() => set({ list: t.items.map(text => ({ text, color: null })), checked: [], title: t.name })}>{t.name}</Button>
                    ))}
                </ButtonRow>
                <Hint>Een sjabloon vervangt de lijst en de titel.</Hint>
            </Section>
            <Section title="Afvinken">
                <Segmented label="Afgevinkt item" value={p.checkStyle} onChange={(v) => set({ checkStyle: v })} options={CHECK_STYLES} />
                <Segmented label="Vakje" value={p.round ? 'rond' : 'vierkant'} onChange={(v) => set({ round: v === 'rond' })}
                    options={[{ value: 'vierkant', label: 'Vierkant' }, { value: 'rond', label: 'Rond' }]} />
                <Toggle label="Grote tikvakken" checked={p.bigTap} onChange={(v) => set({ bigTap: v })} />
                <Toggle label="Nummering" checked={p.numbered} onChange={(v) => set({ numbered: v })} />
                <ButtonRow><Button onClick={() => set({ checked: [] })}>Alles opnieuw (vinkjes weg)</Button></ButtonRow>
            </Section>
        </>
    );
}

