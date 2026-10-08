import { Section, Toggle } from './controls';
import { useSetProps } from './baseProps';
import { datumProps, DATUM_COLORS } from '../widgetSizing';
import type { BoardWidget } from '../boardTypes';

export default function DatumSettings({ widget }: { widget: BoardWidget }) {
    const set = useSetProps(widget);
    const d = datumProps(widget);
    return (
        <>
            <Section title="Weergave">
                <Toggle label="Weekdag" checked={d.showWeekday} onChange={(v) => set({ showWeekday: v })} />
                <Toggle label="Datum" checked={d.showDate} onChange={(v) => set({ showDate: v })} />
                <Toggle label="Tijd (live)" checked={d.showTime} onChange={(v) => set({ showTime: v })} />
                {d.showTime && <Toggle label="Seconden" checked={d.showSeconds} onChange={(v) => set({ showSeconds: v })} />}
            </Section>
            <Section title="Kleur">
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {Object.entries(DATUM_COLORS).map(([key, c]) => (
                        <button key={key} type="button" aria-label={`Kleur ${key}`} title={key} aria-pressed={d.color === key}
                            onClick={() => set({ color: key })}
                            style={{
                                width: '34px', height: '34px', borderRadius: '50%', cursor: 'pointer',
                                background: c.text, border: '2px solid var(--bg-surface)',
                                boxShadow: d.color === key ? '0 0 0 2px var(--accent)' : 'none',
                            }} />
                    ))}
                </div>
            </Section>
        </>
    );
}
