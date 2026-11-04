import { Section, Segmented, Toggle, TextField, Hint, Button, ButtonRow } from './controls';
import { useSetProps } from './baseProps';
import { datumModel, formatDate } from './datumModel';
import type { BoardWidget } from '../boardTypes';

export default function DatumSettings({ widget }: { widget: BoardWidget }) {
    const set = useSetProps(widget);
    const d = datumModel(widget);
    const sample = new Date();
    return (
        <>
            <Section title="Weergave">
                <Toggle label="Weekdag" checked={d.showWeekday} onChange={(v) => set({ showWeekday: v })} />
                <Toggle label="Datum" checked={d.showDate} onChange={(v) => set({ showDate: v })} />
                <Toggle label="Tijd (live)" checked={d.showTime} onChange={(v) => set({ showTime: v })} />
                {d.showTime && <Toggle label="Seconden" checked={d.showSeconds} onChange={(v) => set({ showSeconds: v })} />}
            </Section>
            <Section title="Datum schrijven">
                <Segmented label="Vorm" value={d.format} onChange={(v) => set({ format: v })}
                    options={[
                        { value: 'lang', label: formatDate(sample, { format: 'lang', showYear: false }) },
                        { value: 'kort', label: formatDate(sample, { format: 'kort', showYear: false }) },
                        { value: 'numeriek', label: formatDate(sample, { format: 'numeriek', showYear: false }) },
                    ]} />
                <Toggle label="Jaartal" checked={d.showYear} onChange={(v) => set({ showYear: v })} />
                <Segmented label="Letters" value={d.textCase} onChange={(v) => set({ textCase: v })}
                    options={[{ value: 'normaal', label: 'Maandag' }, { value: 'hoofdletters', label: 'MAANDAG' }, { value: 'klein', label: 'maandag' }]} />
            </Section>
            <Section title="Extra">
                <Toggle label="Weeknummer" checked={d.showWeek} onChange={(v) => set({ showWeek: v })} />
                <Toggle label="Dag van het jaar" checked={d.showDayOfYear} onChange={(v) => set({ showDayOfYear: v })} />
                <Toggle label="Seizoen" checked={d.showSeason} onChange={(v) => set({ showSeason: v })} />
            </Section>
            <Section title="Aftellen">
                <TextField type="date" label="Datum (bv. eerste vakantiedag)" value={d.countdownDate ?? ''} onChange={(v) => set({ countdownDate: v || undefined })} />
                <TextField label="Aftellen tot" value={typeof widget.props?.countdownLabel === 'string' ? widget.props.countdownLabel : ''} placeholder="de vakantie" onChange={(v) => set({ countdownLabel: v })} />
                {d.countdownDate && <ButtonRow><Button onClick={() => set({ countdownDate: undefined })}>Aftellen weghalen</Button></ButtonRow>}
                <Hint>Toont "Nog 12 dagen tot de vakantie" tot die dag.</Hint>
            </Section>
            <Section title="Kleur">
                <Toggle label="Gekleurde achtergrond" checked={d.tint} onChange={(v) => set({ tint: v })} />
                <Hint>De kleur kies je bij Accentkleur, hieronder.</Hint>
            </Section>
        </>
    );
}
