import { Section, Toggle } from './controls';
import { useSetProps } from './baseProps';
import { werksymbolenProps, WERKSYMBOLEN } from '../widgetSizing';
import type { BoardWidget } from '../boardTypes';

export default function WerksymbolenSettings({ widget }: { widget: BoardWidget }) {
    const set = useSetProps(widget);
    const p = werksymbolenProps(widget);
    const toggleMode = (key: string) => {
        const next = p.enabled.includes(key) ? p.enabled.filter(k => k !== key) : [...p.enabled, key];
        if (next.length) set({ enabled: next });
    };
    return (
        <>
            <Section title="Layout">
                <Toggle label="Verticaal" checked={p.vertical} onChange={(v) => set({ vertical: v })} />
                <Toggle label="Enkel icoon" checked={p.iconOnly} onChange={(v) => set({ iconOnly: v })} />
            </Section>
            <Section title="Zichtbare symbolen">
                {WERKSYMBOLEN.map(m => <Toggle key={m.key} label={m.label} checked={p.enabled.includes(m.key)} onChange={() => toggleMode(m.key)} />)}
            </Section>
        </>
    );
}
