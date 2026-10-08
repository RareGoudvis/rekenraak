import { Section, Toggle, Segmented, Hint } from './controls';
import { useSetProps } from './baseProps';
import { klokProps } from '../widgetSizing';
import type { BoardWidget } from '../boardTypes';

export default function KlokSettings({ widget }: { widget: BoardWidget }) {
    const set = useSetProps(widget);
    const k = klokProps(widget);
    return (
        <>
            <Section title="Weergave">
                <Toggle label="Analoge klok" checked={k.showAnalog} onChange={(v) => set({ showAnalog: v })} />
                <Toggle label="Digitale klok" checked={k.showDigital} onChange={(v) => set({ showDigital: v })} />
                <Toggle label="Geschreven tijd" checked={k.showText} onChange={(v) => set({ showText: v })} />
                {k.showText && (
                    <Segmented label="Stijl geschreven tijd" value={k.textStyle} onChange={(v) => set({ textStyle: v })}
                        options={[{ value: 'digitaal', label: '07:45' }, { value: 'tekst', label: 'kwart voor 8' }]} />
                )}
            </Section>
            <Section title="Wijzers">
                <Toggle label="Uurwijzer" checked={k.showHourHand} onChange={(v) => set({ showHourHand: v })} />
                <Toggle label="Minuutwijzer" checked={k.showMinuteHand} onChange={(v) => set({ showMinuteHand: v })} />
                <Hint>Sleep de wijzers op de klok: buitenkant = minuten, binnenkant = uren.</Hint>
            </Section>
        </>
    );
}
