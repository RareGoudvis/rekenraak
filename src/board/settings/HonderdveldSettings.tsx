import { Section, Segmented, Slider, Hint, Button, ButtonRow, ListEditor } from './controls';
import { NumberField, PaletteRow } from './mathControls';
import { useSetProps } from './baseProps';
import { honderdveldProps, HONDERDVELD_MAX, type HighlightSet, type HighlightRule } from '../mathTools/honderdveld';
import { TOOL_COLORS } from '../mathTools/shared';
import type { BoardWidget } from '../boardTypes';

const RANGES = [
    { value: '1-100', label: '1 – 100', start: 1, count: 100 },
    { value: '0-99', label: '0 – 99', start: 0, count: 100 },
    { value: '1-120', label: '1 – 120', start: 1, count: 120 },
] as const;

const RULE_LABEL: Record<HighlightRule, string> = { even: 'Even', oneven: 'Oneven', veelvoud: 'Veelvoud', eindigt: 'Eindigt op' };

export default function HonderdveldSettings({ widget }: { widget: BoardWidget }) {
    const set = useSetProps(widget);
    const p = honderdveldProps(widget);
    // props.custom keeps "Eigen" open while its start/count still equal a preset.
    const range = widget.props?.custom === true ? 'eigen' : RANGES.find(r => r.start === p.start && r.count === p.count)?.value ?? 'eigen';
    const numbers = Array.from({ length: p.count }, (_, i) => p.start + i);
    const hideRandom = (k: number) => set({ hidden: [...numbers].sort(() => Math.random() - 0.5).slice(0, k) });

    return (
        <>
            <Section title="Bereik">
                <Segmented label="Getallen" value={range} onChange={(v) => {
                    const r = RANGES.find(x => x.value === v);
                    set(r ? { start: r.start, count: r.count, custom: false } : { custom: true });
                }} options={[...RANGES.map(r => ({ value: r.value as string, label: r.label })), { value: 'eigen', label: 'Eigen' }]} />
                {range === 'eigen' && (
                    <>
                        <NumberField label="Startgetal" value={p.start} min={-100} max={1000} onChange={(v) => set({ start: Math.round(v) })} />
                        <Slider label="Aantal vakjes" value={p.count} min={10} max={HONDERDVELD_MAX} step={10} onChange={(v) => set({ count: v })} />
                    </>
                )}
                <Segmented label="Vakjes per rij" value={p.cols === 10 || p.cols === 5 ? p.cols : 0} onChange={(v) => set({ cols: v || 12 })}
                    options={[{ value: 10, label: '10' }, { value: 5, label: '5' }, { value: 0, label: 'Eigen' }]} />
                {p.cols !== 10 && p.cols !== 5 && <Slider label="Vakjes per rij" value={p.cols} min={2} max={20} onChange={(v) => set({ cols: v })} />}
            </Section>
            <Section title="Patronen kleuren">
                <ListEditor<HighlightSet>
                    label="Kleur automatisch" items={p.highlights} addLabel="Patroon toevoegen"
                    itemName={(h) => `${RULE_LABEL[h.rule]}${h.rule === 'veelvoud' || h.rule === 'eindigt' ? ` ${h.n}` : ''}`}
                    newItem={() => ({ rule: 'veelvoud', n: 5, color: TOOL_COLORS[p.highlights.length % TOOL_COLORS.length] })}
                    onChange={(items) => set({ highlights: items })}
                    renderItem={(h, update) => (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {/* Wrapping buttons, not a segment bar: the list row is too narrow for four segments. */}
                            <ButtonRow>
                                {(Object.keys(RULE_LABEL) as HighlightRule[]).map(r => (
                                    <Button key={r} pressed={h.rule === r} onClick={() => update({ ...h, rule: r })}>{RULE_LABEL[r]}</Button>
                                ))}
                            </ButtonRow>
                            {h.rule === 'veelvoud' && <NumberField label="Veelvoud van" value={h.n} min={1} max={100} onChange={(n) => update({ ...h, n: Math.round(n) })} />}
                            {h.rule === 'eindigt' && <NumberField label="Laatste cijfer" value={h.n} min={0} max={9} onChange={(n) => update({ ...h, n: Math.round(n) })} />}
                            <PaletteRow label="Kleur" value={h.color} palette={TOOL_COLORS} onChange={(color) => update({ ...h, color })} />
                        </div>
                    )}
                />
                <Hint>Latere patronen kleuren over eerdere; een getikt vakje wint altijd.</Hint>
            </Section>
            <Section title="Tikken op een vakje">
                <Segmented label="Een tik" value={p.tapMode} onChange={(v) => set({ tapMode: v })}
                    options={[{ value: 'kleuren', label: 'Kleurt' }, { value: 'verbergen', label: 'Verbergt het getal' }]} />
                {p.tapMode === 'kleuren' && (
                    <PaletteRow label="Tikkleur" value={p.paint} palette={TOOL_COLORS} onChange={(v) => set({ paint: v })}
                        extra={{ value: 'cyclus', label: 'Afwisselend (geel, groen, blauw, rood, weg)' }} />
                )}
                <ButtonRow>
                    <Button onClick={() => set({ marks: {} })}>Wis getikte kleuren ({Object.keys(p.marks).length})</Button>
                </ButtonRow>
            </Section>
            <Section title="Invullen">
                <ButtonRow>
                    <Button onClick={() => hideRandom(10)}>Verberg 10 willekeurig</Button>
                    <Button onClick={() => set({ hidden: numbers.filter(n => n % 10 !== 0) })}>Enkel tientallen tonen</Button>
                    <Button onClick={() => set({ hidden: numbers })}>Verberg alles</Button>
                    <Button onClick={() => set({ hidden: [] })}>Toon alles ({p.hidden.length})</Button>
                </ButtonRow>
            </Section>
        </>
    );
}
