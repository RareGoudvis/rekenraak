import { useState } from 'react';
import { Section, Segmented, Slider, TextArea, Toggle, ListEditor, ItemInput, Button, ButtonRow, Hint } from './controls';
import { useSetProps } from './baseProps';
import { groepjesModel, dealGroups, groupsAsText } from './groepjesModel';
import { useClassList, saveClassList, cleanNames } from './namenModel';
import type { BoardWidget } from '../boardTypes';

export default function GroepjesSettings({ widget }: { widget: BoardWidget }) {
    const set = useSetProps(widget);
    const m = groepjesModel(widget);
    const classList = useClassList();
    const own = m.source === 'eigen';
    const list = own ? m.names : classList;
    const save = (names: string[]) => (own ? set({ names }) : saveClassList(names));
    const [msg, setMsg] = useState<string | null>(null);
    const text = m.result ? groupsAsText(m.result, m) : '';

    const copy = () => {
        if (!text) return;
        navigator.clipboard?.writeText(text).then(() => setMsg('Gekopieerd.'), () => setMsg('Kopiëren lukte niet: selecteer de tekst hieronder.'));
    };
    const download = () => {
        const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
        const a = document.createElement('a');
        a.href = url; a.download = 'groepjes.txt'; a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <>
            <Section title="Groepen">
                <ButtonRow>
                    <Button onClick={() => { const names = cleanNames(list); if (names.length >= 2) { const r = dealGroups(names, m); set({ result: r.groups, locked: r.locked }); } }}>
                        {m.result ? 'Opnieuw verdelen' : 'Maak groepen'}
                    </Button>
                    {m.locked.length > 0 && <Button onClick={() => set({ locked: [] })}>Alles losmaken ({m.locked.length})</Button>}
                    {m.result && <Button onClick={() => set({ result: undefined, locked: [] })}>Wis groepen</Button>}
                </ButtonRow>
                <Hint>Tik op het slotje van een groep om die vast te zetten: bij opnieuw verdelen blijft ze zoals ze is.</Hint>
                {m.result && (
                    <>
                        <ButtonRow>
                            <Button onClick={copy}>Kopieer als tekst</Button>
                            <Button onClick={download}>Bewaar als .txt</Button>
                        </ButtonRow>
                        <textarea readOnly aria-label="Groepen als tekst" value={text} rows={Math.min(8, m.result.length + 1)}
                            onFocus={(e) => e.currentTarget.select()} style={areaStyle} />
                        {msg && <Hint>{msg}</Hint>}
                    </>
                )}
            </Section>
            <Section title="Verdelen">
                <Segmented label="Verdelen op" value={m.mode} onChange={(v) => set({ mode: v })}
                    options={[{ value: 'aantal', label: 'Aantal groepen' }, { value: 'grootte', label: 'Groepsgrootte' }]} />
                {m.mode === 'aantal'
                    ? <Slider label="Aantal groepen" value={m.groups} min={2} max={10} onChange={(v) => set({ groups: v })} />
                    : <Slider label="Leerlingen per groep" value={m.size} min={2} max={8} onChange={(v) => set({ size: v })} />}
                <Toggle label="Animatie bij verdelen" checked={m.animate} onChange={(v) => set({ animate: v })} />
            </Section>
            <Section title="Weergave">
                <Toggle label="Groepsnummers" checked={m.showNumbers} onChange={(v) => set({ showNumbers: v })} />
                <Toggle label="Kleur per groep" checked={m.colored} onChange={(v) => set({ colored: v })} />
                <Toggle label="Dier per groep" checked={m.emoji} onChange={(v) => set({ emoji: v })} />
            </Section>
            <Section title="Regels">
                <TextArea label="Moeten samen (Naam, Naam per lijn)" value={m.mustTogether} rows={3} placeholder="Emma, Noah" onChange={(v) => set({ mustTogether: v })} />
                <TextArea label="Mogen niet samen" value={m.cannotTogether} rows={3} placeholder="Lina, Sem" onChange={(v) => set({ cannotTogether: v })} />
            </Section>
            <Section title="Namen">
                <Segmented label="Lijst" value={m.source} onChange={(v) => set({ source: v })}
                    options={[{ value: 'klas', label: 'Klaslijst' }, { value: 'eigen', label: 'Eigen lijst' }]} />
                <ListEditor<string>
                    label={own ? 'Namen van deze kaart' : 'Klaslijst'} items={list} addLabel="Naam toevoegen"
                    newItem={() => ''}
                    itemName={(n, i) => n || `naam ${i + 1}`}
                    onChange={save}
                    bulk={{ toText: (xs) => xs.join('\n'), fromText: (t) => cleanNames(t.split('\n')), label: 'Plak een klaslijst' }}
                    renderItem={(n, update, i) => <ItemInput label={`Naam ${i + 1}`} value={n} onChange={update} />}
                />
                <Hint>{own ? 'Deze namen horen enkel bij deze kaart.' : 'De klaslijst is gedeeld met de namenkiezer.'}</Hint>
            </Section>
        </>
    );
}

const areaStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', resize: 'vertical', padding: 'var(--sp-2)',
    borderRadius: 'var(--radius-xs)', border: '1px solid var(--separator)', background: 'var(--bg-surface-2)',
    color: 'var(--text-main)', fontSize: 'var(--text-sm)', fontFamily: 'var(--font-ui)', outline: 'none',
};
