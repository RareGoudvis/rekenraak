import { Section, Segmented, Toggle, Slider, ColorSwatches, Button, ButtonRow, Hint, ListEditor, ItemInput, Row } from './controls';
import { useSetProps } from './baseProps';
import { geluidProps, GELUID_SCHEMA, DEFAULT_POSTER_LEVELS, MAX_POSTER_LEVELS, type PosterLevel } from './geluidModel';
import { TONES, TONE_LABELS, playTone } from './tones';
import ChoiceButtons from './ChoiceButtons';
import { BRIGHT_PALETTE } from './palettes';
import type { BoardWidget } from '../boardTypes';

const pct = (v: number) => `${v}%`;
const BANDS = [
    { key: 'quietColor', label: 'Rustig' },
    { key: 'warnColor', label: 'Let op' },
    { key: 'alarmColor', label: 'Te luid' },
] as const;

export default function GeluidSettings({ widget }: { widget: BoardWidget }) {
    const set = useSetProps(widget);
    const m = geluidProps(widget);
    return (
        <>
            <Section title="Soort">
                <Segmented value={m.mode} onChange={(v) => set({ mode: v })}
                    options={[{ value: 'poster', label: 'Poster (tikken)' }, { value: 'meter', label: 'Meter (microfoon)' }]} />
                <Hint>{m.mode === 'poster'
                    ? 'Tik op het niveau dat nu geldt.'
                    : 'Meet het geluid in de klas via de microfoon. Er wordt niets opgenomen of verstuurd.'}</Hint>
            </Section>
            {m.mode === 'poster' ? (
                <Section title="Niveaus">
                    <ListEditor<PosterLevel>
                        label="Niveaus"
                        items={m.posterLevels}
                        min={2}
                        onChange={(items) => set({ posterLevels: items.slice(0, MAX_POSTER_LEVELS) })}
                        newItem={() => ({ title: 'Nieuw niveau', desc: '', color: '#e5e7eb' })}
                        addLabel="Niveau"
                        itemName={(l) => l.title || 'niveau'}
                        renderItem={(l, update, i) => (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                    <input type="color" value={l.color} aria-label={`Kleur niveau ${i}`} onChange={(e) => update({ ...l, color: e.target.value })}
                                        style={{ width: '32px', height: '32px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', flexShrink: 0 }} />
                                    <ItemInput label={`Naam niveau ${i}`} value={l.title} onChange={(v) => update({ ...l, title: v })} />
                                </div>
                                <ItemInput label={`Uitleg niveau ${i}`} value={l.desc} placeholder="Uitleg (mag leeg)" onChange={(v) => update({ ...l, desc: v })} />
                            </div>
                        )}
                    />
                    <Toggle label="Uitleg tonen" checked={m.showDesc} onChange={(v) => set({ showDesc: v })} />
                    <ButtonRow>
                        <Button onClick={() => set({ posterLevels: DEFAULT_POSTER_LEVELS, level: 0 })}>Standaardposter</Button>
                    </ButtonRow>
                </Section>
            ) : (
                <>
                    <Section title="Meten">
                        <Segmented label="Weergave" value={m.display} onChange={(v) => set({ display: v })}
                            options={[{ value: 'balk', label: 'Balk' }, { value: 'verkeerslicht', label: 'Verkeerslicht' }, { value: 'smiley', label: 'Smiley' }]} />
                        <Slider label="Gevoeligheid" value={m.sensitivity} min={1} max={10} onChange={(v) => set({ sensitivity: v })} />
                        <Slider label="Oranje vanaf" value={m.warnAt} min={5} max={95} format={pct} onChange={(v) => set({ warnAt: v, ...(v >= m.alarmAt ? { alarmAt: Math.min(100, v + 5) } : {}) })} />
                        <Slider label="Rood vanaf" value={m.alarmAt} min={10} max={100} format={pct} onChange={(v) => set({ alarmAt: v, ...(v <= m.warnAt ? { warnAt: Math.max(5, v - 5) } : {}) })} />
                        <Toggle label="Piek even vasthouden" checked={m.peakHold} onChange={(v) => set({ peakHold: v })} />
                    </Section>
                    <Section title="Kleuren">
                        {BANDS.map(b => (
                            <Row key={b.key} label={b.label} stacked>
                                <ColorSwatches compact label={b.label} palette={BRIGHT_PALETTE} noneLabel={`${b.label}: standaard`}
                                    value={m[b.key] === GELUID_SCHEMA[b.key].def ? null : m[b.key]}
                                    onChange={(v) => set({ [b.key]: v ?? GELUID_SCHEMA[b.key].def })} />
                            </Row>
                        ))}
                    </Section>
                    <Section title="Te luid">
                        <Toggle label="Knipperen" checked={m.alarmFlash} onChange={(v) => set({ alarmFlash: v })} />
                        <Toggle label="Geluidssignaal" checked={m.alarmSound && !m.muted} onChange={(v) => set({ alarmSound: v, ...(v ? { muted: false } : {}) })} />
                        {m.alarmSound && !m.muted && (
                            <ChoiceButtons label="Signaal" value={m.alarmTone} onChange={(v) => { set({ alarmTone: v }); playTone(v); }}
                                options={TONES.map(t => ({ value: t, label: TONE_LABELS[t] }))} />
                        )}
                        <Toggle label="Enkel beeld, nooit geluid" checked={m.muted} onChange={(v) => set({ muted: v })} />
                    </Section>
                    <Section title="Kalibreren">
                        <Hint>Zorg voor 2 seconden stilte: het achtergrondgeluid van de klas telt daarna als nul.</Hint>
                        <ButtonRow>
                            <Button onClick={() => set({ calibrateAt: Date.now() })}>Kalibreer nu</Button>
                            {m.calibration > 0 && <Button onClick={() => set({ calibration: 0 })}>Wis ({Math.round(m.calibration)})</Button>}
                        </ButtonRow>
                    </Section>
                </>
            )}
        </>
    );
}
