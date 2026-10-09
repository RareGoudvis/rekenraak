import { Section, Segmented, Toggle, Slider, ColorSwatches, Button, ButtonRow, Hint, ListEditor } from './controls';
import { useSetProps } from './baseProps';
import { timerProps, presetLabel } from './timerModel';
import { TONES, TONE_LABELS, playTone } from './tones';
import ChoiceButtons from './ChoiceButtons';
import { BRIGHT_PALETTE } from './palettes';
import type { BoardWidget } from '../boardTypes';

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const INPUT_HINT = {
    paneel: 'De tijd stel je hier in, met de schuif of de snelkeuzes.',
    draaien: 'Sleep rond de klok om minuten in te stellen (taart en ring); balk en zandloper krijgen − en + knoppen.',
    toetsen: 'Een cijferklavier onder de timer: typ 130 voor 1:30 en tik OK.',
} as const;

export default function TimerSettings({ widget }: { widget: BoardWidget }) {
    const set = useSetProps(widget);
    const p = timerProps(widget);
    return (
        <>
            <Section title="Duur">
                <Slider label="Tijd" value={p.durationSec} min={30} max={3600} step={30} format={mmss} onChange={(v) => set({ durationSec: v })} />
                <ButtonRow>
                    {p.presets.map((m, i) => (
                        <Button key={i} pressed={Math.round(m * 60) === p.durationSec} onClick={() => set({ durationSec: Math.max(5, Math.round(m * 60)) })}>{presetLabel(m)}</Button>
                    ))}
                </ButtonRow>
                <ListEditor<number>
                    label="Snelkeuzes (minuten)"
                    items={p.presets}
                    onChange={(items) => set({ presets: items.slice(0, 12) })}
                    newItem={() => 20}
                    addLabel="Snelkeuze"
                    itemName={(m) => presetLabel(m)}
                    renderItem={(m, update, i) => (
                        <input type="number" min={0.25} max={99} step={0.25} value={m} aria-label={`Snelkeuze ${i + 1} in minuten`}
                            onChange={(e) => { const n = Number(e.target.value); if (Number.isFinite(n) && n > 0) update(Math.min(99, n)); }}
                            style={numInput} />
                    )}
                />
                <Toggle label="Snelkeuzes op de timer" checked={p.showPresets} onChange={(v) => set({ showPresets: v })} />
            </Section>
            <Section title="Instellen op het bord">
                <Segmented value={p.inputMode} onChange={(v) => set({ inputMode: v })}
                    options={[{ value: 'paneel', label: 'Enkel hier' }, { value: 'draaien', label: 'Draaien' }, { value: 'toetsen', label: 'Toetsen' }]} />
                <Hint>{INPUT_HINT[p.inputMode]}</Hint>
            </Section>
            <Section title="Weergave">
                <Segmented label="Voortgang" value={p.progress} onChange={(v) => set({ progress: v })}
                    options={[{ value: 'taart', label: 'Taart' }, { value: 'ring', label: 'Ring' }, { value: 'balk', label: 'Balk' }, { value: 'zandloper', label: 'Zandloper' }]} />
                <Segmented label="Resterende tijd" value={p.display} onChange={(v) => set({ display: v })}
                    options={[{ value: 'mmss', label: 'mm:ss' }, { value: 'minuten', label: 'Minuten' }, { value: 'geen', label: 'Verberg' }]} />
                <ColorSwatches label="Kleur" value={p.color || null} palette={BRIGHT_PALETTE} noneLabel="Zoals accentkleur" onChange={(v) => set({ color: v ?? '' })} />
            </Section>
            <Section title="Bijna voorbij">
                <Toggle label="Andere kleur op het einde" checked={p.warnEnabled} onChange={(v) => set({ warnEnabled: v })} />
                {p.warnEnabled && (
                    <>
                        <Slider label="Vanaf nog" value={p.warnSec} min={5} max={600} step={5} format={mmss} onChange={(v) => set({ warnSec: v })} />
                        <ColorSwatches label="Eindkleur" value={p.warnColor} palette={BRIGHT_PALETTE} noneLabel="Rood (standaard)" onChange={(v) => set({ warnColor: v ?? '#dc2626' })} />
                    </>
                )}
            </Section>
            <Section title="Einde">
                <ChoiceButtons label="Geluid" value={p.endSound} onChange={(v) => { set({ endSound: v }); if (v !== 'geen') playTone(v); }}
                    options={[{ value: 'geen', label: 'Geen' }, ...TONES.map(t => ({ value: t, label: TONE_LABELS[t] }))]} />
                {p.endSound !== 'geen' && (
                    <Slider label="Herhalen" value={p.endRepeat} min={1} max={5} format={(v) => `${v}×`} onChange={(v) => set({ endRepeat: v })} />
                )}
                <Toggle label="Knipperen bij nul" checked={p.flashOnEnd} onChange={(v) => set({ flashOnEnd: v })} />
                <Toggle label="Automatisch opnieuw starten" checked={p.autoRestart} onChange={(v) => set({ autoRestart: v })} />
                <Toggle label="Pauzeren toegestaan" checked={p.allowPause} onChange={(v) => set({ allowPause: v })} />
            </Section>
        </>
    );
}

const numInput: React.CSSProperties = {
    boxSizing: 'border-box', width: '100%', height: '32px', padding: '0 10px', borderRadius: 'var(--radius-xs)',
    border: '1px solid var(--separator)', background: 'var(--bg-surface)', color: 'var(--text-main)',
    fontSize: 'var(--text-sm)', outline: 'none',
};
