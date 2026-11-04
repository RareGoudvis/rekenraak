import { Section, Segmented, Toggle, Slider, Button, ButtonRow, Hint } from './controls';
import { useSetProps } from './baseProps';
import { stopwatchProps } from './stopwatchModel';
import { TONES, TONE_LABELS, playTone } from './tones';
import ChoiceButtons from './ChoiceButtons';
import type { BoardWidget } from '../boardTypes';

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function StopwatchSettings({ widget }: { widget: BoardWidget }) {
    const set = useSetProps(widget);
    const p = stopwatchProps(widget);
    return (
        <>
            <Section title="Weergave">
                <Segmented label="Nauwkeurigheid" value={p.precision} onChange={(v) => set({ precision: v })}
                    options={[{ value: 'seconden', label: '00:00' }, { value: 'tienden', label: '00:00.0' }, { value: 'honderdsten', label: '00:00.00' }]} />
                <Toggle label="Grote cijfers" checked={p.bigDigits} onChange={(v) => set({ bigDigits: v })} />
                <Hint>De cijfers krijgen de accentkleur (onder Kaart).</Hint>
            </Section>
            <Section title="Tellen">
                <Segmented label="Richting" value={p.direction} onChange={(v) => set({ direction: v })}
                    options={[{ value: 'op', label: 'Optellen' }, { value: 'af', label: 'Aftellen' }]} />
                {p.direction === 'af' && (
                    <Slider label="Aftellen vanaf" value={p.fromSec} min={5} max={3600} step={5} format={mmss} onChange={(v) => set({ fromSec: v })} />
                )}
            </Section>
            <Section title="Rondes">
                <Toggle label="Rondeknop tonen" checked={p.showLaps} onChange={(v) => set({ showLaps: v })} />
                {p.laps.length > 0 && (
                    <ButtonRow>
                        <Button onClick={() => set({ laps: [] })}>Rondes wissen ({p.laps.length})</Button>
                    </ButtonRow>
                )}
            </Section>
            <Section title="Bediening">
                <Toggle label="Spatiebalk start en stopt" checked={p.spaceKey} onChange={(v) => set({ spaceKey: v })} />
                <Toggle label="Meteen starten bij openen" checked={p.autoStart} onChange={(v) => set({ autoStart: v })} />
                <Toggle label="Geluid bij stoppen" checked={p.soundAtStop} onChange={(v) => set({ soundAtStop: v })} />
                {p.soundAtStop && (
                    <>
                        <ChoiceButtons label="Geluid" value={p.tone} onChange={(v) => { set({ tone: v }); playTone(v); }}
                            options={TONES.map(t => ({ value: t, label: TONE_LABELS[t] }))} />
                        <Hint>Aftellen speelt het geluid ook af bij nul.</Hint>
                    </>
                )}
            </Section>
        </>
    );
}
