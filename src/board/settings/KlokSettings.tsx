import { Section, Toggle, Segmented, Hint } from './controls';
import { useSetProps } from './baseProps';
import { klokModel } from './klokModel';
import type { BoardWidget } from '../boardTypes';

export default function KlokSettings({ widget }: { widget: BoardWidget }) {
    const set = useSetProps(widget);
    const k = klokModel(widget);
    const display = k.showAnalog && k.showDigital ? 'beide' : k.showDigital ? 'digitaal' : 'analoog';
    return (
        <>
            <Section title="Klok">
                <Segmented label="Soort klok" value={display}
                    onChange={(v) => set({ showAnalog: v !== 'digitaal', showDigital: v !== 'analoog' })}
                    options={[{ value: 'analoog', label: 'Analoog' }, { value: 'digitaal', label: 'Digitaal' }, { value: 'beide', label: 'Beide' }]} />
                <Segmented label="Tijd" value={k.live ? 'live' : 'vast'} onChange={(v) => set({ live: v === 'live' })}
                    options={[{ value: 'vast', label: 'Zelf instellen' }, { value: 'live', label: 'Echte tijd' }]} />
                {k.live
                    ? <Toggle label="Secondewijzer" checked={k.showSeconds} onChange={(v) => set({ showSeconds: v })} />
                    : <Hint>Sleep de wijzers op de klok: buitenkant = minuten, binnenkant = uren.</Hint>}
                <Segmented label="Digitale tijd" value={k.clock24 ? '24' : '12'} onChange={(v) => set({ clock24: v === '24' })}
                    options={[{ value: '24', label: '13:45' }, { value: '12', label: '1:45' }]} />
            </Section>
            {k.showAnalog && (
                <Section title="Wijzerplaat">
                    <Segmented label="Stijl" value={k.faceStyle} onChange={(v) => set({ faceStyle: v })}
                        options={[{ value: 'klassiek', label: 'Klassiek' }, { value: 'kleur', label: 'Kleur' }, { value: 'kinder', label: 'Kinder' }]} />
                    <Segmented label="Grootte" value={k.faceSize} onChange={(v) => set({ faceSize: v })}
                        options={[{ value: 'klein', label: 'Klein' }, { value: 'normaal', label: 'Normaal' }, { value: 'groot', label: 'Groot' }]} />
                    <Toggle label="Minuten rond de klok (5, 10, …)" checked={k.minuteNumbers} onChange={(v) => set({ minuteNumbers: v })} />
                    <Toggle label="24-uursring (13 tot 24)" checked={k.ring24} onChange={(v) => set({ ring24: v })} />
                    <Toggle label="Uurwijzer" checked={k.showHourHand} onChange={(v) => set({ showHourHand: v })} />
                    <Toggle label="Minuutwijzer" checked={k.showMinuteHand} onChange={(v) => set({ showMinuteHand: v })} />
                </Section>
            )}
            <Section title="Geschreven tijd">
                <Toggle label="Geschreven tijd tonen" checked={k.showText} onChange={(v) => set({ showText: v })} />
                {k.showText && (
                    <Segmented label="Schrijfwijze" value={k.textStyle} onChange={(v) => set({ textStyle: v })}
                        options={[{ value: 'digitaal', label: '07:45' }, { value: 'tekst', label: 'kwart voor 8' }]} />
                )}
            </Section>
        </>
    );
}
