import { Section, Segmented, Slider, Toggle, Hint, Button, ButtonRow, ListEditor } from './controls';
import { PaletteRow } from './mathControls';
import { useSetProps } from './baseProps';
import { breukvizProps, BREUK_MAX_D, BREUK_MAX_ITEMS, BREUK_MAX_WHOLES, type BreukItem, type BreukShape } from '../mathTools/breukviz';
import { TOOL_COLORS } from '../mathTools/shared';
import type { BoardWidget } from '../boardTypes';

const SHAPES: ReadonlyArray<{ value: BreukShape; label: string }> = [
    { value: 'cirkel', label: 'Cirkel' }, { value: 'pizza', label: 'Pizza' }, { value: 'rechthoek', label: 'Rechthoek' },
    { value: 'strook', label: 'Strook' }, { value: 'getallenlijn', label: 'Getallenlijn' },
];

export default function BreukvizSettings({ widget }: { widget: BoardWidget }) {
    const set = useSetProps(widget);
    const b = breukvizProps(widget);
    // n / d mirror fraction 1 so an older build still opens the board with the same first fraction.
    const setFractions = (fractions: BreukItem[]) => set({ fractions: fractions.slice(0, BREUK_MAX_ITEMS), n: fractions[0]?.n, d: fractions[0]?.d });
    const cap = (d: number) => (b.mixed ? d * BREUK_MAX_WHOLES : d);

    return (
        <>
            <Section title="Vorm">
                <ButtonRow>
                    {SHAPES.map(s => <Button key={s.value} pressed={b.shape === s.value} onClick={() => set({ shape: s.value })}>{s.label}</Button>)}
                </ButtonRow>
                <Hint>Tik op een deel om het te kleuren; op de getallenlijn tik je waar de breuk ligt.</Hint>
            </Section>
            <Section title="Breuken">
                <ListEditor<BreukItem>
                    label="Naast elkaar (vergelijken)" items={b.fractions} min={1}
                    addLabel={b.fractions.length < BREUK_MAX_ITEMS ? 'Breuk toevoegen' : `Maximum ${BREUK_MAX_ITEMS}`}
                    itemName={(f, i) => `breuk ${i + 1} (${f.n}/${f.d})`}
                    newItem={() => ({ n: 1, d: 2, parts: null, color: TOOL_COLORS[(2 + b.fractions.length) % TOOL_COLORS.length] })}
                    onChange={setFractions}
                    renderItem={(f, update) => (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <Slider label="Noemer (aantal delen)" value={f.d} min={1} max={BREUK_MAX_D}
                                onChange={(d) => update({ ...f, d, n: Math.min(f.n, cap(d)), parts: null })} />
                            {!b.stambreuk && (
                                <Slider label="Teller (gekleurde delen)" value={f.n} min={0} max={cap(f.d)}
                                    onChange={(n) => update({ ...f, n, parts: null })} />
                            )}
                            <PaletteRow label="Kleur" value={f.color} palette={TOOL_COLORS} onChange={(color) => update({ ...f, color })} />
                        </div>
                    )}
                />
                <Toggle label="Enkel stambreuken (1/n)" checked={b.stambreuk} onChange={(v) => set({ stambreuk: v })} />
                <Toggle label="Meer dan één geheel (gemengde getallen)" checked={b.mixed} onChange={(v) => set({ mixed: v })} />
                <ButtonRow>
                    <Button onClick={() => setFractions(b.fractions.map(f => ({ ...f, n: 0, parts: [] })))}>Alle kleuren wissen</Button>
                </ButtonRow>
            </Section>
            <Section title="Gelijkwaardige breuk">
                <Slider label="Elk deel opsplitsen in" value={b.equivalent} min={1} max={6}
                    format={(v) => (v === 1 ? 'uit' : `${v} stukjes`)} onChange={(v) => set({ equivalent: v })} />
                <Hint>Toont bv. 1/3 = 2/6: dezelfde kleur, fijnere verdeling.</Hint>
            </Section>
            <Section title="Label">
                <Toggle label="Breuk onder de vorm" checked={b.labels} onChange={(v) => set({ labels: v })} />
                {b.labels && (
                    <Segmented label="Schrijfwijze" value={b.labelStyle} onChange={(v) => set({ labelStyle: v })}
                        options={[{ value: 'breuk', label: 'Breuk' }, { value: 'gemengd', label: 'Gemengd' }, { value: 'decimaal', label: 'Kommagetal' }]} />
                )}
            </Section>
        </>
    );
}
