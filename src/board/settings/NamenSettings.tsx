import { Section, Segmented, Slider, Toggle, ListEditor, ItemInput, Button, ButtonRow, Hint } from './controls';
import { useSetProps } from './baseProps';
import { namenProps, useClassList, saveClassList, cleanNames, sortNames } from './namenModel';
import type { BoardWidget } from '../boardTypes';

export default function NamenSettings({ widget }: { widget: BoardWidget }) {
    const set = useSetProps(widget);
    const p = namenProps(widget);
    const classList = useClassList();
    const own = p.source === 'eigen';
    const list = own ? p.names : classList;
    const save = (names: string[]) => (own ? set({ names }) : saveClassList(names));
    return (
        <>
            <Section title="Namen">
                <Segmented label="Lijst" value={p.source} onChange={(v) => set({ source: v })}
                    options={[{ value: 'klas', label: 'Klaslijst' }, { value: 'eigen', label: 'Eigen lijst' }]} />
                <ListEditor<string>
                    label={own ? 'Namen van deze kaart' : 'Klaslijst'} items={list} addLabel="Naam toevoegen"
                    newItem={() => ''}
                    itemName={(n, i) => n || `naam ${i + 1}`}
                    onChange={save}
                    bulk={{ toText: (xs) => xs.join('\n'), fromText: (t) => cleanNames(t.split('\n')), label: 'Plak een klaslijst' }}
                    renderItem={(n, update, i) => <ItemInput label={`Naam ${i + 1}`} value={n} onChange={update} />}
                />
                <ButtonRow>
                    <Button onClick={() => save(sortNames(cleanNames(list)))}>Sorteer A-Z</Button>
                </ButtonRow>
                <Hint>{own ? 'Deze namen horen enkel bij deze kaart.' : 'De klaslijst wordt bewaard op dit toestel en gedeeld met de groepjesmaker en alle borden.'}</Hint>
            </Section>
            <Section title="Kiezen">
                <Segmented label="Manier" value={p.mode} onChange={(v) => set({ mode: v })}
                    options={[{ value: 'een', label: 'Naam tonen' }, { value: 'rad', label: 'Rad draaien' }]} />
                {p.mode === 'een' && <Slider label="Namen per keer" value={p.count} min={1} max={5} onChange={(v) => set({ count: v })} />}
                <Toggle label="Gekozen namen overslaan" checked={p.noRepeat} onChange={(v) => set({ noRepeat: v })} />
                <Toggle label="Gekozen namen tonen" checked={p.showPicked} onChange={(v) => set({ showPicked: v })} />
                <Toggle label="Animatie" checked={p.animate} onChange={(v) => set({ animate: v })} />
                <ButtonRow><Button onClick={() => set({ picked: [], current: [] })}>Opnieuw beginnen ({p.picked.length} gekozen)</Button></ButtonRow>
            </Section>
        </>
    );
}
